import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { PageHeader } from '../components/layout/PageHeader.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { Button } from '../components/common/Button.js';
import { PromoList, PromoLine } from '../types/index.js';
import {
  fetchApprovedPromos,
  fetchApprovedPromoById,
  fetchPromoTypes,
  fetchDepartments,
  exportPromoExcel,
  exportPromoPdf,
} from '../services/promoService.js';
import { formatDate, formatZar } from '../utils/formatters.js';
import {
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  Search,
  Building2,
  Calendar,
  User,
  History,
  ShieldAlert,
  ArrowLeft,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

export const ApprovedPromos: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isMarketing, isAdmin } = useAuth();

  const activePromoId = id || null;

  // List View State
  const [promos, setPromos] = useState<PromoList[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10) || 1);
  const [pageSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get('departmentId') || '');
  const [promoTypeFilter, setPromoTypeFilter] = useState(searchParams.get('promoType') || '');
  const [startDateFilter, setStartDateFilter] = useState(searchParams.get('startDate') || '');
  const [endDateFilter, setEndDateFilter] = useState(searchParams.get('endDate') || '');

  // Master Data Options
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [promoTypeOptions, setPromoTypeOptions] = useState<{ code: string; name: string }[]>([]);

  // Detail View State
  const [detailPromo, setDetailPromo] = useState<PromoList | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [unauthorizedAccess, setUnauthorizedAccess] = useState(false);

  // Export State
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportType, setExportType] = useState<'excel' | 'pdf' | null>(null);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExportExcel = async (promoIdToExport: string, code: string) => {
    setExportingId(promoIdToExport);
    setExportType('excel');
    setExportMessage(null);
    try {
      await exportPromoExcel(promoIdToExport, `${code}_export.xlsx`);
      setExportMessage({ type: 'success', text: `Excel report for ${code} downloaded successfully.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Excel export failed.';
      setExportMessage({ type: 'error', text: msg });
    } finally {
      setExportingId(null);
      setExportType(null);
    }
  };

  const handleExportPdf = async (promoIdToExport: string, code: string) => {
    setExportingId(promoIdToExport);
    setExportType('pdf');
    setExportMessage(null);
    try {
      await exportPromoPdf(promoIdToExport, `${code}_report.pdf`);
      setExportMessage({ type: 'success', text: `PDF report for ${code} downloaded successfully.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PDF export failed.';
      setExportMessage({ type: 'error', text: msg });
    } finally {
      setExportingId(null);
      setExportType(null);
    }
  };

  // Load Master Filters (Departments & Promo Types)
  useEffect(() => {
    fetchPromoTypes()
      .then((types) => setPromoTypeOptions(types))
      .catch((err: unknown) => console.error('Failed to load promo types', err));

    if (isMarketing || isAdmin) {
      fetchDepartments()
        .then((depts: { id: string; name: string }[]) => setDepartments(depts))
        .catch((err: unknown) => console.error('Failed to load departments', err));
    }
  }, [isMarketing, isAdmin]);

  // Fetch Approved Promos List
  const loadApprovedList = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const response = await fetchApprovedPromos({
        search: searchQuery.trim() || undefined,
        departmentId: departmentFilter || undefined,
        promoType: promoTypeFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        page,
        pageSize,
      });

      setPromos(response.items || []);
      setTotalRecords(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load approved promotional lists.';
      setListError(msg);
    } finally {
      setIsLoadingList(false);
    }
  }, [searchQuery, departmentFilter, promoTypeFilter, startDateFilter, endDateFilter, page, pageSize]);

  useEffect(() => {
    if (!activePromoId) {
      loadApprovedList();
    }
  }, [activePromoId, loadApprovedList]);

  // Fetch Promo Detail if activePromoId is present
  const loadPromoDetail = useCallback(async (promoId: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    setUnauthorizedAccess(false);
    try {
      const promo = await fetchApprovedPromoById(promoId);
      setDetailPromo(promo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load approved promotional detail.';
      if (
        msg.includes('Unauthorized') ||
        msg.includes('outside your department') ||
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

  // Read-Only Column Definitions for AG Grid in Detail View
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
        cellClass: 'text-right font-mono font-bold text-emerald-800 bg-emerald-50/50',
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
    ];
  }, []);

  // Department Authorization Error Guard
  if (unauthorizedAccess) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Access Restricted"
          description="Department authorization security enforcement"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Approved Promos', href: '/approved-promos' },
            { label: 'Unauthorized' },
          ]}
        />
        <div className="max-w-2xl mx-auto p-8 bg-white border border-rose-200 rounded-2xl shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Department Access Restricted</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            You do not have permission to view approved promo lists outside your assigned department (
            <strong>{user?.department?.name || 'Assigned Department'}</strong>). Cross-department records are restricted to Marketing and Administrator roles.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/approved-promos')}
            >
              Return to Approved Promos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // DETAIL VIEW (/approved-promos/:id)
  // ---------------------------------------------------------------------------
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
            title="Approved Promo Not Found"
            breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Approved Promos', href: '/approved-promos' }]}
          />
          <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">
              {detailError || 'The requested approved promotional campaign was not found.'}
            </h3>
            <Button variant="outline" onClick={() => navigate('/approved-promos')}>
              Back to Approved Promos
            </Button>
          </div>
        </div>
      );
    }

    const lines = detailPromo.promoLines || [];

    return (
      <div className="space-y-6 pb-20">
        <PageHeader
          title={detailPromo.title}
          description={`Campaign Code: ${detailPromo.promoCode} • Department: ${detailPromo.department?.name || '—'} • Approved by Head: ${detailPromo.headApprover ? `${detailPromo.headApprover.firstName} ${detailPromo.headApprover.lastName}` : 'Department Head'}`}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Approved Promos', href: '/approved-promos' },
            { label: detailPromo.promoCode },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/approved-promos')}
              >
                Back to List
              </Button>
              <StatusBadge status="APPROVED" />
            </div>
          }
        />

        {/* Export Notification Toast */}
        {exportMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-sm ${
              exportMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {exportMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{exportMessage.text}</span>
            </div>
            <button
              onClick={() => setExportMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Read-Only Governance Banner */}
        <div className="p-4 rounded-xl bg-[#007d32] text-white flex items-start gap-3.5 border border-[#00682a] shadow-md">
          <div className="p-2 rounded-lg bg-white/20 text-white mt-0.5 flex-shrink-0">
            <Lock className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Final Approved State • Immutable & Ready for Marketing
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider text-white">
                Version {detailPromo.version || 1}
              </span>
            </h4>
            <p className="text-xs text-white/90 leading-relaxed font-normal">
              This promotional list has received final Head Approval. It is locked against modifications and represents the authoritative commercial agreement for store leaflet, magazine, and promotional distribution. No Director review is required.
            </p>
          </div>
        </div>

        {/* Promo Information Card */}
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
            <span className="text-slate-400 font-medium block">Active Promotional Period</span>
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

          <div className="col-span-2 sm:col-span-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-slate-400 font-medium block">Approved By (Final Approver)</span>
              <span className="font-semibold text-emerald-800 text-sm mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {detailPromo.headApprover
                  ? `${detailPromo.headApprover.firstName} ${detailPromo.headApprover.lastName}`
                  : 'Department Head'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Approval Timestamp</span>
              <span className="font-semibold text-slate-700 text-sm mt-0.5">
                {formatDate(detailPromo.headApprovedAt)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Governance Status</span>
              <span className="font-bold text-emerald-700 text-sm mt-0.5">
                APPROVED (Head Final Sign-Off)
              </span>
            </div>
          </div>
        </div>

        {/* Product Lines Read-Only Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-spar-green" />
              <h3 className="font-bold text-slate-900 text-sm">
                Approved Promotional Products ({lines.length} items)
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Read-Only Commercial Record</span>
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No product lines are present in this approved campaign.
            </div>
          ) : (
            <div className="ag-theme-quartz w-full" style={{ height: '420px' }}>
              <AgGridReact
                rowData={lines}
                columnDefs={lineColumnDefs}
                defaultColDef={{
                  resizable: true,
                  sortable: true,
                  filter: true,
                }}
                rowHeight={42}
                headerHeight={40}
                suppressRowClickSelection
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
              Total Promo Sales Value (AV)
            </span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">
              {formatZar(detailPromo.totalRevenue || 0)}
            </span>
          </div>

          <div className="sm:pl-4">
            <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Total Margin Value (AW)
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
              <h3 className="font-bold text-slate-800 text-sm">Approval Governance History</h3>
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
                  <span className="text-slate-400 text-[11px] font-mono">
                    {formatDate(appr.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Read-Only Action Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-6 shadow-xl z-40 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/approved-promos')}
          >
            Back to Approved Promos
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              isLoading={exportingId === detailPromo.id && exportType === 'excel'}
              disabled={!!exportingId}
              onClick={() => handleExportExcel(detailPromo.id, detailPromo.promoCode)}
            >
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileText className="w-4 h-4 text-rose-600" />}
              isLoading={exportingId === detailPromo.id && exportType === 'pdf'}
              disabled={!!exportingId}
              onClick={() => handleExportPdf(detailPromo.id, detailPromo.promoCode)}
            >
              Export PDF
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-spar-green" />
              Final Approved Promo • Ready for Marketing
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // LIST VIEW (/approved-promos)
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Promos"
        description="View promotional lists that have received final Head approval."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Approved Promos' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => alert('Batch export to Excel and PDF will be implemented in the Export phase.')}
          >
            Export All (Upcoming)
          </Button>
        }
      />

      {/* Export Notification Toast */}
      {exportMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-sm ${
            exportMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {exportMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{exportMessage.text}</span>
          </div>
          <button
            onClick={() => setExportMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Governance Banner */}
      <div className="p-4 rounded-xl bg-[#007d32] text-white flex items-start gap-3.5 border border-[#00682a] shadow-md">
        <div className="p-2 rounded-lg bg-white/20 text-white mt-0.5 flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white tracking-wide">
            Marketing & Commercial Release Repository
          </h4>
          <p className="text-xs text-white/90 mt-0.5 leading-relaxed font-normal">
            All records listed here have completed full governance and received sign-off from their respective Department Head. No secondary or Director review is required.
          </p>
        </div>
      </div>

      {/* Search and Server-Side Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by promo code, title, or creator..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-spar-green text-slate-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  loadApprovedList();
                }
              }}
            />
          </div>

          {/* Department Filter (Only for Marketing & Admin) */}
          {(isMarketing || isAdmin) && (
            <div className="w-full sm:w-48">
              <select
                className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-spar-green text-slate-700"
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Promo Type Filter */}
          <div className="w-full sm:w-48">
            <select
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-spar-green text-slate-700"
              value={promoTypeFilter}
              onChange={(e) => {
                setPromoTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Promo Types</option>
              {promoTypeOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <input
              type="date"
              className="text-xs py-2 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-spar-green text-slate-700"
              title="Filter by Promo Start Date (From)"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setPage(1);
              }}
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              className="text-xs py-2 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-spar-green text-slate-700"
              title="Filter by Promo End Date (To)"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPage(1);
              loadApprovedList();
            }}
            isLoading={isLoadingList}
          >
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Approved Promos Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoadingList ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 border-2 border-spar-green border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading approved promotional lists...</p>
          </div>
        ) : listError ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">{listError}</p>
            <Button variant="outline" size="sm" onClick={loadApprovedList}>
              Retry
            </Button>
          </div>
        ) : promos.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-50 text-spar-green rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">
              {isMarketing
                ? 'No promotional lists are currently available for Marketing.'
                : 'No approved promo lists yet.'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once a Department Head approves a submission, it will immediately appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Promo List</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Promo Type</th>
                    <th className="py-3 px-4">Created By</th>
                    <th className="py-3 px-4">Approved By</th>
                    <th className="py-3 px-4">Approval Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {promos.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => navigate(`/approved-promos/${p.id}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {p.promoCode}
                          </span>
                          <span className="font-semibold text-slate-800 truncate max-w-xs block">
                            {p.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {p.department?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 capitalize">
                        {p.promoType.replace('_', ' ').toLowerCase()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {p.creator ? `${p.creator.firstName} ${p.creator.lastName}` : 'Staff'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {p.headApprover ? `${p.headApprover.firstName} ${p.headApprover.lastName}` : 'Dept Head'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {p.headApprovedAt ? formatDate(p.headApprovedAt) : formatDate(p.updatedAt)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status="APPROVED" />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        v{p.version || 1}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 h-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                            title="Export Excel"
                            isLoading={exportingId === p.id && exportType === 'excel'}
                            disabled={!!exportingId}
                            onClick={() => handleExportExcel(p.id, p.promoCode)}
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 h-8 text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                            title="Export PDF"
                            isLoading={exportingId === p.id && exportType === 'pdf'}
                            disabled={!!exportingId}
                            onClick={() => handleExportPdf(p.id, p.promoCode)}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/approved-promos/${p.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="py-3 px-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} total records)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ApprovedPromos;
