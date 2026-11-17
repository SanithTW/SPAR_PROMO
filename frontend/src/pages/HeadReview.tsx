import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, CellValueChangedEvent } from 'ag-grid-community';
import { PageHeader } from '../components/layout/PageHeader.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { Button } from '../components/common/Button.js';
import { Modal } from '../components/common/Modal.js';
import { PromoList, PromoLine } from '../types/index.js';
import {
  fetchHeadReviewList,
  fetchHeadReviewById,
  headApprovePromo,
  headApprovePromoLines,
  headRejectPromo,
  fetchPromoTypes,
} from '../services/promoService.js';
import { formatDate, formatZar } from '../utils/formatters.js';
import { promoTypeLabel } from '../utils/promoLinks.js';
import {
  Check,
  X,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Search,
  Eye,
  Calendar,
  User,
  Building2,
  History,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

export const HeadReview: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode: list or detail
  const activePromoId = id || null;

  // List View State
  const [promos, setPromos] = useState<PromoList[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || 'SUBMITTED_TO_HEAD'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [promoTypeFilter, setPromoTypeFilter] = useState('');
  const [promoTypeOptions, setPromoTypeOptions] = useState<{ code: string; name: string }[]>([]);

  // Detail View State
  const [detailPromo, setDetailPromo] = useState<PromoList | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [unauthorizedAccess, setUnauthorizedAccess] = useState(false);

  // Modal States
  const [targetPromo, setTargetPromo] = useState<PromoList | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Line-level review: which lines the Head approves, and a comment per line
  const gridApiRef = useRef<GridApi<PromoLine> | null>(null);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [lineComments, setLineComments] = useState<Record<string, string>>({});

  // Load Promo Types
  useEffect(() => {
    fetchPromoTypes()
      .then((types) => setPromoTypeOptions(types))
      .catch((err) => console.error('Failed to load promo types', err));
  }, []);

  // Fetch List
  const loadReviewList = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const filterStatus = statusFilter === 'ALL' ? undefined : statusFilter;
      const data = await fetchHeadReviewList({
        status: filterStatus,
        search: searchQuery.trim() || undefined,
      });
      setPromos(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load review data.';
      setListError(msg);
    } finally {
      setIsLoadingList(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (!activePromoId) {
      loadReviewList();
    }
  }, [activePromoId, loadReviewList]);

  // Fetch Detail if activePromoId is set
  const loadPromoDetail = useCallback(async (promoId: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    setUnauthorizedAccess(false);
    try {
      const promo = await fetchHeadReviewById(promoId);
      setDetailPromo(promo);
      // Default: every line selected for approval; carry over any saved head comments
      const promoLines = promo.promoLines || [];
      setSelectedLineIds(promoLines.map((l) => l.id));
      setLineComments(
        Object.fromEntries(promoLines.filter((l) => l.headComment).map((l) => [l.id, l.headComment as string]))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load promotional review detail.';
      if (
        msg.includes('Unauthorized') ||
        msg.includes('assigned department') ||
        msg.includes('another department') ||
        msg.includes('403')
      ) {
        setUnauthorizedAccess(true);
      } else {
        setDetailError(msg);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (activePromoId) {
      loadPromoDetail(activePromoId);
    } else {
      setDetailPromo(null);
      setUnauthorizedAccess(false);
      setDetailError(null);
    }
  }, [activePromoId, loadPromoDetail]);

  // Filtered List
  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      if (promoTypeFilter && p.promoType !== promoTypeFilter) {
        return false;
      }
      return true;
    });
  }, [promos, promoTypeFilter]);

  const nonEmptyLineComments = () =>
    Object.fromEntries(
      Object.entries(lineComments)
        .map(([k, v]) => [k, v.trim()] as const)
        .filter(([, v]) => v.length > 0)
    );

  // Lines the Head left unticked -> returned to Staff; each needs a comment
  const detailLines = detailPromo?.promoLines || [];
  const selectedSet = useMemo(() => new Set(selectedLineIds), [selectedLineIds]);
  const unselectedLines = detailLines.filter((l) => !selectedSet.has(l.id));
  const unselectedMissingComment = unselectedLines.filter((l) => !lineComments[l.id]?.trim());

  const lineLabel = (l: PromoLine) => `${l.product?.sku || l.productId} ${l.product?.name || ''}`.trim();

  // Handle Approve Action
  const handleApprove = async () => {
    if (!targetPromo) return;
    const isLineReview =
      !!detailPromo && detailPromo.id === targetPromo.id && (detailPromo.promoLines?.length || 0) > 0;
    setIsActionLoading(true);
    try {
      if (isLineReview) {
        const result = await headApprovePromoLines(targetPromo.id, selectedLineIds, nonEmptyLineComments());
        setFeedbackMessage({
          type: 'success',
          text: result.returnedPromo
            ? `Approved ${result.promoLines?.length ?? selectedLineIds.length} line(s) — available for Marketing. ${
                result.returnedPromo.promoLines?.length ?? 0
              } line(s) returned to Staff with your comments as ${result.returnedPromo.promoCode}.`
            : 'Promo list approved successfully. Final approval complete; available for Marketing.',
        });
      } else {
        await headApprovePromo(targetPromo.id, 'Approved by Department Head (Final Approval)');
        setFeedbackMessage({
          type: 'success',
          text: 'Promo list approved successfully. Final approval complete; available for Marketing.',
        });
      }
      setIsApproveModalOpen(false);
      setTargetPromo(null);

      if (activePromoId) {
        // Reload detail or navigate back
        loadPromoDetail(activePromoId);
      } else {
        loadReviewList();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Head approval failed.';
      alert(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Reject Action
  const handleReject = async () => {
    if (!targetPromo) return;
    const isDetailTarget = !!detailPromo && detailPromo.id === targetPromo.id;
    const perLine = isDetailTarget ? nonEmptyLineComments() : {};
    if (!rejectReason.trim() && Object.keys(perLine).length === 0) {
      setRejectError('Please provide a reason for rejection (or comment on the lines). This is required for Staff correction.');
      return;
    }

    setIsActionLoading(true);
    setRejectError(null);
    try {
      await headRejectPromo(targetPromo.id, rejectReason.trim(), perLine);
      setFeedbackMessage({
        type: 'success',
        text: 'Promo list rejected and returned to Staff for correction.',
      });
      setIsRejectModalOpen(false);
      setTargetPromo(null);
      setRejectReason('');

      if (activePromoId) {
        loadPromoDetail(activePromoId);
      } else {
        loadReviewList();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Head rejection failed.';
      setRejectError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // AG Grid Column Definitions for Review Detail Lines (Read-Only)
  const lineColumnDefs = useMemo<ColDef<PromoLine>[]>(() => {
    return [
      {
        headerName: 'SKU / Barcode',
        field: 'product.sku',
        width: 140,
        pinned: 'left',
        cellRenderer: (params: any) => {
          const product = params.data?.product;
          return (
            <div className="flex flex-col justify-center leading-tight py-1 font-mono text-xs">
              <span className="font-bold text-slate-800">{product?.sku || '—'}</span>
              <span className="text-[10px] text-slate-400">{product?.barcode || ''}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Description & Category',
        field: 'product.name',
        width: 240,
        pinned: 'left',
        cellRenderer: (params: any) => {
          const product = params.data?.product;
          return (
            <div className="flex flex-col justify-center leading-tight py-1">
              <span className="font-semibold text-slate-800 text-xs truncate" title={product?.name}>
                {product?.name || '—'}
              </span>
              <span className="text-[10px] text-slate-400">
                {product?.category} • {product?.uom}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Normal Retail',
        field: 'product.retailPrice',
        width: 110,
        valueFormatter: (p: any) => formatZar(p.value),
        cellClass: 'text-right font-mono bg-slate-50 text-slate-700',
      },
      {
        headerName: 'Promo Price',
        field: 'promoPrice',
        width: 110,
        valueFormatter: (p: any) => formatZar(p.value),
        cellClass: 'text-right font-mono font-bold text-slate-900 bg-emerald-50/40',
      },
      {
        headerName: 'Base Cost',
        field: 'product.baseCost',
        width: 110,
        valueFormatter: (p: any) => formatZar(p.value),
        cellClass: 'text-right font-mono bg-slate-50 text-slate-600',
      },
      {
        headerName: 'Deal Cost',
        field: 'dealCost',
        width: 110,
        valueFormatter: (p: any) => (p.value ? formatZar(p.value) : '—'),
        cellClass: 'text-right font-mono text-slate-700',
      },
      {
        headerName: 'Rebate',
        field: 'rebateAmount',
        width: 95,
        valueFormatter: (p: any) => (p.value ? formatZar(p.value) : '—'),
        cellClass: 'text-right font-mono text-slate-700',
      },
      {
        headerName: 'Discount %',
        field: 'discountPercent',
        width: 100,
        valueFormatter: (p: any) => (p.value != null ? `${Number(p.value).toFixed(1)}%` : '—'),
        cellClass: (p: any) =>
          `text-right font-mono font-medium ${Number(p.value) > 20 ? 'text-amber-700' : 'text-slate-700'}`,
      },
      {
        headerName: 'Net Cost',
        field: 'netCost',
        width: 110,
        valueFormatter: (p: any) => formatZar(p.value),
        cellClass: 'text-right font-mono bg-slate-50 text-slate-800 font-semibold',
      },
      {
        headerName: 'Margin %',
        field: 'marginPercent',
        width: 100,
        valueFormatter: (p: any) => (p.value != null ? `${Number(p.value).toFixed(1)}%` : '—'),
        cellClass: (p: any) =>
          `text-right font-mono font-bold ${
            Number(p.value) < 10 ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-700 bg-emerald-50/20'
          }`,
      },
      {
        headerName: 'Est. Volume (AU)',
        field: 'estimatedVolume',
        width: 120,
        valueFormatter: (p: any) => (p.value != null ? Number(p.value).toLocaleString() : '—'),
        cellClass: 'text-right font-mono text-slate-800',
      },
      {
        headerName: 'Forecast Sales (AV)',
        field: 'forecastRevenue',
        width: 130,
        valueFormatter: (p: any) => formatZar(p.value),
        cellClass: 'text-right font-mono font-bold text-amber-700 bg-amber-50/20',
      },
      {
        headerName: 'Forecast Margin (AW)',
        field: 'forecastMargin',
        width: 135,
        valueFormatter: (p: any) => formatZar(p.value),
        cellClass: (p: any) =>
          `text-right font-mono font-bold ${
            Number(p.value) < 0 ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-700 bg-emerald-50/30'
          }`,
      },
      {
        headerName: 'Mechanic',
        field: 'mechanic',
        width: 130,
        cellRenderer: (p: any) => (
          <span className="text-xs text-slate-700">{p.value ? p.value.replace('_', ' ') : '—'}</span>
        ),
      },
      {
        headerName: 'Funding',
        field: 'fundingMechanism',
        width: 130,
        cellRenderer: (p: any) => (
          <span className="text-xs text-slate-700">{p.value ? p.value.replace('_', ' ') : '—'}</span>
        ),
      },
      {
        // Per-line Head comment. Editable while the list awaits review (grid context.editable).
        headerName: 'Head Comment',
        colId: 'headComment',
        field: 'headComment',
        pinned: 'right',
        width: 250,
        sortable: false,
        filter: false,
        editable: (p: any) => !!p.context?.editable,
        singleClickEdit: true,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: { maxLength: 500 },
        tooltipField: 'headComment',
        cellRenderer: (p: any) => {
          const editable = !!p.context?.editable;
          const rejected = editable ? !p.node.isSelected() : p.data?.headDecision === 'REJECTED';
          if (p.value) {
            return (
              <span className={`text-xs ${rejected ? 'text-rose-700 font-medium' : 'text-slate-700'}`}>{p.value}</span>
            );
          }
          if (!editable) return <span className="text-xs text-slate-300">—</span>;
          return rejected ? (
            <span className="text-xs font-semibold text-rose-600">✎ Comment required (not approved)</span>
          ) : (
            <span className="text-xs text-slate-400 italic">✎ Add comment…</span>
          );
        },
      },
    ];
  }, []);

  // Department Security Guard Rendering
  if (unauthorizedAccess) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Access Restricted"
          description="Department authorization security enforcement"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Head Review', href: '/head-review' }, { label: 'Unauthorized' }]}
        />
        <div className="max-w-2xl mx-auto p-8 bg-white border border-rose-200 rounded-2xl shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Department Authorization Error</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            As Department Head for <strong>{user?.department?.name || 'your department'}</strong>, you can only review promotional lists belonging directly to your department. Access to submissions from other commercial divisions is restricted.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/head-review')}
            >
              Return to Department Review Queue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DETAIL VIEW
  // -------------------------------------------------------------
  if (activePromoId) {
    if (isLoadingDetail) {
      return (
        <div className="space-y-6 animate-pulse">
          <div className="h-20 bg-slate-200 rounded-xl" />
          <div className="h-40 bg-slate-200 rounded-xl" />
          <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
      );
    }

    if (detailError || !detailPromo) {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Promo Not Found"
            breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Head Review', href: '/head-review' }]}
          />
          <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">{detailError || 'Promotional submission not found.'}</h3>
            <Button variant="outline" onClick={() => navigate('/head-review')}>
              Back to Head Review Queue
            </Button>
          </div>
        </div>
      );
    }

    const lines = detailPromo.promoLines || [];
    const isPendingReview = detailPromo.status === 'SUBMITTED_TO_HEAD';
    const isApproved = detailPromo.status === 'APPROVED';
    const isRejected = detailPromo.status === 'REJECTED_BY_HEAD';

    return (
      <div className="space-y-6 pb-20">
        <PageHeader
          title={detailPromo.title}
          description={`Campaign Code: ${detailPromo.promoCode} • Department: ${detailPromo.department?.name || '—'} • Submitted by ${detailPromo.creator ? `${detailPromo.creator.firstName} ${detailPromo.creator.lastName}` : 'Staff'}`}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Head Review', href: '/head-review' },
            { label: detailPromo.promoCode },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/head-review')}
              >
                Back to Queue
              </Button>
              <StatusBadge status={detailPromo.status} />
            </div>
          }
        />

        {feedbackMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-spar-green" />
              <span className="font-semibold">{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-emerald-700 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Governance banner */}
        <div className="p-4 rounded-xl bg-[#007d32] text-white flex items-start gap-3.5 border border-[#00682a] shadow-md">
          <div className="p-2 rounded-lg bg-white/20 text-white mt-0.5 flex-shrink-0">
            <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">
              Final Approval Authority (No Secondary/Director Stage)
            </h4>
            <p className="text-xs text-white/90 mt-0.5 leading-relaxed font-normal">
              Your decision on this submission is final. Approving transitions this campaign to <strong>APPROVED</strong> and releases it directly to Marketing. Rejection returns it to the Staff submitter with your required feedback for correction.
            </p>
          </div>
        </div>

        {/* Rejection Banner if rejected */}
        {isRejected && detailPromo.rejectionReason && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-xs uppercase tracking-wider block text-rose-800">
                Current Rejection Reason
              </span>
              <p className="text-sm text-rose-950 font-medium mt-0.5 whitespace-pre-line">{detailPromo.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Metadata Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Department</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-spar-green" />
              {detailPromo.department?.name}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-medium block">Promo Mechanism</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 capitalize">
              {detailPromo.promoType.replace('_', ' ').toLowerCase()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-medium block">Promotional Period</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {formatDate(detailPromo.startDate)} – {formatDate(detailPromo.endDate)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-medium block">Staff Submitter</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              {detailPromo.creator ? `${detailPromo.creator.firstName} ${detailPromo.creator.lastName}` : 'Staff'}
            </span>
          </div>

          {detailPromo.notes && (
            <div className="col-span-2 sm:col-span-4 pt-3 border-t border-slate-100">
              <span className="text-slate-400 font-medium block mb-1">Staff Submitter Notes:</span>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                "{detailPromo.notes}"
              </p>
            </div>
          )}
        </div>

        {/* Promo Lines AG Grid Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-spar-green" />
              <h3 className="font-bold text-slate-900 text-sm">
                Promotional Products Review ({lines.length} lines)
              </h3>
            </div>
            <div className="text-xs text-slate-400">
              {isPendingReview
                ? 'Tick the lines to approve • Click a Head Comment cell to type'
                : `Read-Only Review Mode • Authorized for ${user?.department?.name || ''} Head`}
            </div>
          </div>

          {isPendingReview && lines.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => gridApiRef.current?.selectAll()}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => gridApiRef.current?.deselectAll()}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Clear selection
                </button>
                <span className="text-slate-600">
                  <strong className="text-slate-900">{selectedLineIds.length}</strong> of {lines.length} lines selected for
                  approval
                </span>
              </div>
              {unselectedLines.length > 0 && (
                <span className={unselectedMissingComment.length ? 'text-rose-700 font-semibold' : 'text-amber-700'}>
                  {unselectedLines.length} line(s) will be returned to Staff
                  {unselectedMissingComment.length ? ` • ${unselectedMissingComment.length} still need a comment` : ''}
                </span>
              )}
            </div>
          )}

          {lines.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No product lines are present in this submission.
            </div>
          ) : (
            <div className="ag-theme-quartz w-full" style={{ height: '420px' }}>
              <AgGridReact<PromoLine>
                rowData={lines}
                columnDefs={lineColumnDefs}
                defaultColDef={{
                  resizable: true,
                  sortable: true,
                  filter: true,
                }}
                rowHeight={42}
                headerHeight={40}
                getRowId={(p) => p.data.id}
                context={{ editable: isPendingReview }}
                rowSelection={
                  isPendingReview
                    ? { mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false }
                    : undefined
                }
                selectionColumnDef={{ pinned: 'left', width: 50, headerTooltip: 'Select all lines' }}
                stopEditingWhenCellsLoseFocus
                tooltipShowDelay={300}
                onGridReady={(e) => {
                  gridApiRef.current = e.api;
                }}
                onFirstDataRendered={(e) => {
                  if (!isPendingReview) return;
                  e.api.forEachNode((n) => n.setSelected(!!n.data && selectedSet.has(n.data.id)));
                }}
                onSelectionChanged={(e) => {
                  setSelectedLineIds(e.api.getSelectedRows().map((r) => r.id));
                  e.api.refreshCells({ columns: ['headComment'], force: true });
                }}
                onCellValueChanged={(e: CellValueChangedEvent<PromoLine>) => {
                  if (e.colDef.colId !== 'headComment' || !e.data) return;
                  const id = e.data.id;
                  setLineComments((prev) => ({ ...prev, [id]: (e.newValue as string) || '' }));
                }}
              />
            </div>
          )}
        </div>

        {/* Authoritative Totals KPI Bar (AU, AV, AW, AX) */}
        <div className="bg-slate-900 text-white rounded-xl shadow-md p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Total Volume (AU)
            </span>
            <span className="text-xl font-bold font-mono text-white mt-0.5 block">
              {(detailPromo.totalVolume || 0).toLocaleString()} units
            </span>
          </div>

          <div className="sm:pl-4">
            <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Forecast Revenue (AV)
            </span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">
              {formatZar(detailPromo.totalRevenue || 0)}
            </span>
          </div>

          <div className="sm:pl-4">
            <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Forecast Margin (AW)
            </span>
            <span
              className={`text-xl font-bold font-mono mt-0.5 block ${
                (detailPromo.totalMargin || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {formatZar(detailPromo.totalMargin || 0)}
            </span>
          </div>

          <div className="sm:pl-4">
            <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Blended Margin % (AX)
            </span>
            <span
              className={`text-xl font-bold font-mono mt-0.5 block ${
                (detailPromo.blendedMarginPercent || 0) < 10 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {detailPromo.blendedMarginPercent || 0}%
            </span>
          </div>
        </div>

        {/* Approval History Section */}
        {detailPromo.approvals && detailPromo.approvals.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-spar-green" />
              <h3 className="font-bold text-slate-800 text-sm">Approval & Governance Trail</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {detailPromo.approvals.map((appr) => (
                <div key={appr.id} className="py-2.5 flex items-start justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                          appr.action === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : appr.action === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {appr.action}
                      </span>
                      <span className="font-medium text-slate-800">
                        {appr.reviewer ? `${appr.reviewer.firstName} ${appr.reviewer.lastName}` : 'Reviewer'}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        ({appr.reviewer?.role || 'HEAD'})
                      </span>
                    </div>
                    {appr.comments && (
                      <p className="text-slate-600 text-xs italic pl-1">"{appr.comments}"</p>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {formatDate(appr.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sticky Action Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-6 shadow-xl z-40 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/head-review')}
          >
            Back to Queue
          </Button>

          <div className="flex items-center gap-3">
            {isPendingReview ? (
              <>
                <Button
                  variant="outline"
                  size="md"
                  className="text-rose-600 hover:bg-rose-50 border-rose-200"
                  leftIcon={<X className="w-4 h-4" />}
                  onClick={() => {
                    gridApiRef.current?.stopEditing();
                    setTargetPromo(detailPromo);
                    setRejectReason('');
                    setRejectError(null);
                    setIsRejectModalOpen(true);
                  }}
                >
                  Reject Submission
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="bg-spar-green hover:bg-spar-green-800 text-white px-6 font-bold"
                  leftIcon={<Check className="w-4 h-4" />}
                  disabled={lines.length > 0 && selectedLineIds.length === 0}
                  title={
                    lines.length > 0 && selectedLineIds.length === 0
                      ? 'Select at least one line, or use Reject to return the whole list'
                      : undefined
                  }
                  onClick={() => {
                    gridApiRef.current?.stopEditing();
                    setTargetPromo(detailPromo);
                    setIsApproveModalOpen(true);
                  }}
                >
                  {lines.length > 0 && selectedLineIds.length < lines.length
                    ? `Approve ${selectedLineIds.length} of ${lines.length} Lines`
                    : 'Approve Promo List'}
                </Button>
              </>
            ) : isApproved ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-spar-green" />
                This promo list has received Final Head Approval and is available for Marketing.
              </div>
            ) : isRejected ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 bg-rose-50 px-4 py-2 rounded-lg border border-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                This promo list was returned to Staff. Waiting for staff corrections and resubmission.
              </div>
            ) : null}
          </div>
        </div>

        {/* Approval Confirmation Modal */}
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => setIsApproveModalOpen(false)}
          title="Approve this promo list?"
          subtitle="Department Head Final Sign-off"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsApproveModalOpen(false)}
                disabled={isActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                isLoading={isActionLoading}
                disabled={targetPromo?.id === detailPromo?.id && unselectedMissingComment.length > 0}
                leftIcon={<Check className="w-4 h-4" />}
              >
                {targetPromo?.id === detailPromo?.id && unselectedLines.length > 0
                  ? `Approve ${selectedLineIds.length} Line(s)`
                  : 'Approve Promo List'}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            {targetPromo?.id === detailPromo?.id && unselectedLines.length > 0 ? (
              <>
                <p>
                  <strong className="text-emerald-800">{selectedLineIds.length} line(s)</strong> will be approved and
                  released to Marketing.{' '}
                  <strong className="text-rose-700">{unselectedLines.length} line(s)</strong> will be returned to Staff
                  as a new rejected list so they can fix and resubmit them.
                </p>
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 space-y-1.5 max-h-48 overflow-y-auto">
                  <div className="font-bold text-rose-900 text-[11px] uppercase tracking-wide">Returned to Staff</div>
                  {unselectedLines.map((l) => (
                    <div key={l.id} className="text-[11px]">
                      <span className="font-semibold text-slate-800">{lineLabel(l)}</span>
                      {': '}
                      {lineComments[l.id]?.trim() ? (
                        <span className="text-slate-700">{lineComments[l.id].trim()}</span>
                      ) : (
                        <span className="text-rose-600 font-semibold">comment missing</span>
                      )}
                    </div>
                  ))}
                </div>
                {unselectedMissingComment.length > 0 && (
                  <p className="text-rose-600 font-semibold">
                    Add a Head Comment to every unticked line before approving.
                  </p>
                )}
              </>
            ) : (
              <p>This will finalize the Head approval and make the promo list available to Marketing.</p>
            )}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 text-sm">{targetPromo?.promoCode}</div>
              <div className="text-slate-700">{targetPromo?.title}</div>
              <div className="text-slate-500 text-[11px]">
                Department: {targetPromo?.department?.name} • Lines: {targetPromo?.promoLines?.length || 0}
              </div>
            </div>
            <p className="text-slate-500">
              There is no further Director approval stage. Once confirmed, this decision cannot be undone.
            </p>
          </div>
        </Modal>

        {/* Rejection Modal */}
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Reject Promo List"
          subtitle="Return to Staff Submitter with Feedback"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
                onClick={handleReject}
                isLoading={isActionLoading}
                leftIcon={<X className="w-4 h-4" />}
              >
                Reject Promo List
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">
              Please provide a reason for rejection.
            </p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
              rows={4}
              placeholder="e.g., Margin on line 3 is below target threshold; please adjust promo price or request higher supplier rebate."
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError(null);
              }}
            />
            {targetPromo?.id === detailPromo?.id && Object.keys(nonEmptyLineComments()).length > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 max-h-40 overflow-y-auto">
                <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                  Your line comments (sent with the rejection)
                </div>
                {detailLines
                  .filter((l) => lineComments[l.id]?.trim())
                  .map((l) => (
                    <div key={l.id} className="text-[11px]">
                      <span className="font-semibold text-slate-800">{lineLabel(l)}</span>: {lineComments[l.id].trim()}
                    </div>
                  ))}
              </div>
            )}
            {rejectError && <p className="text-rose-600 font-semibold">{rejectError}</p>}
            <p className="text-slate-400 text-[11px]">
              This comment will be clearly presented to the Staff creator so they can make the necessary corrections and resubmit.
              {targetPromo?.id === detailPromo?.id && ' The overall reason is optional when you have commented on lines.'}
            </p>
          </div>
        </Modal>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LIST VIEW (Default / Queue)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      <PageHeader
        title="Head Review"
        description="Review and approve promotional lists submitted by your department."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Head Review' }]}
      />

      {/* Governance Banner: Head is Final Approver */}
      <div className="p-4 rounded-xl bg-[#007d32] text-white flex items-start gap-3.5 border border-[#00682a] shadow-md">
        <div className="p-2 rounded-lg bg-white/20 text-white mt-0.5 flex-shrink-0">
          <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white tracking-wide">
            Department Head Final Approval Queue (No Director Stage)
          </h4>
          <p className="text-xs text-white/90 mt-0.5 leading-relaxed font-normal">
            Logged in as <strong>{user?.firstName} {user?.lastName}</strong> ({user?.department?.name || 'Assigned Department'}). You have final sign-off authority for your department's promotional campaigns.
          </p>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-spar-green" />
            <span className="font-semibold">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => {
                setStatusFilter('SUBMITTED_TO_HEAD');
                setSearchParams({ status: 'SUBMITTED_TO_HEAD' });
              }}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                statusFilter === 'SUBMITTED_TO_HEAD'
                  ? 'bg-white text-spar-green-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Waiting for My Review
            </button>
            <button
              onClick={() => {
                setStatusFilter('APPROVED');
                setSearchParams({ status: 'APPROVED' });
              }}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                statusFilter === 'APPROVED'
                  ? 'bg-white text-spar-green-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => {
                setStatusFilter('REJECTED_BY_HEAD');
                setSearchParams({ status: 'REJECTED_BY_HEAD' });
              }}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                statusFilter === 'REJECTED_BY_HEAD'
                  ? 'bg-white text-spar-green-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSearchParams({ status: 'ALL' });
              }}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-white text-spar-green-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Promos
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={loadReviewList} isLoading={isLoadingList}>
            Refresh Queue
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by promo code, title, or creator..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-spar-green"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadReviewList()}
            />
          </div>

          {/* Promo Type Filter */}
          <div className="w-full sm:w-56">
            <select
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-spar-green text-slate-700"
              value={promoTypeFilter}
              onChange={(e) => setPromoTypeFilter(e.target.value)}
            >
              <option value="">All Promo Types</option>
              {promoTypeOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Review Queue List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoadingList ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 border-2 border-spar-green border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading departmental submissions...</p>
          </div>
        ) : listError ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">{listError}</p>
            <Button variant="outline" size="sm" onClick={loadReviewList}>
              Retry
            </Button>
          </div>
        ) : filteredPromos.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-50 text-spar-green rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">
              {statusFilter === 'SUBMITTED_TO_HEAD'
                ? 'No promo lists are waiting for your review.'
                : 'No promotional lists found.'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {statusFilter === 'SUBMITTED_TO_HEAD'
                ? 'All promotional submissions from your department have been reviewed or are in draft.'
                : 'Try adjusting your search criteria or filter options above.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Promo List</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Promo Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPromos.map((p) => {
                  const isPending = p.status === 'SUBMITTED_TO_HEAD';
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => navigate(`/head-review/${p.id}`)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 truncate max-w-[18rem] block" title={p.title}>
                          {p.title}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">{p.promoCode}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {p.department?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {p.creator ? `${p.creator.firstName} ${p.creator.lastName}` : 'Staff'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                        {p.submittedAt ? formatDate(p.submittedAt) : formatDate(p.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {promoTypeLabel(p.promoType)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/head-review/${p.id}`)}
                          >
                            Review
                          </Button>
                          {isPending && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                className="bg-spar-green hover:bg-spar-green-800"
                                leftIcon={<Check className="w-3.5 h-3.5" />}
                                onClick={() => {
                                  setTargetPromo(p);
                                  setIsApproveModalOpen(true);
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-rose-600 hover:bg-rose-50 border-rose-200"
                                leftIcon={<X className="w-3.5 h-3.5" />}
                                onClick={() => {
                                  setTargetPromo(p);
                                  setRejectReason('');
                                  setRejectError(null);
                                  setIsRejectModalOpen(true);
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal for List view */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve this promo list?"
        subtitle="Department Head Final Sign-off"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApproveModalOpen(false)}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              isLoading={isActionLoading}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Approve Promo List
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600">
          <p>This will finalize the Head approval and make the promo list available to Marketing.</p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 text-sm">{targetPromo?.promoCode}</div>
            <div className="text-slate-700">{targetPromo?.title}</div>
            <div className="text-slate-500 text-[11px]">
              Department: {targetPromo?.department?.name}
            </div>
          </div>
          <p className="text-slate-500">
            There is no further Director approval stage. Once confirmed, this decision cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Reject Modal for List view */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Promo List"
        subtitle="Return to Staff Submitter with Feedback"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectModalOpen(false)}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
              onClick={handleReject}
              isLoading={isActionLoading}
              leftIcon={<X className="w-4 h-4" />}
            >
              Reject Promo List
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Please provide a reason for rejection.</p>
          <textarea
            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
            rows={4}
            placeholder="e.g., Margin is below target; please adjust promo price or supplier rebate."
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (rejectError) setRejectError(null);
            }}
          />
          {rejectError && <p className="text-rose-600 font-semibold">{rejectError}</p>}
          <p className="text-slate-400 text-[11px]">
            This comment will be clearly presented to the Staff creator so they can make the necessary corrections and resubmit.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default HeadReview;
