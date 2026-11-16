import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays, ExternalLink, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { fetchPromos, fetchDepartments } from '../services/promoService.js';
import { PromoList, PromoStatus } from '../types/index.js';
import { openPathFor } from '../utils/promoLinks.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { getStatusDetails } from '../utils/formatters.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_LANES = 3;

const STATUS_BAR: Record<PromoStatus, string> = {
  APPROVED: 'bg-emerald-600 text-white hover:bg-emerald-700',
  SUBMITTED_TO_HEAD: 'bg-amber-400 text-amber-950 hover:bg-amber-500',
  REJECTED_BY_HEAD: 'bg-rose-500 text-white hover:bg-rose-600',
  REOPENED: 'bg-blue-500 text-white hover:bg-blue-600',
  DRAFT: 'bg-slate-300 text-slate-800 hover:bg-slate-400',
};

const ALL_STATUSES: PromoStatus[] = ['DRAFT', 'SUBMITTED_TO_HEAD', 'REJECTED_BY_HEAD', 'REOPENED', 'APPROVED'];

// Dates are compared as 'YYYY-MM-DD' strings taken straight from the API value,
// so an end date like 2026-11-07T23:59:59Z never shifts a day in local time zones.
const dayKey = (iso: string) => iso.slice(0, 10);

function toKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function durationDays(p: PromoList): number {
  const [ay, am, ad] = dayKey(p.startDate).split('-').map(Number);
  const [by, bm, bd] = dayKey(p.endDate).split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000) + 1;
}

