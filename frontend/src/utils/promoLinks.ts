import { PromoStatus, PromoType, RoleType } from '../types/index.js';

/**
 * Where a promo list should open for the current user, based on its status and the user's role.
 * Returns null when the user has no page that can show that list.
 */
export function openPathFor(p: { id: string; status: PromoStatus }, role?: RoleType): string | null {
  if (!role) return null;
  if (p.status === 'APPROVED' && role !== 'MASTER_DATA') return `/approved-promos/${p.id}`;
  if (p.status === 'SUBMITTED_TO_HEAD' && (role === 'HEAD' || role === 'ADMIN')) return `/head-review/${p.id}`;
  if (['DRAFT', 'REJECTED_BY_HEAD', 'REOPENED'].includes(p.status) && (role === 'STAFF' || role === 'ADMIN'))
    return `/promo-entry/${p.id}`;
  return null;
}

/** The verb shown on an "open" button: Edit for lists the user can change, Review for the Head queue, View otherwise. */
export function openActionLabel(p: { status: PromoStatus }, role?: RoleType): string {
  if (p.status === 'SUBMITTED_TO_HEAD' && (role === 'HEAD' || role === 'ADMIN')) return 'Review';
  if (['DRAFT', 'REJECTED_BY_HEAD', 'REOPENED'].includes(p.status) && (role === 'STAFF' || role === 'ADMIN'))
    return p.status === 'DRAFT' ? 'Continue' : 'Fix';
  return 'View';
}

const PROMO_TYPE_LABELS: Record<PromoType, string> = {
  WEEKLY_LEAFLET: 'Weekly Leaflet',
  MONTHLY_CATALOGUE: 'Monthly Catalogue',
  SEASONAL_CAMPAIGN: 'Seasonal Campaign',
  INSTORE_SPECIAL: 'In-store Special',
  CLEARANCE: 'Clearance',
};

export function promoTypeLabel(type: PromoType | string | undefined | null): string {
  if (!type) return '—';
  return (
    PROMO_TYPE_LABELS[type as PromoType] ??
    type
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}
