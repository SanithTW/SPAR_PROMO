import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { AlertTriangle, Download, List as ListIcon, Search } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Button } from '../components/common/Button.js';
import { PromoLine, PromoList } from '../types/index.js';
import { fetchApprovedPromos, fetchDepartments } from '../services/promoService.js';
import { formatDate, formatZar } from '../utils/formatters.js';
import { promoTypeLabel } from '../utils/promoLinks.js';
import { useAuth } from '../contexts/AuthContext.js';

/** One grid row: a promo line together with the promo list it belongs to. */
interface ListRow extends Omit<PromoLine, 'promo'> {
  promo: PromoList;
}

const PAGE_SIZE = 100; // the largest page the approved-promos endpoint returns

/** Loads every approved promo list, following the pages until all are fetched. */
async function fetchAllApprovedPromos(): Promise<PromoList[]> {
  const first = await fetchApprovedPromos({ page: 1, pageSize: PAGE_SIZE });
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      fetchApprovedPromos({ page: i + 2, pageSize: PAGE_SIZE })
    )
  );
  return [first, ...rest].flatMap((p) => p.items);
}

const money = (p: { value: unknown }) => (p.value != null && p.value !== '' ? formatZar(p.value as number) : '—');
const percent = (p: { value: unknown }) => (p.value != null ? `${Number(p.value).toFixed(1)}%` : '—');
const words = (p: { value: unknown }) => (p.value ? String(p.value).replace(/_/g, ' ') : '—');

