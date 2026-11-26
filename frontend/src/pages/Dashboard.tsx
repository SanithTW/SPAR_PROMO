import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { fetchDashboardSummary, fetchRecentPromos } from '../services/dashboardService.js';
import { DashboardSummary, PromoType, RecentPromoItem } from '../types/index.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { formatDate } from '../utils/formatters.js';
import { openActionLabel, openPathFor, promoTypeLabel } from '../utils/promoLinks.js';
import { getRoleTheme } from '../utils/roleTheme.js';
import {
  FileText,
  Clock,
  XCircle,
  CheckCircle2,
  Plus,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  RefreshCw,
  Inbox,
  PlayCircle,
  ClipboardCheck,
  BadgeCheck,
  Database,
  Sparkles,
  X,
  Search,
  Users,
  ShieldAlert,
  List as ListIcon,
  Layers,
  AlertCircle,
} from 'lucide-react';

type Tone = 'slate' | 'amber' | 'rose' | 'emerald' | 'blue';

interface StatCard {
  key: string;
  label: string;
  hint: string;
  value: number;
  icon: React.ReactNode;
  tone: Tone;
  matches: (p: RecentPromoItem) => boolean;
  emphasize?: boolean;
}

interface QuickLinkItem {
  label: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  accent?: string;
}