interface WeekSegment {
  promo: PromoList;
  startCol: number; // 0-6
  endCol: number; // 0-6
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export const PromoCalendar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const todayKey = toKey(today);

  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [promos, setPromos] = useState<PromoList[]>([]);
  const [deptNames, setDeptNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<PromoStatus | ''>('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const list = await fetchPromos();
        if (alive) setPromos(list);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load promo lists.');
      } finally {
        if (alive) setIsLoading(false);
      }
      try {
        const depts = await fetchDepartments();
        if (alive) setDeptNames(Object.fromEntries(depts.map((d) => [d.id, d.name])));
      } catch {
        // Department names are optional; fall back to embedded department info.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const deptName = (p: PromoList) => p.department?.name || deptNames[p.departmentId] || '—';

  const departmentOptions = useMemo(() => {
    const ids = Array.from(new Set(promos.map((p) => p.departmentId)));
    return ids.map((id) => ({ id, name: deptNames[id] || promos.find((p) => p.departmentId === id)?.department?.name || id }));
  }, [promos, deptNames]);

  const filtered = useMemo(
    () =>
      promos.filter(
        (p) => (!statusFilter || p.status === statusFilter) && (!deptFilter || p.departmentId === deptFilter)
      ),
    [promos, statusFilter, deptFilter]
  );

  // Build the visible weeks (Monday-first) covering the month.
  const weeks = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7;
    let cursor = addDays(first, -offset);
    const result: Date[][] = [];
    do {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) week.push(addDays(cursor, i));
      result.push(week);
      cursor = addDays(cursor, 7);
    } while (cursor.getMonth() === month.getMonth());
    return result;
  }, [month]);

  const weekSegments = useMemo(
    () =>
      weeks.map((week) => {
        const wStart = toKey(week[0]);
        const wEnd = toKey(week[6]);
        const keys = week.map(toKey);
        const overlapping = filtered
          .filter((p) => dayKey(p.startDate) <= wEnd && dayKey(p.endDate) >= wStart)
          .sort((a, b) => dayKey(a.startDate).localeCompare(dayKey(b.startDate)) || durationDays(b) - durationDays(a));

        const laneEnds: number[] = [];
        const segments: WeekSegment[] = overlapping.map((p) => {
          const s = dayKey(p.startDate);
          const e = dayKey(p.endDate);
          const startCol = s < wStart ? 0 : keys.indexOf(s);
          const endCol = e > wEnd ? 6 : keys.indexOf(e);
          let lane = laneEnds.findIndex((end) => end < startCol);
          if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(endCol);
          } else {
            laneEnds[lane] = endCol;
          }
          return { promo: p, startCol, endCol, lane, continuesBefore: s < wStart, continuesAfter: e > wEnd };
        });

        const hiddenPerDay = keys.map(
          (_, col) => segments.filter((sg) => sg.lane >= MAX_LANES && sg.startCol <= col && sg.endCol >= col).length
        );
        return { segments, hiddenPerDay };
      }),
    [weeks, filtered]
  );

  const monthStartKey = toKey(month);
  const monthEndKey = toKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const inMonth = filtered.filter((p) => dayKey(p.startDate) <= monthEndKey && dayKey(p.endDate) >= monthStartKey);
  const stats = [
    { label: 'Running this month', value: inMonth.length, tone: 'text-slate-900' },
    { label: 'Approved', value: inMonth.filter((p) => p.status === 'APPROVED').length, tone: 'text-emerald-700' },
    { label: 'Awaiting head review', value: inMonth.filter((p) => p.status === 'SUBMITTED_TO_HEAD').length, tone: 'text-amber-700' },
    {
      label: 'Draft / rejected',
      value: inMonth.filter((p) => ['DRAFT', 'REJECTED_BY_HEAD', 'REOPENED'].includes(p.status)).length,
      tone: 'text-slate-600',
    },
  ];

  const dayPromos = filtered.filter((p) => dayKey(p.startDate) <= selectedDay && dayKey(p.endDate) >= selectedDay);
  const selectedPromo = selectedPromoId ? promos.find((p) => p.id === selectedPromoId) || null : null;

  const shiftMonth = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const goToday = () => {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(todayKey);
    setSelectedPromoId(null);
  };

  const selectClass =
    'text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-spar-green text-slate-700';

  const renderPromoCard = (p: PromoList, detailed = false) => {
    const path = openPathFor(p, user?.role);
    const lineCount = p._count?.promoLines ?? p.promoLines?.length ?? 0;
    return (
      <div key={p.id} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => setSelectedPromoId(p.id)}
            className="text-left text-sm font-semibold text-slate-900 hover:text-[#005A36] leading-snug"
          >
            {p.title}
          </button>
          {path && (
            <button
              onClick={() => navigate(path)}
              className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-[#005A36] hover:underline"
            >
              Open <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="text-[11px] font-mono text-slate-400">{p.promoCode}</p>
        <StatusBadge status={p.status} size="sm" />
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">
          <dt className="text-slate-400">Department</dt>
          <dd>{deptName(p)}</dd>
          <dt className="text-slate-400">Runs</dt>
          <dd>
            {formatKey(dayKey(p.startDate))} – {formatKey(dayKey(p.endDate))}
          </dd>
          <dt className="text-slate-400">Duration</dt>
          <dd>{durationDays(p)} days</dd>
          <dt className="text-slate-400">Promo lines</dt>
          <dd>{lineCount}</dd>
          {detailed && (
            <>
              <dt className="text-slate-400">Type</dt>
              <dd>{p.promoType.replace(/_/g, ' ').toLowerCase()}</dd>
              <dt className="text-slate-400">Created by</dt>
              <dd>
                {p.creator ? p.creator.name || `${p.creator.firstName} ${p.creator.lastName}`.trim() || p.creator.email : '—'}
              </dd>
            </>
          )}
        </dl>
        {detailed && p.rejectionReason && (
          <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded p-2">
            Rejection reason: {p.rejectionReason}
          </p>
        )}
        {detailed && p.notes && <p className="text-[11px] text-slate-600 bg-slate-50 rounded p-2">{p.notes}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Promo Calendar"
        description="Every promo list you can see, laid out across the dates it runs."
        actions={
          <div className="flex items-center gap-2">
            <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PromoStatus | '')}>
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {getStatusDetails(s).label}
                </option>
              ))}
            </select>
            {departmentOptions.length > 1 && (
              <select className={selectClass} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="">All departments</option>
                {departmentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl p-4">{error}</div>
      )}

      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* Calendar */}
        <div className="flex-1 min-w-0 w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Next month">
                <ChevronRight className="w-4 h-4" />
              </button>
              <h2 className="text-base font-bold text-slate-900 ml-1">
                {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <button
              onClick={goToday}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Today
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {d}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-400">Loading promo lists…</div>
          ) : (
            weeks.map((week, wi) => {
              const { segments, hiddenPerDay } = weekSegments[wi];
              return (
                <div key={wi} className="relative border-b border-slate-100 last:border-b-0">
                  <div className="grid grid-cols-7">
                    {week.map((d, di) => {
                      const key = toKey(d);
                      const outside = d.getMonth() !== month.getMonth();
                      const isSelected = key === selectedDay;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedDay(key);
                            setSelectedPromoId(null);
                          }}
                          className={`min-h-[118px] text-left p-1.5 border-r border-slate-100 last:border-r-0 flex flex-col justify-between transition ${
                            outside ? 'bg-slate-50/70' : 'bg-white'
                          } ${isSelected ? 'ring-2 ring-inset ring-[#005A36]' : 'hover:bg-emerald-50/40'}`}
                        >
                          <span
                            className={`text-xs w-6 h-6 inline-flex items-center justify-center rounded-full ${
                              key === todayKey
                                ? 'bg-[#E31B23] text-white font-bold'
                                : outside
                                  ? 'text-slate-300'
                                  : 'text-slate-700 font-semibold'
                            }`}
                          >
                            {d.getDate()}
                          </span>
                          {hiddenPerDay[di] > 0 && (
                            <span className="text-[10px] font-semibold text-slate-500 px-1">+{hiddenPerDay[di]} more</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Promo bars overlay */}
                  <div
                    className="absolute left-0 right-0 top-8 grid grid-cols-7 gap-y-1 pointer-events-none px-0.5"
                    style={{ gridAutoRows: '20px' }}
                  >
                    {segments
                      .filter((sg) => sg.lane < MAX_LANES)
                      .map((sg) => (
                        <button
                          key={sg.promo.id}
                          onClick={() => {
                            setSelectedPromoId(sg.promo.id);
                          }}
                          title={`${sg.promo.title} (${getStatusDetails(sg.promo.status).label})`}
                          className={`pointer-events-auto mx-0.5 px-2 text-[11px] font-semibold truncate text-left shadow-sm transition ${
                            STATUS_BAR[sg.promo.status]
                          } ${sg.continuesBefore ? 'rounded-l-none' : 'rounded-l-md'} ${
                            sg.continuesAfter ? 'rounded-r-none' : 'rounded-r-md'
                          } ${selectedPromoId === sg.promo.id ? 'ring-2 ring-offset-1 ring-slate-900' : ''}`}
                          style={{ gridColumn: `${sg.startCol + 1} / ${sg.endCol + 2}`, gridRow: sg.lane + 1 }}
                        >
                          {sg.continuesBefore ? '… ' : ''}
                          {sg.promo.title}
                        </button>
                      ))}
                  </div>
                </div>
              );
            })
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
            {ALL_STATUSES.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className={`w-3 h-3 rounded-sm ${STATUS_BAR[s].split(' ')[0]}`} />
                {getStatusDetails(s).label}
              </span>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <aside className="w-full xl:w-80 flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          {selectedPromo ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Promo details</h3>
                <button
                  onClick={() => setSelectedPromoId(null)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-500"
                  aria-label="Close details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderPromoCard(selectedPromo, true)}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#005A36]" />
                <h3 className="text-sm font-bold text-slate-900">{formatKey(selectedDay)}</h3>
              </div>
              <p className="text-[11px] text-slate-500">
                {dayPromos.length === 0
                  ? 'No promo lists running on this day.'
                  : `${dayPromos.length} promo list${dayPromos.length === 1 ? '' : 's'} running`}
              </p>
              <div className="space-y-2 max-h-[560px] overflow-y-auto">{dayPromos.map((p) => renderPromoCard(p))}</div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
