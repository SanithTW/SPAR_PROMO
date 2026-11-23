import { PromoLine } from '../types/index.js';

/** Promotion types Staff pick per line on Promo Entry, in the same order as that dropdown. */
export const LINE_PROMO_TYPES = [
  'Special Promo',
  'Monthly (1st cycle)',
  'Monthly (2nd cycle)',
  'Rewards',
  'WEHD',
  'Stock Clearance',
  'Celeste',
] as const;

export const NO_LINE_PROMO_TYPE = 'No promotion type';

const TYPE_STYLES = [
  'bg-emerald-50 text-emerald-800 border-emerald-200',
  'bg-sky-50 text-sky-800 border-sky-200',
  'bg-indigo-50 text-indigo-800 border-indigo-200',
  'bg-amber-50 text-amber-800 border-amber-200',
  'bg-rose-50 text-rose-800 border-rose-200',
  'bg-orange-50 text-orange-800 border-orange-200',
  'bg-violet-50 text-violet-800 border-violet-200',
];
const OTHER_STYLE = 'bg-slate-100 text-slate-700 border-slate-200';

/** The promotion type Staff chose for a line (saved in `mechanic`). */
export function linePromoType(line: Pick<PromoLine, 'mechanic' | 'promo'>): string {
  return (line.mechanic || line.promo || '').trim() || NO_LINE_PROMO_TYPE;
}

/** Tailwind classes for a promotion-type badge. */
export function linePromoTypeStyle(type: string): string {
  const i = (LINE_PROMO_TYPES as readonly string[]).indexOf(type);
  return i >= 0 ? TYPE_STYLES[i] : OTHER_STYLE;
}

/** Dropdown order first, then any other types A–Z, "No promotion type" last. */
export function compareLinePromoTypes(a: string, b: string): number {
  const rank = (t: string) => {
    if (t === NO_LINE_PROMO_TYPE) return 1000;
    const i = (LINE_PROMO_TYPES as readonly string[]).indexOf(t);
    return i >= 0 ? i : 500;
  };
  return rank(a) - rank(b) || a.localeCompare(b);
}
