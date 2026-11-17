import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { fetchDashboardSummary, fetchRecentPromos } from '../services/dashboardService.js';
import { DashboardSummary, RecentPromoItem } from '../types/index.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { formatDate } from '../utils/formatters.js';
import { openActionLabel, openPathFor, promoTypeLabel } from '../utils/promoLinks.js';
import {
  FileText,
  Clock,
  XCircle,
  CheckCircle2,
  Plus,
  ArrowRight,
  CalendarDays,
  RefreshCw,
  Inbox,
  PlayCircle,
  ClipboardCheck,
  BadgeCheck,
  Database,
  X,
} from 'lucide-react';

type Tone = 'slate' | 'amber' | 'rose' | 'emerald' | 'blue';

interface StatCard {
  key: string;
  label: string;
  hint: string;
  value: number;
  icon: React.ReactNode;
  tone: Tone;
  /** Which rows of the table this card narrows to when clicked. */
  matches: (p: RecentPromoItem) => boolean;
  /** Draws the eye to the card that needs action. */
  emphasize?: boolean;
}

const TONE: Record<Tone, { icon: string; ring: string; value: string }> = {
  slate: { icon: 'bg-slate-100 text-slate-600', ring: 'ring-slate-400', value: 'text-slate-900' },
  amber: { icon: 'bg-amber-50 text-amber-600', ring: 'ring-amber-400', value: 'text-amber-700' },
  rose: { icon: 'bg-rose-50 text-rose-600', ring: 'ring-rose-400', value: 'text-rose-700' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-500', value: 'text-emerald-800' },
  blue: { icon: 'bg-blue-50 text-blue-600', ring: 'ring-blue-400', value: 'text-blue-700' },
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const isRunningNow = (p: RecentPromoItem) =>
  p.status === 'APPROVED' && p.startDate.slice(0, 10) <= todayKey() && p.endDate.slice(0, 10) >= todayKey();

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentPromos, setRecentPromos] = useState<RecentPromoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryData, recentData] = await Promise.all([fetchDashboardSummary(), fetchRecentPromos(50)]);
      setSummary(summaryData);
      setRecentPromos(recentData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.firstName || user?.name?.split(' ')[0] || 'Colleague';
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }, [user]);

  // The cards differ by role so each person sees the counts that matter to their job.
  const cards: StatCard[] = useMemo(() => {
    const s = summary;
    const status = (st: RecentPromoItem['status']) => (p: RecentPromoItem) => p.status === st;

    if (role === 'STAFF') {
      const mine = (p: RecentPromoItem) => p.creator?.id === user?.id;
      return [
        {
          key: 'drafts',
          label: 'Drafts',
          hint: 'Not submitted yet',
          value: s?.drafts ?? 0,
          icon: <FileText className="w-4 h-4" />,
          tone: 'slate',
          matches: (p) => mine(p) && p.status === 'DRAFT',
        },
        {
          key: 'fix',
          label: 'Needs your fixes',
          hint: 'Returned by your Head',
          value: s?.rejected ?? 0,
          icon: <XCircle className="w-4 h-4" />,
          tone: 'rose',
          matches: (p) => mine(p) && p.status === 'REJECTED_BY_HEAD',
          emphasize: (s?.rejected ?? 0) > 0,
        },
        {
          key: 'with-head',
          label: 'With your Head',
          hint: 'Waiting for approval',
          value: recentPromos.filter((p) => mine(p) && p.status === 'SUBMITTED_TO_HEAD').length,
          icon: <Clock className="w-4 h-4" />,
          tone: 'amber',
          matches: (p) => mine(p) && p.status === 'SUBMITTED_TO_HEAD',
        },
        {
          key: 'approved',
          label: 'Approved',
          hint: 'Signed off and live for Marketing',
          value: s?.approved ?? 0,
          icon: <CheckCircle2 className="w-4 h-4" />,
          tone: 'emerald',
          matches: (p) => mine(p) && p.status === 'APPROVED',
        },
      ];
    }

    if (role === 'HEAD' || role === 'ADMIN') {
      return [
        {
          key: 'review',
          label: 'Waiting for review',
          hint: role === 'HEAD' ? 'Needs your decision' : 'Across all departments',
          value: s?.waitingForMe ?? 0,
          icon: <Clock className="w-4 h-4" />,
          tone: 'amber',
          matches: status('SUBMITTED_TO_HEAD'),
          emphasize: (s?.waitingForMe ?? 0) > 0,
        },
        {
          key: 'drafts',
          label: 'Drafts in progress',
          hint: 'Being prepared by staff',
          value: s?.drafts ?? 0,
          icon: <FileText className="w-4 h-4" />,
          tone: 'slate',
          matches: status('DRAFT'),
        },
        {
          key: 'rejected',
          label: 'Returned to staff',
          hint: 'Rejected, awaiting fixes',
          value: s?.rejected ?? 0,
          icon: <XCircle className="w-4 h-4" />,
          tone: 'rose',
          matches: status('REJECTED_BY_HEAD'),
        },
        {
          key: 'approved',
          label: 'Approved',
          hint: 'Released to Marketing',
          value: s?.approved ?? 0,
          icon: <CheckCircle2 className="w-4 h-4" />,
          tone: 'emerald',
          matches: status('APPROVED'),
        },
      ];
    }

    // Marketing and Master Data only work with approved promos.
    return [
      {
        key: 'approved',
        label: 'Approved promos',
        hint: 'All departments',
        value: s?.approved ?? 0,
        icon: <CheckCircle2 className="w-4 h-4" />,
        tone: 'emerald',
        matches: status('APPROVED'),
      },
      {
        key: 'running',
        label: 'Running today',
        hint: 'In store right now',
        value: recentPromos.filter(isRunningNow).length,
        icon: <PlayCircle className="w-4 h-4" />,
        tone: 'blue',
        matches: isRunningNow,
      },
    ];
  }, [role, summary, recentPromos, user?.id]);

  const selectedCard = cards.find((c) => c.key === activeCard) ?? null;
  const visiblePromos = selectedCard ? recentPromos.filter(selectedCard.matches) : recentPromos;
  const showDepartment = role === 'ADMIN' || role === 'MARKETING' || role === 'MASTER_DATA';

  const primaryAction = (() => {
    switch (role) {
      case 'STAFF':
      case 'ADMIN':
        return { label: 'New promo list', icon: <Plus className="w-4 h-4" />, to: '/promo-entry' };
      case 'HEAD':
        return {
          label: summary?.waitingForMe ? `Review ${summary.waitingForMe} waiting` : 'Open review queue',
          icon: <ClipboardCheck className="w-4 h-4" />,
          to: '/head-review',
        };
      case 'MARKETING':
        return { label: 'Approved promos', icon: <BadgeCheck className="w-4 h-4" />, to: '/approved-promos' };
      case 'MASTER_DATA':
        return { label: 'Master data', icon: <Database className="w-4 h-4" />, to: '/master-data' };
      default:
        return null;
    }
  })();

  const scopeText = user?.department
    ? `Showing ${user.department.name} department promo lists.`
    : role === 'MARKETING' || role === 'MASTER_DATA'
      ? 'Showing approved promo lists from every department.'
      : 'Showing promo lists from every department.';

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button onClick={loadDashboardData} className="font-bold underline hover:no-underline flex-shrink-0">
            Try again
          </button>
        </div>
      )}

      {/* ==================== GREETING HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{greeting}</h1>
          <p className="text-sm text-slate-500 mt-1">{scopeText}</p>
        </div>
        {primaryAction && (
          <button
            onClick={() => navigate(primaryAction.to)}
            className="self-start bg-[#e31e24] hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
          >
            {primaryAction.icon} {primaryAction.label}
          </button>
        )}
      </div>

      {/* ==================== STAT CARDS (click to filter the list below) ==================== */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const tone = TONE[card.tone];
          const selected = activeCard === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveCard(selected ? null : card.key)}
              aria-pressed={selected}
              title={selected ? 'Show all promo lists' : `Show only: ${card.label.toLowerCase()}`}
              className={`text-left bg-white p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col gap-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                selected
                  ? `ring-2 ${tone.ring} border-transparent`
                  : card.emphasize
                    ? 'border-amber-300 hover:border-amber-400 hover:shadow-md'
                    : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone.icon}`}>{card.icon}</span>
                {card.emphasize && !selected && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Action needed
                  </span>
                )}
              </div>
              <div>
                {isLoading && !summary ? (
                  <div className="h-8 w-10 rounded bg-slate-100 animate-pulse" />
                ) : (
                  <p className={`text-3xl font-black ${card.value > 0 ? tone.value : 'text-slate-900'}`}>{card.value}</p>
                )}
                <p className="text-sm font-bold text-slate-800 mt-0.5">{card.label}</p>
                <p className="text-xs text-slate-500">{card.hint}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ==================== PROMO LISTS ==================== */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              {role === 'MARKETING' || role === 'MASTER_DATA' ? 'Latest approved promos' : 'Recent promo lists'}
            </h2>
            {selectedCard && (
              <button
                onClick={() => setActiveCard(null)}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                title="Clear filter"
              >
                {selectedCard.label}
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#007d32] hover:bg-emerald-50"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              See all in calendar
            </button>
          </div>
        </div>

        {isLoading && recentPromos.length === 0 ? (
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
                <div className="h-4 flex-1 rounded bg-slate-100 animate-pulse" />
                <div className="h-5 w-24 rounded-full bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : visiblePromos.length === 0 ? (
          <div className="flex flex-col items-center text-center px-6 py-14">
            <span className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6" />
            </span>
            <p className="text-sm font-bold text-slate-800">
              {selectedCard ? `Nothing in “${selectedCard.label}”` : 'No promo lists yet'}
            </p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              {selectedCard
                ? 'You are all caught up here.'
                : role === 'STAFF' || role === 'ADMIN'
                  ? 'Create your first promo list to get started.'
                  : 'Promo lists will show up here as soon as they are created.'}
            </p>
            {selectedCard ? (
              <button
                onClick={() => setActiveCard(null)}
                className="mt-4 text-sm font-bold text-[#007d32] hover:underline"
              >
                Show all promo lists
              </button>
            ) : (
              (role === 'STAFF' || role === 'ADMIN') && (
                <button
                  onClick={() => navigate('/promo-entry')}
                  className="mt-4 inline-flex items-center gap-2 bg-[#007d32] hover:bg-[#00682a] text-white text-sm font-bold px-4 py-2 rounded-lg"
                >
                  <Plus className="w-4 h-4" /> New promo list
                </button>
              )
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#eaf1ec] text-[#2c533e] text-xs font-bold border-b border-[#d8e6dc]">
                  <th className="py-3 pl-4 pr-2 sm:px-5 whitespace-nowrap">Promo list</th>
                  <th className="py-3 px-3 whitespace-nowrap hidden md:table-cell">Type</th>
                  <th className="py-3 px-3 whitespace-nowrap hidden sm:table-cell">Runs</th>
                  {showDepartment && <th className="py-3 px-3 whitespace-nowrap hidden lg:table-cell">Department</th>}
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 whitespace-nowrap hidden lg:table-cell">Updated</th>
                  <th className="py-3 px-5 whitespace-nowrap text-right hidden sm:table-cell">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePromos.map((p) => {
                  const path = openPathFor(p, role);
                  const action = openActionLabel(p, role);
                  const needsAction = action === 'Fix' || action === 'Review';
                  return (
                    <tr
                      key={p.id}
                      onClick={() => path && navigate(path)}
                      className={`transition ${path ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                    >
                      <td className="py-3 pl-4 pr-2 sm:px-5">
                        <p className="font-semibold text-slate-900 truncate max-w-[12rem] sm:max-w-xs" title={p.title}>
                          {p.title}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500 whitespace-nowrap">{p.promoCode}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap hidden md:table-cell">
                        {promoTypeLabel(p.promoType)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap hidden sm:table-cell">
                        {formatDate(p.startDate)} – {formatDate(p.endDate)}
                      </td>
                      {showDepartment && (
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap hidden lg:table-cell">
                          {p.department?.name ?? '—'}
                        </td>
                      )}
                      <td className="py-3 px-3">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap hidden lg:table-cell">
                        {formatDate(p.updatedAt)}
                      </td>
                      <td className="py-3 px-5 text-right hidden sm:table-cell">
                        {path ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(path);
                            }}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                              needsAction
                                ? 'bg-[#007d32] text-white hover:bg-[#00682a]'
                                : 'text-[#007d32] hover:bg-emerald-50'
                            }`}
                          >
                            {action}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {p.status === 'SUBMITTED_TO_HEAD' ? 'With Head' : p.status === 'APPROVED' ? '' : 'With staff'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {visiblePromos.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
            Showing {visiblePromos.length} {selectedCard ? 'matching' : 'most recent'} promo list
            {visiblePromos.length === 1 ? '' : 's'}. Click a row to open it.
          </div>
        )}
      </section>
    </div>
  );
};
