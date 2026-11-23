import { dbStore } from '../data/dbStore.js';
import { PromoListData, PromoStatus, RoleType, UserTokenPayload } from '../types/index.js';

export const NO_LINE_PROMO_TYPE = 'No promotion type';

/** The promotion type Staff picked for a line (saved in `mechanic`). */
export function linePromoType(line: { mechanic?: string | null }): string {
  return (line.mechanic || '').trim() || NO_LINE_PROMO_TYPE;
}

export interface TypeReviewDecision {
  promoId: string;
  /** Lines of this type the Head approves. The other lines of this type are returned to Staff. */
  approvedLineIds: string[];
  /** { lineId: comment }; required for every line of this type that is not approved. */
  lineComments?: Record<string, string>;
}

export interface TypeReviewResult {
  promoId: string;
  sourcePromoCode: string;
  /** Promo list now holding this type's lines (the original list, or a new "-P<n>" list split off it). */
  reviewedPromoCode: string;
  approvedCount: number;
  returnedCount: number;
  /** Lines of other promotion types still waiting for review on the original list. */
  stillWaitingCount: number;
  approvedPromo: PromoListData | null;
  returnedPromo: PromoListData | null;
}

type Reviewer = Pick<UserTokenPayload, 'id' | 'role' | 'departmentId' | 'firstName' | 'lastName'>;

/**
 * Head reviews one promotion type at a time.
 *
 * For each promo list in `decisions`:
 *  - If the list only has lines of this type, it is reviewed as normal (approve ticked lines,
 *    return the rest with comments).
 *  - If it also has lines of other types, this type's lines are first moved to a new list
 *    "<code>-P<n>" (title "<title> — <type>", still SUBMITTED_TO_HEAD), which is then reviewed.
 *    The original list keeps its other lines and stays waiting for the Head.
 *
 * Everything is validated before anything changes, so a bad decision leaves all lists untouched.
 */
export async function reviewLinesOfType(
  user: Reviewer,
  type: string,
  decisions: TypeReviewDecision[],
  comments?: string
): Promise<TypeReviewResult[]> {
  await dbStore.initStore();

  if (user.role !== RoleType.HEAD && user.role !== RoleType.ADMIN) {
    throw new Error(`Unauthorized: Role '${user.role}' cannot perform Head approval.`);
  }
  if (!type.trim()) throw new Error('Promotion type is required.');
  if (decisions.length === 0) throw new Error('No promo lists were sent for review.');

  // 1. Validate every decision first
  const plans = decisions.map((d) => {
    const promo = dbStore.promoLists.find((p) => p.id === d.promoId);
    if (!promo) throw new Error(`Promo list ${d.promoId} not found.`);
    if (user.role === RoleType.HEAD && promo.departmentId !== user.departmentId) {
      throw new Error(`Unauthorized: ${promo.promoCode} is not in your assigned department.`);
    }
    if (promo.status !== PromoStatus.SUBMITTED_TO_HEAD) {
      throw new Error(`${promo.promoCode} is '${promo.status}', not waiting for Head review. Refresh and try again.`);
    }

    const lines = dbStore.promoLines.filter((l) => l.promoListId === promo.id);
    const typeLines = lines.filter((l) => linePromoType(l) === type);
    const otherLines = lines.filter((l) => linePromoType(l) !== type);
    if (typeLines.length === 0) throw new Error(`${promo.promoCode} has no "${type}" lines.`);

    const typeIds = new Set(typeLines.map((l) => l.id));
    const approved = new Set(d.approvedLineIds);
    for (const id of approved) {
      if (!typeIds.has(id)) throw new Error(`Line ${id} is not a "${type}" line of ${promo.promoCode}.`);
    }

    const lineComments = d.lineComments || {};
    const returned = typeLines.filter((l) => !approved.has(l.id));
    const missing = returned.filter((l) => !lineComments[l.id]?.trim());
    if (missing.length > 0) {
      const skus = missing.map((l) => dbStore.products.find((p) => p.id === l.productId)?.sku || l.productId);
      throw new Error(`Add a comment for each "${type}" line you are not approving in ${promo.promoCode}: ${skus.join(', ')}`);
    }

    return { promo, typeLines, otherLines, approved, returned, lineComments };
  });

  // 2. Apply
  const results: TypeReviewResult[] = [];
  for (const plan of plans) {
    const { promo, typeLines, otherLines, approved, returned, lineComments } = plan;
    let target = promo;

    if (otherLines.length > 0) {
      const parts = dbStore.promoLists.filter((p) => p.promoCode.startsWith(`${promo.promoCode}-P`)).length;
      const now = new Date();
      target = {
        ...promo,
        id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        promoCode: `${promo.promoCode}-P${parts + 1}`,
        title: `${promo.title} — ${type}`,
        version: 1,
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      };
      dbStore.promoLists.unshift(target);
      for (const line of typeLines) {
        line.promoListId = target.id;
        line.updatedAt = now;
      }
      promo.updatedAt = now;

      await dbStore.logAudit({
        entityType: 'PromoList',
        entityId: target.id,
        action: 'HEAD_SPLIT_BY_TYPE',
        performedById: user.id,
        details: `Head ${user.firstName} ${user.lastName} reviewed the ${typeLines.length} "${type}" line(s) of ${promo.promoCode} separately as ${target.promoCode}. ${otherLines.length} other line(s) stay waiting on ${promo.promoCode}.`,
      });
    }

    let approvedPromo: PromoListData | null = null;
    let returnedPromo: PromoListData | null = null;
    const typeNote = `"${type}" lines reviewed by promotion type.${comments?.trim() ? ` ${comments.trim()}` : ''}`;

    if (approved.size > 0) {
      const res = await dbStore.reviewPromoListLines(target.id, user, {
        approvedLineIds: [...approved],
        lineComments,
        comments: typeNote,
      });
      approvedPromo = res.approved;
      returnedPromo = res.returned;
    } else {
      // Nothing approved: the whole type goes back to Staff
      returnedPromo = await dbStore.rejectPromoList(target.id, user, typeNote, lineComments);
    }

    results.push({
      promoId: promo.id,
      sourcePromoCode: promo.promoCode,
      reviewedPromoCode: target.promoCode,
      approvedCount: approved.size,
      returnedCount: returned.length,
      stillWaitingCount: otherLines.length,
      approvedPromo,
      returnedPromo,
    });
  }

  return results;
}