export const PromoLines: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  // Master Data users can see this page but not the Approved Promos page, so no link for them.
  const canOpenPromo = hasRole(['MARKETING', 'ADMIN']);
  const gridRef = useRef<AgGridReact<ListRow>>(null);

  const [promos, setPromos] = useState<PromoList[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPromos(await fetchAllApprovedPromos());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load promo lines.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetchDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, [load]);

  const rows = useMemo<ListRow[]>(
    () =>
      promos
        .filter((p) => !departmentId || p.departmentId === departmentId)
        .flatMap((promo) => (promo.promoLines ?? []).map((line) => ({ ...line, promo }))),
    [promos, departmentId]
  );

  const promoCount = useMemo(() => new Set(rows.map((r) => r.promo.id)).size, [rows]);

  const columnDefs = useMemo<ColDef<ListRow>[]>(
    () => [
      {
        headerName: 'Promo Code',
        field: 'promo.promoCode',
        width: 190,
        pinned: 'left',
        cellRenderer: (p: { data?: ListRow; value?: string }) =>
          !canOpenPromo ? (
            <span className="font-mono text-xs font-bold text-slate-800">{p.value}</span>
          ) : (
            <button
              type="button"
              className="font-mono text-xs font-bold text-[#007d32] hover:underline"
              onClick={() => p.data && navigate(`/approved-promos/${p.data.promo.id}`)}
              title="Open this promo list"
            >
              {p.value}
            </button>
          ),
      },
      {
        headerName: 'SKU',
        field: 'product.sku',
        width: 120,
        pinned: 'left',
        cellClass: 'font-mono',
      },
      {
        headerName: 'Product',
        field: 'product.name',
        width: 240,
        pinned: 'left',
        tooltipField: 'product.name',
      },
      {
        headerName: 'Promo List',
        field: 'promo.title',
        width: 220,
        tooltipField: 'promo.title',
      },
      {
        headerName: 'Department',
        colId: 'department',
        width: 120,
        // The API sends only departmentId, so look the name up in the department list.
        valueGetter: (p) =>
          p.data?.promo.department?.name ?? departments.find((d) => d.id === p.data?.promo.departmentId)?.name ?? '',
      },
      {
        headerName: 'Promo Type',
        field: 'promo.promoType',
        width: 150,
        valueFormatter: (p) => promoTypeLabel(p.value),
      },
      {
        headerName: 'Start',
        field: 'promo.startDate',
        width: 110,
        valueFormatter: (p) => formatDate(p.value),
      },
      {
        headerName: 'End',
        field: 'promo.endDate',
        width: 110,
        valueFormatter: (p) => formatDate(p.value),
      },
      {
        headerName: 'Barcode',
        field: 'product.barcode',
        width: 140,
        cellClass: 'font-mono',
      },
      { headerName: 'Category', field: 'product.category', width: 140 },
      { headerName: 'UOM', field: 'product.uom', width: 80 },
      {
        headerName: 'Normal Retail',
        field: 'product.retailPrice',
        width: 120,
        valueFormatter: money,
        cellClass: 'text-right font-mono',
      },
      {
        headerName: 'Promo Price',
        field: 'promoPrice',
        width: 120,
        valueFormatter: money,
        cellClass: 'text-right font-mono font-bold text-emerald-800',
      },
      {
        headerName: 'Discount %',
        field: 'discountPercent',
        width: 110,
        valueFormatter: percent,
        cellClass: 'text-right font-mono',
      },
      {
        headerName: 'Base Cost',
        field: 'product.baseCost',
        width: 110,
        valueFormatter: money,
        cellClass: 'text-right font-mono',
      },
      {
        headerName: 'Deal Cost',
        field: 'dealCost',
        width: 110,
        valueFormatter: money,
        cellClass: 'text-right font-mono',
      },
      {
        headerName: 'Rebate',
        field: 'rebateAmount',
        width: 100,
        valueFormatter: money,
        cellClass: 'text-right font-mono',
      },
      {
        headerName: 'Net Cost',
        field: 'netCost',
        width: 110,
        valueFormatter: money,
        cellClass: 'text-right font-mono',
      },
      {
        headerName: 'Margin %',
        field: 'marginPercent',
        width: 100,
        valueFormatter: percent,
        cellClass: (p) =>
          `text-right font-mono font-bold ${Number(p.value) < 10 ? 'text-rose-600' : 'text-emerald-700'}`,
      },
      {
        headerName: 'Est. Volume',
        field: 'estimatedVolume',
        width: 110,
        valueFormatter: (p) => (p.value != null ? Number(p.value).toLocaleString() : '—'),
        cellClass: 'text-right font-mono',
      },
      {
        headerName: 'Forecast Sales',
        field: 'forecastRevenue',
        width: 130,
        valueFormatter: money,
        cellClass: 'text-right font-mono',
      },
      {
        headerName: 'Forecast Margin',
        field: 'forecastMargin',
        width: 135,
        valueFormatter: money,
        cellClass: (p) => `text-right font-mono ${Number(p.value) < 0 ? 'text-rose-600' : ''}`,
      },
      {
        headerName: 'Mechanic',
        field: 'mechanic',
        width: 130,
        valueFormatter: words,
      },
      {
        headerName: 'Funding',
        field: 'fundingMechanism',
        width: 150,
        valueFormatter: words,
      },
      {
        headerName: 'Display',
        field: 'displayType',
        width: 140,
        valueFormatter: words,
      },
      {
        headerName: 'Feature Position',
        field: 'featurePosition',
        width: 140,
        valueFormatter: words,
      },
      {
        headerName: 'Co-op Support',
        field: 'coopSupport',
        width: 120,
        valueFormatter: money,
        cellClass: 'text-right font-mono',
      },
      {
        headerName: 'Notes',
        field: 'notes',
        width: 220,
        tooltipField: 'notes',
      },
    ],
    [navigate, departments, canOpenPromo]
  );

  const exportCsv = () =>
    gridRef.current?.api.exportDataAsCsv({
      fileName: `promo-lines-${new Date().toISOString().slice(0, 10)}.csv`,
      // Export the formatted values the user sees (labels, dates, money), not the raw codes.
      processCellCallback: (p) => {
        const col = p.column.getColDef();
        if (typeof col.valueFormatter === 'function') {
          return col.valueFormatter({
            ...p,
            data: p.node?.data,
            colDef: col,
          } as never) as string;
        }
        return p.value ?? '';
      },
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="List"
        description="Every product line from every approved promo list, in one table."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'List' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search any column: product, SKU, promo code, mechanic..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-spar-green text-slate-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="w-full sm:w-48 text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-spar-green text-slate-700"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {rows.length.toLocaleString()} line{rows.length === 1 ? '' : 's'} from {promoCount} promo list
          {promoCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 border-2 border-spar-green border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading promo lines...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-50 text-spar-green rounded-full flex items-center justify-center mx-auto mb-2">
              <ListIcon className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No promo lines yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Lines appear here as soon as a Department Head approves a promo list.
            </p>
          </div>
        ) : (
          <div className="ag-theme-quartz w-full" style={{ height: 'calc(100vh - 300px)', minHeight: 420 }}>
            <AgGridReact<ListRow>
              ref={gridRef}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={{ resizable: true, sortable: true, filter: true }}
              quickFilterText={search}
              getRowId={(p) => p.data.id}
              rowHeight={38}
              headerHeight={40}
              tooltipShowDelay={300}
              suppressRowClickSelection
            />
          </div>
        )}
      </div>
    </div>
  );
};