const TONE: Record<Tone, { icon: string; value: string; activeBorder: string }> = {
  slate: {
    icon: 'bg-slate-100 text-slate-700',
    value: 'text-slate-900',
    activeBorder: 'border-slate-400 bg-slate-50/80 ring-2 ring-slate-300/60',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700',
    value: 'text-amber-700',
    activeBorder: 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-400/20',
  },
  rose: {
    icon: 'bg-red-50 text-[#E31B23]',
    value: 'text-[#E31B23]',
    activeBorder: 'border-[#E31B23] bg-red-50/70 ring-2 ring-[#E31B23]/15',
  },
  emerald: {
    icon: 'bg-emerald-50 text-[#007D32]',
    value: 'text-[#007D32]',
    activeBorder: 'border-[#007D32] bg-emerald-50/70 ring-2 ring-[#007D32]/15',
  },
  blue: {
    icon: 'bg-sky-50 text-sky-700',
    value: 'text-sky-700',
    activeBorder: 'border-sky-400 bg-sky-50/70 ring-2 ring-sky-400/20',
  },
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const addDaysKey = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const isRunningNow = (p: RecentPromoItem) =>
  p.status === 'APPROVED' && p.startDate.slice(0, 10) <= todayKey() && p.endDate.slice(0, 10) >= todayKey();

const isUpcomingSoon = (p: RecentPromoItem) => {
  const start = p.startDate.slice(0, 10);
  return p.status === 'APPROVED' && start > todayKey() && start <= addDaysKey(14);
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const roleTheme = getRoleTheme(role);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentPromos, setRecentPromos] = useState<RecentPromoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PromoType | ''>('');

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

  const firstName = useMemo(
    () => user?.firstName || user?.name?.split(' ')[0] || 'Colleague',
    [user]
  );

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Role-specific stat cards
  const cards: StatCard[] = useMemo(() => {
    const s = summary;
    const status = (st: RecentPromoItem['status']) => (p: RecentPromoItem) => p.status === st;

    if (role === 'STAFF') {
      const mine = (p: RecentPromoItem) => p.creator?.id === user?.id;
      return [
        {
          key: 'drafts',
          label: 'Drafts',
          hint: 'Saved & ready to edit',
          value: s?.drafts ?? 0,
          icon: <FileText className="w-4 h-4" />,
          tone: 'slate',
          matches: (p) => mine(p) && p.status === 'DRAFT',
        },
        {
          key: 'fix',
          label: 'Needs Fixes',
          hint: 'Returned by Dept Head',
          value: s?.rejected ?? 0,
          icon: <XCircle className="w-4 h-4" />,
          tone: 'rose',
          matches: (p) => mine(p) && p.status === 'REJECTED_BY_HEAD',
          emphasize: (s?.rejected ?? 0) > 0,
        },
        {
          key: 'with-head',
          label: 'With Dept Head',
          hint: 'Awaiting sign-off',
          value: recentPromos.filter((p) => mine(p) && p.status === 'SUBMITTED_TO_HEAD').length,
          icon: <Clock className="w-4 h-4" />,
          tone: 'amber',
          matches: (p) => mine(p) && p.status === 'SUBMITTED_TO_HEAD',
        },
        {
          key: 'approved',
          label: 'Approved',
          hint: 'Released to Marketing',
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
          label: 'Awaiting Review',
          hint: role === 'HEAD' ? 'Requires your decision' : 'Pending across departments',
          value: s?.waitingForMe ?? 0,
          icon: <Clock className="w-4 h-4" />,
          tone: 'amber',
          matches: status('SUBMITTED_TO_HEAD'),
          emphasize: (s?.waitingForMe ?? 0) > 0,
        },
        {
          key: 'drafts',
          label: 'Drafts in Progress',
          hint: 'Prepared by category staff',
          value: s?.drafts ?? 0,
          icon: <FileText className="w-4 h-4" />,
          tone: 'slate',
          matches: status('DRAFT'),
        },
        {
          key: 'rejected',
          label: 'Returned to Staff',
          hint: 'Rejected for revision',
          value: s?.rejected ?? 0,
          icon: <XCircle className="w-4 h-4" />,
          tone: 'rose',
          matches: status('REJECTED_BY_HEAD'),
        },
        {
          key: 'approved',
          label: 'Approved',
          hint: 'Signed off & active',
          value: s?.approved ?? 0,
          icon: <CheckCircle2 className="w-4 h-4" />,
          tone: 'emerald',
          matches: status('APPROVED'),
        },
      ];
    }

    return [
      {
        key: 'approved',
        label: 'Approved Campaigns',
        hint: 'Signed off across all depts',
        value: s?.approved ?? 0,
        icon: <CheckCircle2 className="w-4 h-4" />,
        tone: 'emerald',
        matches: status('APPROVED'),
      },
      {
        key: 'running',
        label: 'Live In-Store Today',
        hint: 'Active promotional window',
        value: recentPromos.filter(isRunningNow).length,
        icon: <PlayCircle className="w-4 h-4" />,
        tone: 'blue',
        matches: isRunningNow,
        emphasize: recentPromos.filter(isRunningNow).length > 0,
      },
      {
        key: 'upcoming',
        label: 'Starting Next 14 Days',
        hint: 'Scheduled upcoming launch',
        value: recentPromos.filter(isUpcomingSoon).length,
        icon: <CalendarDays className="w-4 h-4" />,
        tone: 'amber',
        matches: isUpcomingSoon,
      },
    ];
  }, [role, summary, recentPromos, user?.id]);

  const selectedCard = cards.find((c) => c.key === activeCard) ?? null;

  const visiblePromos = useMemo(() => {
    const base = selectedCard ? recentPromos.filter(selectedCard.matches) : recentPromos;
    const q = tableSearch.trim().toLowerCase();
    return base.filter((p) => {
      if (typeFilter && p.promoType !== typeFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.promoCode.toLowerCase().includes(q) ||
        (p.department?.name ?? '').toLowerCase().includes(q) ||
        (p.creator?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [recentPromos, selectedCard, tableSearch, typeFilter]);

  const showDepartment = role === 'ADMIN' || role === 'MARKETING' || role === 'MASTER_DATA';

  // Hero glass stats derived strictly from real state
  const heroMetrics = useMemo(() => {
    const liveCount = recentPromos.filter(isRunningNow).length;
    const upcomingCount = recentPromos.filter(isUpcomingSoon).length;
    const totalLoaded = recentPromos.length;

    if (role === 'STAFF') {
      const pending = recentPromos.filter(
        (p) => p.creator?.id === user?.id && p.status === 'SUBMITTED_TO_HEAD'
      ).length;
      return [
        { label: 'Drafts', value: summary?.drafts ?? 0 },
        { label: 'With Head', value: pending },
        { label: 'Needs Fix', value: summary?.rejected ?? 0 },
        { label: 'Approved', value: summary?.approved ?? 0 },
      ];
    }

    if (role === 'HEAD') {
      return [
        { label: 'Pending Decision', value: summary?.waitingForMe ?? 0 },
        { label: 'In Draft', value: summary?.drafts ?? 0 },
        { label: 'Approved', value: summary?.approved ?? 0 },
        { label: 'Live Today', value: liveCount },
      ];
    }

    if (role === 'ADMIN') {
      const deptCount = new Set(recentPromos.map((p) => p.department?.id).filter(Boolean)).size;
      return [
        { label: 'Pending Review', value: summary?.waitingForMe ?? 0 },
        { label: 'Approved Total', value: summary?.approved ?? 0 },
        { label: 'Live Today', value: liveCount },
        { label: 'Active Depts', value: deptCount },
      ];
    }

    return [
      { label: 'Approved Lists', value: summary?.approved ?? 0 },
      { label: 'Live Today', value: liveCount },
      { label: 'Next 14 Days', value: upcomingCount },
      { label: 'Recent Feed', value: totalLoaded },
    ];
  }, [role, summary, recentPromos, user?.id]);

  // Primary and secondary actions per role
  const { primaryAction, secondaryAction } = useMemo(() => {
    switch (role) {
      case 'STAFF':
        return {
          primaryAction: { label: 'New Promo List', icon: <Plus className="w-4 h-4" />, to: '/promo-entry' },
          secondaryAction: { label: 'Approved Promos', icon: <BadgeCheck className="w-4 h-4" />, to: '/approved-promos' },
        };
      case 'HEAD':
        return {
          primaryAction: {
            label: summary?.waitingForMe ? `Review Queue (${summary.waitingForMe})` : 'Open Review Queue',
            icon: <ClipboardCheck className="w-4 h-4" />,
            to: '/head-review',
          },
          secondaryAction: { label: 'Audit Trail', icon: <ShieldAlert className="w-4 h-4" />, to: '/audit' },
        };
      case 'MARKETING':
        return {
          primaryAction: { label: 'Export Approved Promos', icon: <BadgeCheck className="w-4 h-4" />, to: '/approved-promos' },
          secondaryAction: { label: 'All SKU Lines', icon: <ListIcon className="w-4 h-4" />, to: '/list' },
        };
      case 'ADMIN':
        return {
          primaryAction: { label: 'Users & Departments', icon: <Users className="w-4 h-4" />, to: '/users-departments' },
          secondaryAction: { label: 'New Promo List', icon: <Plus className="w-4 h-4" />, to: '/promo-entry' },
        };
      case 'MASTER_DATA':
        return {
          primaryAction: { label: 'Master Data Catalog', icon: <Database className="w-4 h-4" />, to: '/master-data' },
          secondaryAction: { label: 'Approved SKU Lines', icon: <ListIcon className="w-4 h-4" />, to: '/list' },
        };
      default:
        return { primaryAction: null, secondaryAction: null };
    }
  }, [role, summary?.waitingForMe]);

  // Role-specific priority items for the right-hand panel
  const priorityItems = useMemo(() => {
    if (role === 'STAFF') {
      const rejected = recentPromos.filter(
        (p) => p.creator?.id === user?.id && p.status === 'REJECTED_BY_HEAD'
      );
      if (rejected.length > 0) return rejected.slice(0, 5);
      return recentPromos.filter((p) => p.creator?.id === user?.id && p.status === 'DRAFT').slice(0, 5);
    }
    if (role === 'HEAD') {
      return recentPromos.filter((p) => p.status === 'SUBMITTED_TO_HEAD').slice(0, 5);
    }
    if (role === 'MARKETING' || role === 'MASTER_DATA') {
      const live = recentPromos.filter(isRunningNow);
      return (live.length > 0 ? live : recentPromos.filter((p) => p.status === 'APPROVED')).slice(0, 5);
    }
    // ADMIN: show pending approvals first, otherwise most recent
    const pending = recentPromos.filter((p) => p.status === 'SUBMITTED_TO_HEAD');
    return (pending.length > 0 ? pending : recentPromos).slice(0, 5);
  }, [role, recentPromos, user?.id]);

  // Department breakdown for cross-department roles
  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; total: number; approved: number }>();
    for (const p of recentPromos) {
      const deptName = p.department?.name || 'Unassigned';
      const cur = map.get(deptName) ?? { name: deptName, total: 0, approved: 0 };
      cur.total += 1;
      if (p.status === 'APPROVED') cur.approved += 1;
      map.set(deptName, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [recentPromos]);

  // Quick links tailored to each role
  const quickLinks: QuickLinkItem[] = useMemo(() => {
    const calendarItem: QuickLinkItem = {
      label: 'Promotional Calendar',
      description: 'Campaign timeline across weeks & months',
      to: '/calendar',
      icon: <CalendarDays className="w-4 h-4 text-[#007D32]" />,
    };

    switch (role) {
      case 'STAFF':
        return [
          {
            label: 'Create Promo List',
            description: 'Build SKUs, pricing, and submit to Head',
            to: '/promo-entry',
            icon: <Plus className="w-4 h-4 text-[#007D32]" />,
          },
          {
            label: 'Approved Promos',
            description: 'Inspect signed-off campaigns',
            to: '/approved-promos',
            icon: <BadgeCheck className="w-4 h-4 text-emerald-700" />,
          },
          calendarItem,
        ];
      case 'HEAD':
        return [
          {
            label: 'Head Review Queue',
            description: 'Approve or return submitted promo lists',
            to: '/head-review',
            icon: <ClipboardCheck className="w-4 h-4 text-[#E31B23]" />,
          },
          {
            label: 'Approved Promos',
            description: 'View finalized department approvals',
            to: '/approved-promos',
            icon: <BadgeCheck className="w-4 h-4 text-[#007D32]" />,
          },
          {
            label: 'Audit Trail',
            description: 'Review approval & rejection history',
            to: '/audit',
            icon: <ShieldAlert className="w-4 h-4 text-slate-700" />,
          },
          calendarItem,
        ];
      case 'MARKETING':
        return [
          {
            label: 'Approved Campaigns & Exports',
            description: 'Download Excel workbooks & PDF summaries',
            to: '/approved-promos',
            icon: <BadgeCheck className="w-4 h-4 text-sky-700" />,
          },
          {
            label: 'All Approved SKU Lines',
            description: 'Cross-department SKU table & CSV export',
            to: '/list',
            icon: <ListIcon className="w-4 h-4 text-[#007D32]" />,
          },
          calendarItem,
        ];
      case 'ADMIN':
        return [
          {
            label: 'Users & Departments',
            description: 'Manage accounts, roles & dept heads',
            to: '/users-departments',
            icon: <Users className="w-4 h-4 text-purple-700" />,
          },
          {
            label: 'Head Review Queue',
            description: 'Monitor pending sign-offs across depts',
            to: '/head-review',
            icon: <ClipboardCheck className="w-4 h-4 text-[#E31B23]" />,
          },
          {
            label: 'Audit Trail',
            description: 'Compliance log of all system events',
            to: '/audit',
            icon: <ShieldAlert className="w-4 h-4 text-slate-700" />,
          },
          calendarItem,
        ];
      case 'MASTER_DATA':
        return [
          {
            label: 'Master Data Catalog',
            description: 'SKU pricing, VAT & promo mechanisms',
            to: '/master-data',
            icon: <Database className="w-4 h-4 text-amber-700" />,
          },
          {
            label: 'Approved SKU Lines',
            description: 'Inspect all approved promotional lines',
            to: '/list',
            icon: <ListIcon className="w-4 h-4 text-[#007D32]" />,
          },
          calendarItem,
        ];
      default:
        return [calendarItem];
    }
  }, [role]);

  const roleHeadlineDescription = useMemo(() => {
    switch (role) {
      case 'STAFF':
        return user?.department
          ? `Manage ${user.department.name} promotional drafts, respond to Head feedback, and track live approvals.`
          : 'Manage your promotional drafts, respond to feedback, and track approvals.';
      case 'HEAD':
        return user?.department
          ? `Final approval authority for ${user.department.name}. Review submitted margins, mechanics, and sign off campaigns.`
          : 'Final approval authority. Review submitted margins, mechanics, and sign off campaigns.';
      case 'MARKETING':
        return 'Cross-department campaign execution console. Inspect approved promotions and export branded Excel & PDF packs.';
      case 'ADMIN':
        return 'Enterprise governance across all retail departments, approval queues, user permissions, and compliance audit logs.';
      case 'MASTER_DATA':
        return 'Master catalog and promotional pricing oversight across all approved retail promotional lines.';
      default:
        return 'Centralized promotional lifecycle management for SPAR retail operations.';
    }
  }, [role, user?.department]);

  const tableHeading = useMemo(() => {
    switch (role) {
      case 'STAFF':
        return 'Department Promotional Lists';
      case 'HEAD':
        return 'Department Submission Pipeline';
      case 'MARKETING':
      case 'MASTER_DATA':
        return 'Approved Promotional Campaigns';
      case 'ADMIN':
        return 'Enterprise Promotion Pipeline';
      default:
        return 'Recent Promo Lists';
    }
  }, [role]);

  const priorityHeading = useMemo(() => {
    if (role === 'STAFF') {
      const hasRejected = recentPromos.some(
        (p) => p.creator?.id === user?.id && p.status === 'REJECTED_BY_HEAD'
      );
      return hasRejected ? 'Returned for Your Fixes' : 'Active Drafts';
    }
    if (role === 'HEAD') return 'Awaiting Your Sign-Off';
    if (role === 'MARKETING' || role === 'MASTER_DATA') {
      return recentPromos.some(isRunningNow) ? 'Live In-Store Campaigns' : 'Recently Approved';
    }
    return 'Department Activity';
  }, [role, recentPromos, user?.id]);

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-900 px-4 py-3.5 rounded-2xl text-sm flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#E31B23] flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="font-bold text-[#E31B23] underline hover:no-underline flex-shrink-0"
          >
            Try again
          </button>
        </div>
      )}

      {/* ==================== EXECUTIVE DARK EMERALD COMMAND HERO (Login sibling) ==================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#041a10] via-[#00381e] to-[#02140b] text-white shadow-2xl shadow-emerald-950/20 border border-emerald-950/50">
        {/* Ambient Lighting */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#E31B23]/15 blur-[110px]" />

        {/* Architectural Grid Lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Watermark SPAR Tree */}
        <div className="pointer-events-none absolute -bottom-14 -right-10 h-64 w-64 opacity-[0.05] rotate-6">
          <img src="/spar-tree.svg" alt="" className="w-full h-full object-contain filter invert brightness-200" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 space-y-6">
          {/* Top Brand Stripe */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-10 rounded-full bg-[#E31B23]" />
              <div className="h-1.5 w-16 rounded-full bg-[#007D32]" />
              <div className="h-1.5 w-2.5 rounded-full bg-white/25" />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 backdrop-blur-md border border-white/15 text-[10.5px] font-bold uppercase tracking-wider text-emerald-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E31B23] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E31B23]" />
              </span>
              <span>{roleTheme.workspaceLabel}</span>
            </div>
          </div>

          {/* Greeting + Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${roleTheme.darkBadgeClass}`}
                >
                  {roleTheme.label} · {roleTheme.badge}
                </span>
                {user?.department && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-[11px] font-semibold text-emerald-100">
                    <Layers className="w-3 h-3 text-emerald-300" />
                    {user.department.name} Department
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
                {timeGreeting},{' '}
                <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">
                  {firstName}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                {roleHeadlineDescription}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              {secondaryAction && (
                <button
                  onClick={() => navigate(secondaryAction.to)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 px-4 py-2.5 text-xs sm:text-sm font-bold text-white backdrop-blur-md transition cursor-pointer"
                >
                  {secondaryAction.icon}
                  <span>{secondaryAction.label}</span>
                </button>
              )}
              {primaryAction && (
                <button
                  onClick={() => navigate(primaryAction.to)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E31B23] hover:bg-[#c9141b] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-black/30 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {primaryAction.icon}
                  <span>{primaryAction.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Glass Operational Telemetry Strip */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-[#E31B23] via-emerald-400 to-[#007D32]" />
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
              {heroMetrics.map((m) => (
                <div key={m.label} className="px-4 py-3.5 sm:px-5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-200/80">
                    {m.label}
                  </p>
                  {isLoading && !summary ? (
                    <div className="mt-1.5 h-7 w-12 rounded bg-white/10 animate-pulse" />
                  ) : (
                    <p className="mt-0.5 text-2xl font-black text-white tabular-nums">{m.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== INTERACTIVE KPI FILTER CARDS ==================== */}
      <div
        className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${
          cards.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
        }`}
      >
        {cards.map((card) => {
          const tone = TONE[card.tone];
          const selected = activeCard === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveCard(selected ? null : card.key)}
              aria-pressed={selected}
              title={selected ? 'Show all promo lists' : `Filter table by ${card.label}`}
              className={`group text-left p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007D32] ${
                selected
                  ? `${tone.activeBorder} shadow-sm`
                  : card.emphasize
                    ? 'bg-white border-amber-300/90 hover:border-amber-400 hover:shadow-md shadow-sm'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/40 hover:shadow-md shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border border-black/[0.04] ${tone.icon}`}
                >
                  {card.icon}
                </span>

                {selected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#007D32] bg-white px-2.5 py-1 rounded-full border border-emerald-200">
                    Filtered
                    <X className="w-3 h-3" />
                  </span>
                ) : card.emphasize ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E31B23] bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                    Attention
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition">
                    Filter
                  </span>
                )}
              </div>

              <div>
                {isLoading && !summary ? (
                  <div className="h-8 w-12 rounded bg-slate-100 animate-pulse" />
                ) : (
                  <p className={`text-3xl font-black tracking-tight tabular-nums ${card.value > 0 ? tone.value : 'text-slate-900'}`}>
                    {card.value}
                  </p>
                )}
                <p className="text-sm font-bold text-slate-900 mt-1">{card.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.hint}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ==================== MAIN WORKSPACE GRID (TABLE + ROLE OPERATIONS PANEL) ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT: EXECUTIVE PROMO PIPELINE TABLE */}
        <section className="xl:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/[0.04] overflow-hidden">
          <div className={`h-1 w-full bg-gradient-to-r ${roleTheme.accentBar}`} />

          <div className="p-5 border-b border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  {tableHeading}
                </h2>
                {selectedCard && (
                  <button
                    onClick={() => setActiveCard(null)}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-[#007D32] hover:bg-emerald-100 cursor-pointer"
                    title="Clear card filter"
                  >
                    {selectedCard.label}
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={loadDashboardData}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer transition"
                  title="Refresh dashboard"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 px-3 py-1.5 text-xs font-bold text-[#007D32] cursor-pointer transition"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>
              </div>
            </div>

            {/* Inline Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search by promo title, code, department..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#007D32] focus:outline-none focus:ring-2 focus:ring-[#007D32]/15 transition"
                />
                {tableSearch && (
                  <button
                    type="button"
                    onClick={() => setTableSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as PromoType | '')}
                aria-label="Filter by promotion type"
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#007D32] focus:outline-none focus:ring-2 focus:ring-[#007D32]/15 transition"
              >
                <option value="">All Promo Types</option>
                <option value="WEEKLY_LEAFLET">Weekly Leaflet</option>
                <option value="MONTHLY_CATALOGUE">Monthly Catalogue</option>
                <option value="SPECIAL_PROMOTION">Special Promotion</option>
                <option value="SEASONAL_CAMPAIGN">Seasonal Campaign</option>
                <option value="CLEARANCE">Clearance</option>
              </select>
            </div>
          </div>

          {isLoading && recentPromos.length === 0 ? (
            <div className="divide-y divide-slate-100">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                  <div className="h-4 flex-1 rounded bg-slate-100 animate-pulse" />
                  <div className="h-5 w-24 rounded-full bg-slate-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : visiblePromos.length === 0 ? (
            <div className="flex flex-col items-center text-center px-6 py-14">
              <span className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#007D32] flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6" />
              </span>
              <p className="text-sm font-bold text-slate-900">
                {selectedCard || tableSearch || typeFilter
                  ? 'No matching promotional lists'
                  : 'No promo lists yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {selectedCard || tableSearch || typeFilter
                  ? 'Try clearing your active filter or search query.'
                  : role === 'STAFF' || role === 'ADMIN'
                    ? 'Create your first promotional list to initiate the approval workflow.'
                    : 'Promotional lists will appear here as soon as they are available.'}
              </p>
              {(selectedCard || tableSearch || typeFilter) ? (
                <button
                  onClick={() => {
                    setActiveCard(null);
                    setTableSearch('');
                    setTypeFilter('');
                  }}
                  className="mt-4 text-xs font-bold text-[#007D32] hover:underline cursor-pointer"
                >
                  Reset all filters
                </button>
              ) : (
                (role === 'STAFF' || role === 'ADMIN') && (
                  <button
                    onClick={() => navigate('/promo-entry')}
                    className="mt-4 inline-flex items-center gap-2 bg-[#007D32] hover:bg-[#00682a] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Create Promo List
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200/80">
                    <th className="py-3 pl-5 pr-3 whitespace-nowrap">Promo List</th>
                    <th className="py-3 px-3 whitespace-nowrap hidden md:table-cell">Type</th>
                    <th className="py-3 px-3 whitespace-nowrap hidden sm:table-cell">Campaign Window</th>
                    {showDepartment && <th className="py-3 px-3 whitespace-nowrap hidden lg:table-cell">Dept</th>}
                    <th className="py-3 px-3 whitespace-nowrap">Status</th>
                    <th className="py-3 px-5 whitespace-nowrap text-right hidden sm:table-cell">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiblePromos.map((p) => {
                    const path = openPathFor(p, role);
                    const action = openActionLabel(p, role);
                    const needsAction = action === 'Fix' || action === 'Review';
                    const liveNow = isRunningNow(p);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => path && navigate(path)}
                        className={`transition ${path ? 'cursor-pointer hover:bg-emerald-50/35' : ''}`}
                      >
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="flex items-center gap-2">
                            <p
                              className="font-bold text-slate-900 truncate max-w-[12rem] sm:max-w-xs"
                              title={p.title}
                            >
                              {p.title}
                            </p>
                            {liveNow && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[10px] font-bold text-sky-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                Live
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {p.promoCode}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">v{p.version}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap hidden md:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                            {promoTypeLabel(p.promoType)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-slate-600 whitespace-nowrap hidden sm:table-cell">
                          {formatDate(p.startDate)} – {formatDate(p.endDate)}
                        </td>
                        {showDepartment && (
                          <td className="py-3.5 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap hidden lg:table-cell">
                            {p.department?.name ?? '—'}
                          </td>
                        )}
                        <td className="py-3.5 px-3">
                          <StatusBadge status={p.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-5 text-right hidden sm:table-cell">
                          {path ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(path);
                              }}
                              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                                needsAction
                                  ? 'bg-[#E31B23] text-white hover:bg-[#c9141b] shadow-xs'
                                  : 'text-[#007D32] bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/70'
                              }`}
                            >
                              {action}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                              {p.status === 'SUBMITTED_TO_HEAD'
                                ? 'With Head'
                                : p.status === 'APPROVED'
                                  ? 'Finalized'
                                  : 'With Staff'}
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
            <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-700">{visiblePromos.length}</strong>{' '}
                {selectedCard || tableSearch || typeFilter ? 'matching' : 'recent'} promo list
                {visiblePromos.length === 1 ? '' : 's'}
              </span>
              <span className="hidden sm:inline text-slate-400">Select a row to open workspace</span>
            </div>
          )}
        </section>

        {/* RIGHT: ROLE-SPECIFIC PRIORITY QUEUE + QUICK NAVIGATION */}
        <aside className="xl:col-span-4 space-y-6">
          {/* Priority Queue / Department Breakdown */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/[0.04] overflow-hidden">
            <div className={`h-1 w-full bg-gradient-to-r ${roleTheme.accentBar}`} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                    {priorityHeading}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${roleTheme.badgeClass}`}
                >
                  {roleTheme.badge}
                </span>
              </div>

              {role === 'ADMIN' && departmentBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {departmentBreakdown.map((dept) => {
                    const pct = dept.total > 0 ? Math.round((dept.approved / dept.total) * 100) : 0;
                    return (
                      <div
                        key={dept.name}
                        className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{dept.name}</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {dept.approved}/{dept.total} approved
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#007D32] to-emerald-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : priorityItems.length === 0 ? (
                <div className="p-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                  <p className="text-xs font-bold text-slate-700">All caught up</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    No immediate items require action in this queue.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {priorityItems.map((item) => {
                    const path = openPathFor(item, role);
                    const action = openActionLabel(item, role);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => path && navigate(path)}
                        disabled={!path}
                        className="w-full text-left p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-emerald-50/50 hover:border-[#007D32]/40 transition flex items-start justify-between gap-3 cursor-pointer disabled:cursor-default"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate" title={item.title}>
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            <span className="font-mono">{item.promoCode}</span> · {formatDate(item.startDate)}
                          </p>
                        </div>
                        {path && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-[#007D32] flex-shrink-0">
                            {action}
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Role Quick Shortcuts Card */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/[0.04] overflow-hidden">
            <div className="p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">
                Workspace Shortcuts
              </h3>
              <div className="space-y-2">
                {quickLinks.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => navigate(item.to)}
                    className="w-full text-left p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#007D32]/50 hover:shadow-sm transition flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center flex-shrink-0 shadow-2xs">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.label}</p>
                        <p className="text-[11px] text-slate-500 truncate">{item.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#007D32] group-hover:translate-x-0.5 transition flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
