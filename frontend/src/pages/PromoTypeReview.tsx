import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ShieldAlert, Undo2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Button } from '../components/common/Button.js';
import { Modal } from '../components/common/Modal.js';
import { PromoLine, PromoList } from '../types/index.js';
import { fetchHeadReviewList, headReviewByType, TypeReviewResult } from '../services/promoService.js';
import { formatDate, formatZar } from '../utils/formatters.js';
import { linePromoType, linePromoTypeStyle } from '../utils/linePromoTypes.js';

interface PromoGroup {
  promo: PromoList;
  lines: PromoLine[];
  /** Lines of other promotion types on the same list; they stay waiting. */
  otherCount: number;
}

const num = (v: unknown) => Number(v) || 0;
const pct = (v: number | null | undefined) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);

/**
 * Head approves one promotion type at a time (e.g. all "Special Promo" lines),
 * across every promo list waiting for review.
 */
export const PromoTypeReview: React.FC = () => {
  const { type = '' } = useParams<{ type: string }>();
  const navigate = useNavigate();

  const [promos, setPromos] = useState<PromoList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, string>>({});
  const [overallComment, setOverallComment] = useState('');

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [results, setResults] = useState<TypeReviewResult[] | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await fetchHeadReviewList({ status: 'SUBMITTED_TO_HEAD' });
      setPromos(list);
      // Default: every line of this type ticked for approval
      const ids = list.flatMap((p) => (p.promoLines || []).filter((l) => linePromoType(l) === type).map((l) => l.id));
      setTicked(new Set(ids));
      setComments({});
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load the review queue.');
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo<PromoGroup[]>(
    () =>
      promos
        .map((promo) => {
          const all = promo.promoLines || [];
          const lines = all.filter((l) => linePromoType(l) === type);
          return { promo, lines, otherCount: all.length - lines.length };
        })
        .filter((g) => g.lines.length > 0)
        .sort((a, b) => a.promo.promoCode.localeCompare(b.promo.promoCode)),
    [promos, type]
  );

  const allLines = groups.flatMap((g) => g.lines);
  const tickedLines = allLines.filter((l) => ticked.has(l.id));
  const returnLines = allLines.filter((l) => !ticked.has(l.id));
  const missingComment = returnLines.filter((l) => !comments[l.id]?.trim());
  const tickedRevenue = tickedLines.reduce((s, l) => s + num(l.forecastRevenue), 0);
  const tickedMargin = tickedLines.reduce((s, l) => s + num(l.forecastMargin), 0);
  const otherWaiting = groups.reduce((s, g) => s + g.otherCount, 0);

  const setTick = (ids: string[], value: boolean) =>
    setTicked((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (value ? next.add(id) : next.delete(id)));
      return next;
    });

  const submit = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const decisions = groups.map((g) => ({
        promoId: g.promo.id,
        approvedLineIds: g.lines.filter((l) => ticked.has(l.id)).map((l) => l.id),
        lineComments: Object.fromEntries(
          g.lines.map((l) => [l.id, comments[l.id]?.trim() || ''] as const).filter(([, c]) => c)
        ),
      }));
      const res = await headReviewByType(type, decisions, overallComment.trim() || undefined);
      setResults(res);
      setIsConfirmOpen(false);
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const typeBadge = (
    <span className={`px-2 py-0.5 rounded-md border font-bold ${linePromoTypeStyle(type)}`}>{type}</span>
  );

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={`${type} — Head Review`}
        description="Approve the lines Staff put under this promotion type. Lines of other types stay in your queue."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Head Review', href: '/head-review' }, { label: type }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/head-review')}
          >
            Back to Queue
          </Button>
        }
      />

      {results && (
        <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-300 text-emerald-900 text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-spar-green" />
              {type}: approved {results.reduce((s, r) => s + r.approvedCount, 0)} line(s)
              {results.some((r) => r.returnedCount) &&
                `, returned ${results.reduce((s, r) => s + r.returnedCount, 0)} to Staff`}
            </div>
            <button onClick={() => setResults(null)} className="font-bold hover:underline">
              Dismiss
            </button>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {results.map((r) => (
              <li key={r.reviewedPromoCode}>
                <strong className="font-mono">{r.sourcePromoCode}</strong>
                {r.approvedCount > 0 && (
                  <>
                    {' '}
                    — {r.approvedCount} approved as <strong className="font-mono">{r.approvedPromo?.promoCode}</strong>{' '}
                    (now with Marketing)
                  </>
                )}
                {r.returnedCount > 0 && (
                  <>
                    {' '}
                    — {r.returnedCount} returned to Staff as{' '}
                    <strong className="font-mono">{r.returnedPromo?.promoCode}</strong>
                  </>
                )}
                {r.stillWaitingCount > 0 && (
                  <span className="text-emerald-800">
                    {' '}
                    — {r.stillWaitingCount} line(s) of other types still waiting on {r.sourcePromoCode}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-4 rounded-xl bg-[#007d32] text-white flex items-start gap-3.5 border border-[#00682a] shadow-md">
        <div className="p-2 rounded-lg bg-white/20 mt-0.5 flex-shrink-0">
          <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
        </div>
        <p className="text-xs text-white/90 leading-relaxed">
          Ticked lines are <strong>approved</strong> and go to Marketing. Unticked lines are{' '}
          <strong>returned to Staff</strong> and each needs a comment.
          {otherWaiting > 0 && (
            <>
              {' '}
              The {otherWaiting} line(s) of other promotion types in these lists are not touched and stay waiting for
              your review.
            </>
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <div className="w-8 h-8 border-2 border-spar-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading {type} lines...
        </div>
      ) : loadError ? (
        <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">{loadError}</p>
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-xl text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-spar-green mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No {type} lines are waiting for your review.</h3>
          <Button variant="outline" size="sm" onClick={() => navigate('/head-review')}>
            Back to Head Review Queue
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              {typeBadge}
              <button
                type="button"
                onClick={() =>
                  setTick(
                    allLines.map((l) => l.id),
                    true
                  )
                }
                className="px-2.5 py-1 rounded-md border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100"
              >
                Tick all
              </button>
              <button
                type="button"
                onClick={() =>
                  setTick(
                    allLines.map((l) => l.id),
                    false
                  )
                }
                className="px-2.5 py-1 rounded-md border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100"
              >
                Untick all
              </button>
              <span className="text-slate-600">
                <strong className="text-slate-900">{tickedLines.length}</strong> of {allLines.length} lines ticked
              </span>
            </div>
            {returnLines.length > 0 && (
              <span className={missingComment.length ? 'text-rose-700 font-semibold' : 'text-amber-700'}>
                {returnLines.length} line(s) will be returned to Staff
                {missingComment.length ? ` • ${missingComment.length} still need a comment` : ''}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] table-fixed text-left text-xs">
              <colgroup>
                <col className="w-10" />
                <col className="w-[24%]" />
                <col className="w-[12%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[6%]" />
                <col className="w-[7%]" />
                <col className="w-[6%]" />
                <col className="w-[9%]" />
                <col />
              </colgroup>
              <thead className="bg-white text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2 pl-4" />
                  <th className="py-2 px-3">Product</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Normal</th>
                  <th className="py-2 px-3 text-right">Promo</th>
                  <th className="py-2 px-3 text-right">Disc %</th>
                  <th className="py-2 px-3 text-right">Margin %</th>
                  <th className="py-2 px-3 text-right">Est. Vol</th>
                  <th className="py-2 px-3 text-right">Forecast</th>
                  <th className="py-2 px-3">Head Comment</th>
                </tr>
              </thead>
              {groups.map((g) => {
                const groupIds = g.lines.map((l) => l.id);
                const groupTicked = groupIds.filter((id) => ticked.has(id)).length;
                return (
                  <tbody key={g.promo.id} className="divide-y divide-slate-100 border-b border-slate-200">
                    {/* Promo list sub-heading */}
                    <tr className="bg-slate-50/70">
                      <td className="py-2 pl-4">
                        <input
                          type="checkbox"
                          aria-label={`Tick all ${type} lines in ${g.promo.promoCode}`}
                          className="w-4 h-4 accent-[#007d32]"
                          checked={groupTicked === groupIds.length}
                          ref={(el) => {
                            if (el) el.indeterminate = groupTicked > 0 && groupTicked < groupIds.length;
                          }}
                          onChange={(e) => setTick(groupIds, e.target.checked)}
                        />
                      </td>
                      <td colSpan={9} className="py-2 px-3">
                        <span className="font-mono font-bold text-slate-800">{g.promo.promoCode}</span>
                        <span className="text-slate-600"> · {g.promo.title}</span>
                        <span className="text-slate-400">
                          {' '}
                          · {g.promo.creator
                            ? `${g.promo.creator.firstName} ${g.promo.creator.lastName}`
                            : 'Staff'}, {formatDate(g.promo.submittedAt || g.promo.createdAt)}
                        </span>
                        {g.otherCount > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-semibold">
                            +{g.otherCount} line(s) of other types stay waiting
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/head-review/${g.promo.id}`)}
                          className="ml-2 text-[11px] font-semibold text-spar-green hover:underline"
                        >
                          Open full list
                        </button>
                      </td>
                    </tr>
                    {g.lines.map((l) => {
                      const isTicked = ticked.has(l.id);
                      const needsComment = !isTicked && !comments[l.id]?.trim();
                      return (
                        <tr key={l.id} className={isTicked ? 'bg-emerald-50/30' : 'bg-rose-50/40'}>
                          <td className="py-2 pl-4">
                            <input
                              type="checkbox"
                              aria-label={`Approve ${l.product?.sku || l.productId}`}
                              className="w-4 h-4 accent-[#007d32]"
                              checked={isTicked}
                              onChange={(e) => setTick([l.id], e.target.checked)}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-[11px] text-slate-500 block">
                              {l.product?.sku || l.productId}
                            </span>
                            <span className="font-semibold text-slate-800 truncate block" title={l.product?.name}>
                              {l.product?.name || '—'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500 truncate" title={l.product?.category}>
                            {l.product?.category || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {formatZar(num(l.product?.retailPrice))}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatZar(num(l.promoPrice))}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">{pct(l.discountPercent)}</td>
                          <td
                            className={`py-2 px-3 text-right font-mono font-bold ${
                              num(l.marginPercent) < 10 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {pct(l.marginPercent)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {l.estimatedVolume != null ? num(l.estimatedVolume).toLocaleString() : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-amber-700">
                            {formatZar(num(l.forecastRevenue))}
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              maxLength={500}
                              value={comments[l.id] || ''}
                              onChange={(e) => setComments((c) => ({ ...c, [l.id]: e.target.value }))}
                              placeholder={isTicked ? 'Optional comment' : 'Why is this line returned? (required)'}
                              className={`w-full px-2 py-1 rounded-md border text-xs focus:outline-none focus:ring-1 ${
                                needsComment
                                  ? 'border-rose-400 bg-white placeholder:text-rose-400 focus:ring-rose-500'
                                  : 'border-slate-200 bg-white focus:ring-spar-green'
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>
      )}

      {/* Sticky action bar */}
      {!isLoading && groups.length > 0 && (
        <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
            {typeBadge}
            <span>
              Approving <strong className="text-slate-900">{tickedLines.length}</strong> line(s)
            </span>
            <span>
              Forecast sales <strong className="font-mono text-slate-900">{formatZar(tickedRevenue)}</strong>
            </span>
            <span>
              Margin{' '}
              <strong className="font-mono text-slate-900">
                {tickedRevenue ? pct((tickedMargin / tickedRevenue) * 100) : '—'}
              </strong>
            </span>
          </div>
          <Button
            variant="primary"
            size="md"
            disabled={missingComment.length > 0}
            title={missingComment.length > 0 ? 'Add a comment to every unticked line first' : undefined}
            leftIcon={tickedLines.length > 0 ? <Check className="w-4 h-4" /> : <Undo2 className="w-4 h-4" />}
            onClick={() => {
              setSaveError(null);
              setIsConfirmOpen(true);
            }}
          >
            {tickedLines.length > 0
              ? `Approve ${tickedLines.length} ${type} line${tickedLines.length === 1 ? '' : 's'}`
              : `Return ${returnLines.length} line${returnLines.length === 1 ? '' : 's'} to Staff`}
          </Button>
        </div>
      )}

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isSaving && setIsConfirmOpen(false)}
        title={`Approve ${type} lines?`}
        subtitle="Department Head final sign-off"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsConfirmOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submit}
              isLoading={isSaving}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600">
          <ul className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <li>
              <strong className="text-emerald-700">{tickedLines.length}</strong> line(s) approved → available to
              Marketing
            </li>
            <li>
              <strong className="text-rose-600">{returnLines.length}</strong> line(s) returned to Staff with your
              comments
            </li>
            {otherWaiting > 0 && (
              <li>
                <strong className="text-slate-900">{otherWaiting}</strong> line(s) of other promotion types stay waiting
                in your queue
              </li>
            )}
          </ul>
          <label className="block">
            <span className="font-semibold text-slate-700">Note (optional)</span>
            <textarea
              rows={2}
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-spar-green"
            />
          </label>
          {saveError && <p className="text-rose-600 font-semibold">{saveError}</p>}
          <p className="text-slate-400 text-[11px]">There is no Director stage; this decision is final.</p>
        </div>
      </Modal>
    </div>
  );
};

export default PromoTypeReview;
