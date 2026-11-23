import React, { useMemo, useState } from 'react';
import { CheckCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { PromoLine, PromoList } from '../../types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { formatDate, formatZar } from '../../utils/formatters.js';
import { compareLinePromoTypes, linePromoType, linePromoTypeStyle } from '../../utils/linePromoTypes.js';

interface QueueLine {
  promo: PromoList;
  line: PromoLine;
}

interface TypeSection {
  type: string;
  rows: QueueLine[];
  promoCount: number;
  revenue: number;
  margin: number;
}

interface PromoTypeQueueProps {
  promos: PromoList[];
  /** Show only this promotion type ('' = all types). */
  typeFilter?: string;
  onOpenPromo: (promoId: string) => void;
  /** When set, clicking a type heading opens the approval page for that type. */
  onReviewType?: (type: string) => void;
}

const num = (v: unknown) => Number(v) || 0;
const pct = (v: number | null | undefined) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);

/**
 * Head Review queue grouped by the promotion type Staff picked for each line:
 * one section per type, listing every line under that type with the promo it came from.
 */
export const PromoTypeQueue: React.FC<PromoTypeQueueProps> = ({ promos, typeFilter, onOpenPromo, onReviewType }) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (type: string) => setCollapsed((c) => ({ ...c, [type]: !c[type] }));

  const sections = useMemo<TypeSection[]>(() => {
    const byType = new Map<string, QueueLine[]>();
    for (const promo of promos) {
      for (const line of promo.promoLines || []) {
        const type = linePromoType(line);
        if (typeFilter && type !== typeFilter) continue;
        const bucket = byType.get(type);
        if (bucket) bucket.push({ promo, line });
        else byType.set(type, [{ promo, line }]);
      }
    }
    return [...byType.entries()]
      .sort(([a], [b]) => compareLinePromoTypes(a, b))
      .map(([type, rows]) => {
        rows.sort(
          (a, b) =>
            a.promo.promoCode.localeCompare(b.promo.promoCode) ||
            (a.line.product?.sku || '').localeCompare(b.line.product?.sku || '')
        );
        return {
          type,
          rows,
          promoCount: new Set(rows.map((r) => r.promo.id)).size,
          revenue: rows.reduce((s, r) => s + num(r.line.forecastRevenue), 0),
          margin: rows.reduce((s, r) => s + num(r.line.forecastMargin), 0),
        };
      });
  }, [promos, typeFilter]);

  if (sections.length === 0) {
    return (
      <div className="p-10 text-center text-xs text-slate-500">
        {typeFilter
          ? `No lines under "${typeFilter}" in these promo lists.`
          : 'These promo lists have no product lines yet.'}
      </div>
    );
  }

  const totalLines = sections.reduce((s, sec) => s + sec.rows.length, 0);
  // Status only adds information when not everything is simply "Submitted to Head"
  const showStatus = promos.some(
    (p) => p.status !== 'SUBMITTED_TO_HEAD' || (p.promoLines || []).some((l) => l.headDecision)
  );

  return (
    <div className="divide-y divide-slate-200">
      {/* Summary: one chip per promotion type */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 text-xs bg-slate-50/60">
        <span className="font-semibold text-slate-700 mr-1">
          {totalLines} line{totalLines === 1 ? '' : 's'} in {sections.length} promotion type
          {sections.length === 1 ? '' : 's'}:
        </span>
        {sections.map((s) => (
          <a
            key={s.type}
            href={`#promo-type-${encodeURIComponent(s.type)}`}
            className={`px-2 py-0.5 rounded-md border font-semibold ${linePromoTypeStyle(s.type)} hover:brightness-95`}
          >
            {s.type} <span className="font-mono">{s.rows.length}</span>
          </a>
        ))}
      </div>

      {sections.map((s) => {
        const isCollapsed = !!collapsed[s.type];
        const marginPct = s.revenue ? (s.margin / s.revenue) * 100 : null;
        return (
          <section key={s.type} id={`promo-type-${encodeURIComponent(s.type)}`}>
            {/* Promotion type heading: arrow collapses, the rest opens this type's review */}
            <div
              role={onReviewType ? 'button' : undefined}
              tabIndex={onReviewType ? 0 : undefined}
              onClick={() => (onReviewType ? onReviewType(s.type) : toggle(s.type))}
              onKeyDown={(e) => {
                if (onReviewType && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onReviewType(s.type);
                }
              }}
              title={onReviewType ? `Review and approve the ${s.type} lines` : undefined}
              className={`w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 bg-white text-left text-xs cursor-pointer ${
                onReviewType ? 'hover:bg-emerald-50/50' : 'hover:bg-slate-50'
              }`}
            >
              <button
                type="button"
                aria-label={isCollapsed ? `Show ${s.type} lines` : `Hide ${s.type} lines`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(s.type);
                }}
                className="p-0.5 -m-0.5 rounded hover:bg-slate-200"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              <span className={`px-2.5 py-1 rounded-md border text-sm font-bold ${linePromoTypeStyle(s.type)}`}>
                {s.type}
              </span>
              <span className="text-slate-600">
                <strong className="text-slate-900">{s.rows.length}</strong> line{s.rows.length === 1 ? '' : 's'} from{' '}
                <strong className="text-slate-900">{s.promoCount}</strong> promo list{s.promoCount === 1 ? '' : 's'}
              </span>
              <span className="text-slate-500">
                Forecast sales <strong className="font-mono text-slate-800">{formatZar(s.revenue)}</strong>
              </span>
              <span className="text-slate-500">
                Margin{' '}
                <strong
                  className={`font-mono ${marginPct !== null && marginPct < 10 ? 'text-rose-600' : 'text-emerald-700'}`}
                >
                  {pct(marginPct)}
                </strong>
              </span>
              {onReviewType && (
                <span className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-spar-green text-white font-semibold shadow-sm">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Review &amp; approve {s.type}
                </span>
              )}
            </div>

            {/* Lines under this promotion type */}
            {!isCollapsed && (
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full min-w-[1040px] table-fixed text-left text-xs">
                  {/* Same column widths in every section so the type groups line up */}
                  <colgroup>
                    <col className="w-[13%]" />
                    <col className="w-[24%]" />
                    <col className="w-[12%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[6%]" />
                    <col className="w-[7%]" />
                    <col className="w-[6%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    {showStatus && <col className="w-[10rem]" />}
                  </colgroup>
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2 px-4">Promo List</th>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Normal</th>
                      <th className="py-2 px-3 text-right">Promo</th>
                      <th className="py-2 px-3 text-right">Disc %</th>
                      <th className="py-2 px-3 text-right">Margin %</th>
                      <th className="py-2 px-3 text-right">Est. Vol</th>
                      <th className="py-2 px-3 text-right">Forecast</th>
                      <th className="py-2 px-3">Submitted By</th>
                      {showStatus && <th className="py-2 px-3">Status</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.rows.map(({ promo, line }) => (
                      <tr
                        key={line.id}
                        onClick={() => onOpenPromo(promo.id)}
                        className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-4">
                          <span className="font-mono font-semibold text-slate-800 whitespace-nowrap block">
                            {promo.promoCode}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block" title={promo.title}>
                            {promo.title}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-[11px] text-slate-500 block">
                            {line.product?.sku || line.productId}
                          </span>
                          <span className="font-semibold text-slate-800 truncate block" title={line.product?.name}>
                            {line.product?.name || '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 truncate" title={line.product?.category}>
                          {line.product?.category || '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">
                          {formatZar(num(line.product?.retailPrice))}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatZar(num(line.promoPrice))}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">{pct(line.discountPercent)}</td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${
                            num(line.marginPercent) < 10 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {pct(line.marginPercent)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {line.estimatedVolume != null ? num(line.estimatedVolume).toLocaleString() : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-amber-700 whitespace-nowrap">
                          {formatZar(num(line.forecastRevenue))}
                        </td>
                        <td className="py-2 px-3 text-slate-600 truncate">
                          {promo.creator ? `${promo.creator.firstName} ${promo.creator.lastName}` : 'Staff'}
                          <span className="block text-[10px] text-slate-400">
                            {formatDate(promo.submittedAt || promo.createdAt)}
                          </span>
                        </td>
                        {showStatus && (
                          <td className="py-2 px-3">
                            {line.headDecision ? (
                              <span
                                className={`text-[10px] font-bold uppercase ${
                                  line.headDecision === 'APPROVED' ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {line.headDecision === 'APPROVED' ? 'Line approved' : 'Line returned'}
                              </span>
                            ) : (
                              <StatusBadge status={promo.status} />
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
