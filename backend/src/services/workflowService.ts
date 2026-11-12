import { dbStore } from '../data/dbStore.js';
import { UserTokenPayload, RoleType, PromoStatus, PromoListData } from '../types/index.js';

export class WorkflowService {
  /**
   * Retrieves promotional lists requiring Head Review, strictly scoped to the Head's department.
   */
  public async getHeadReviewList(
    user: UserTokenPayload,
    filters?: {
      status?: PromoStatus;
      search?: string;
    }
  ): Promise<PromoListData[]> {
    if (user.role !== RoleType.HEAD && user.role !== RoleType.ADMIN) {
      throw new Error(`Unauthorized: Role '${user.role}' cannot access Head Review workspace.`);
    }

    const targetStatus = filters?.status || PromoStatus.SUBMITTED_TO_HEAD;

    // Scoped strictly to the Head's assigned department
    let promos = await dbStore.findPromoLists({
      status: targetStatus,
      departmentId: user.role === RoleType.HEAD ? user.departmentId || undefined : undefined,
      userRole: user.role,
      userId: user.id,
    });

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      promos = promos.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.promoCode.toLowerCase().includes(q) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      );
    }

    // Attach full details for review
    const fullPromos = await Promise.all(
      promos.map(async (p) => {
        const full = await dbStore.findPromoById(p.id);
        const dept = await dbStore.findDepartmentById(p.departmentId);
        const creator = await dbStore.findUserById(p.createdById);
        return {
          ...(full || p),
          department: dept || undefined,
          creator: creator
            ? {
                id: creator.id,
                firstName: creator.firstName,
                lastName: creator.lastName,
                name: creator.name,
                email: creator.email,
              }
            : undefined,
        };
      })
    );

    return fullPromos as unknown as PromoListData[];
  }

  /**
   * Retrieves full details of a specific promotional list for Head review.
   * Enforces strict department isolation: Head cannot view other departments' lists.
   */
  public async getHeadReviewDetail(
    user: UserTokenPayload,
    promoId: string
  ): Promise<PromoListData> {
    if (user.role !== RoleType.HEAD && user.role !== RoleType.ADMIN) {
      throw new Error(`Unauthorized: Role '${user.role}' cannot access Head Review workspace.`);
    }

    const promo = await dbStore.findPromoById(promoId);
    if (!promo) {
      throw new Error('Promo list not found.');
    }

    // Strict department boundary check
    if (user.role === RoleType.HEAD && promo.departmentId !== user.departmentId) {
      throw new Error('Unauthorized: Department Head cannot view promotional lists belonging to another department.');
    }

    const dept = await dbStore.findDepartmentById(promo.departmentId);
    const creator = await dbStore.findUserById(promo.createdById);

    return {
      ...promo,
      department: dept || undefined,
      creator: creator
        ? {
            id: creator.id,
            firstName: creator.firstName,
            lastName: creator.lastName,
            name: creator.name,
            email: creator.email,
          }
        : undefined,
    } as unknown as PromoListData;
  }

  /**
   * Final Head Approval transition.
   * Head is the FINAL APPROVER. NO DIRECTOR STAGE.
   */
  public async approveByHead(
    user: UserTokenPayload,
    promoId: string,
    comments?: string
  ): Promise<PromoListData> {
    return dbStore.approvePromoList(
      promoId,
      {
        id: user.id,
        role: user.role,
        departmentId: user.departmentId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      comments
    );
  }

  /**
   * Head Rejection transition.
   * Requires non-empty feedback/comment.
   */
  public async rejectByHead(
    user: UserTokenPayload,
    promoId: string,
    comments: string,
    lineComments?: Record<string, string>
  ): Promise<PromoListData> {
    return dbStore.rejectPromoList(
      promoId,
      {
        id: user.id,
        role: user.role,
        departmentId: user.departmentId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      comments,
      lineComments
    );
  }

  /**
   * Head approves only the selected lines; unselected lines are returned to staff
   * as a new REJECTED_BY_HEAD list carrying the per-line comments.
   */
  public async reviewLinesByHead(
    user: UserTokenPayload,
    promoId: string,
    input: { approvedLineIds: string[]; lineComments?: Record<string, string>; comments?: string }
  ): Promise<{ approved: PromoListData; returned: PromoListData | null }> {
    return dbStore.reviewPromoListLines(
      promoId,
      {
        id: user.id,
        role: user.role,
        departmentId: user.departmentId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      input
    );
  }

  /**
   * Staff submission transition.
   */
  public async submitToHead(
    user: UserTokenPayload,
    promoId: string
  ): Promise<PromoListData> {
    return dbStore.submitPromoList(promoId, {
      id: user.id,
      role: user.role,
      departmentId: user.departmentId,
    });
  }
}

export const workflowService = new WorkflowService();
