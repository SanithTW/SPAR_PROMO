import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, CellValueChangedEvent } from 'ag-grid-community';
import { Button } from '../components/common/Button.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import {
  PromoList,
  PromoLine,
  Product,
  PromoTypeOption,
  PromoStatus,
  PromoType,
} from '../types/index.js';
import {
  fetchPromoById,
  fetchPromos,
  fetchPromoTypes,
  searchProducts,
  fetchProductSales,
  ProductSalesSummary,
  createPromo,
  updatePromo,
  submitPromoToHead,
  fillSpecialPromoExcelDirect,
} from '../services/promoService.js';
import { useAuth } from '../contexts/AuthContext.js';
import * as XLSX from 'xlsx';
import {
  Save,
  Send,
  Trash2,
  Search,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  X,
  Plus,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

/**
 * The search result that a typed code refers to. An exact product code wins, then an exact DC code,
 * then a product code missing its leading zeros (a 7-digit DC code padded to 8 digits can be a
 * different product's code, so the DC code is checked first), then a barcode.
 */
function findProductByCode(results: Product[], code: string): Product | undefined {
  return (
    results.find((p) => p.sku === code) ||
    results.find((p) => p.dcCode === code) ||
    results.find((p) => p.sku === code.padStart(8, '0')) ||
    results.find((p) => p.barcode === code)
  );
}

// Helper to parse dates from Excel rows (serial numbers, Date objects, or formatted strings)
function parseExcelDate(val: any, fallbackDate: string): string {
  if (!val) return fallbackDate;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      const d1 = parseInt(parts[0], 10);
      const d2 = parseInt(parts[1], 10);
      const year = parts[2];
      if (d1 > 12) {
        return `${year}-${String(d2).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
      } else {
        return `${year}-${String(d1).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
      }
    }
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return fallbackDate;
}

// Helper to parse discounts from Excel rows (handles decimals like 0.05 or percentages like 5 or 5%)
function parseDiscount(val: any, defaultVal = 0): number {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') {
    if (val > 0 && val < 1) return Number((val * 100).toFixed(2));
    return Number(val.toFixed(2));
  }
  const str = String(val).replace('%', '').trim();
  const num = parseFloat(str);
  if (isNaN(num)) return defaultVal;
  if (num > 0 && num < 1) return Number((num * 100).toFixed(2));
  return num;
}



/** 'YYYY-MM' -> 'Aug 2026' */
function monthLabel(ym?: string): string {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export const PromoEntry: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Master options
  const [, setPromoTypes] = useState<PromoTypeOption[]>([]);
  const [, setMyDrafts] = useState<PromoList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [promoId, setPromoId] = useState<string | null>(id || null);
  const [, setPromoCode] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [promoType, setPromoType] = useState<PromoType>('WEEKLY_LEAFLET');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<PromoStatus>('DRAFT');
  const [, setVersion] = useState<number>(1);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string>('');
  const [, setCreatedByName] = useState<string>('');

  // Promo Lines Grid State
  const [lines, setLines] = useState<PromoLine[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // 11 Input Fields State (Matching user workflow and Excel specifications)
  const [entryPromoType, setEntryPromoType] = useState('Monthly (2nd cycle)');
  const [entryFromDate, setEntryFromDate] = useState('2026-10-01');
  const [entryToDate, setEntryToDate] = useState('2026-10-31');
  const [entryDcCode, setEntryDcCode] = useState('');
  const [entryPosCode, setEntryPosCode] = useState('');
  const [entrySupDisc, setEntrySupDisc] = useState(5);
  const [entrySparDisc, setEntrySparDisc] = useState(5);
  const [entryOutlets, setEntryOutlets] = useState('All outlets (Default)');
  const [entryTabloid, setEntryTabloid] = useState('None');
  const [entryComment, setEntryComment] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [tableViewMode, setTableViewMode] = useState<'special' | 'aggrid'>('special');
  const [showDcSuggestions, setShowDcSuggestions] = useState(false);

  // Duration Calculation: (To - From + 1)
  const calculatedDurationDays = useMemo(() => {
    if (!entryFromDate || !entryToDate) return 1;
    const from = new Date(entryFromDate);
    const to = new Date(entryToDate);
    const diff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [entryFromDate, entryToDate]);

  // Active API product & sales state
  const [activeMasterProduct, setActiveMasterProduct] = useState<{
    posCode: string;
    barcode: string;
    desc: string;
    dept: string;
    subDept: string;
    pClass: string;
    segment: string;
    nmrp: number;
    margin: number;
    pack: number;
    supplierName?: string;
  } | null>(null);

  const [activeSalesMetrics, setActiveSalesMetrics] = useState<{
    previousMonth: number;
    lastYear: number;
    avg3Months: number;
    salesNet: number;
    productDesc?: string;
    periods?: ProductSalesSummary['periods'];
    totalQty?: number;
    totalTransactions?: number;
  }>({
    previousMonth: 0,
    lastYear: 0,
    avg3Months: 0,
    salesNet: 0,
  });

  const [isSearchingMaster, setIsSearchingMaster] = useState(false);
  const [, setIsSearchingSales] = useState(false);
  const [matchedApiProduct, setMatchedApiProduct] = useState<Product | null>(null);
  const [apiSuggestions, setApiSuggestions] = useState<Product[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const excelFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // 'loading' while the Sales API is queried, 'none' when the product has no sales history,
  // 'error' when the Sales API could not be reached.
  const [salesLookupState, setSalesLookupState] = useState<'idle' | 'loading' | 'ok' | 'none' | 'error'>('idle');
  // Guards against an older, slower sales response overwriting the product the user just selected.
  const latestSalesSkuRef = React.useRef<string | null>(null);

  // Populate form and fetch sales metrics when a product is selected
  const populateSelectedProduct = useCallback(async (prod: Product) => {
    if (latestSalesSkuRef.current === prod.sku) return; // already loaded / loading this product
    latestSalesSkuRef.current = prod.sku;
    setMatchedApiProduct(prod);
    const nmrp = Number(prod.retailPrice) || 0;
    const baseCost = Number(prod.baseCost) || 0;
    const margin = nmrp > 0 && baseCost > 0 ? Number(((nmrp - baseCost) / nmrp).toFixed(4)) : 0;
    const posCode = `P-${prod.sku.replace(/\D/g, '').slice(-5) || prod.sku}`;
    setEntryPosCode(posCode);

    setActiveMasterProduct({
      posCode,
      barcode: prod.barcode || '',
      desc: prod.name,
      dept: (prod as any).departmentName || prod.category || 'Fresh',
      subDept: (prod as any).subDepartment || prod.category || 'General',
      pClass: (prod as any).productClass || 'Standard',
      segment: (prod as any).segment || prod.category || 'General',
      nmrp,
      margin,
      pack: (prod as any).caseSize || 1,
      supplierName: (prod as any).supplierName || 'SPAR Retail Distributors',
    });

    // Query live Sales API for this SKU
    const emptyMetrics = { previousMonth: 0, lastYear: 0, avg3Months: 0, salesNet: 0 };
    setActiveSalesMetrics(emptyMetrics);
    setSalesLookupState('loading');
    setIsSearchingSales(true);
    try {
      const sales = await fetchProductSales(prod.sku);
      if (latestSalesSkuRef.current !== prod.sku) return; // user moved on to another product
      if (sales) {
        setActiveSalesMetrics({
          previousMonth: sales.previousMonthQty ?? 0,
          lastYear: sales.lastYearQty ?? 0,
          avg3Months: sales.avg3MonthsQty ?? 0,
          salesNet: sales.salesNet ?? sales.totalSalesValue ?? 0,
          productDesc: sales.productDesc,
          periods: sales.periods,
          totalQty: sales.totalQuantitySold,
          totalTransactions: sales.totalTransactions,
        });
        setSalesLookupState('ok');
      } else {
        setSalesLookupState('none');
      }
    } catch (err) {
      if (latestSalesSkuRef.current !== prod.sku) return;
      console.warn('Sales API query error:', err);
      setSalesLookupState('error');
      latestSalesSkuRef.current = null; // allow a retry (e.g. pressing Enter)
      setIsSearchingSales(false);
      return;
    } finally {
      if (latestSalesSkuRef.current === prod.sku) setIsSearchingSales(false);
    }
  }, []);

  // Trigger Product Master API & Sales API lookup for typed code
  const loadProductAndSalesData = useCallback(async (code: string) => {
    const clean = code.trim();
    if (!clean) {
      setActiveMasterProduct(null);
      setMatchedApiProduct(null); latestSalesSkuRef.current = null; setSalesLookupState('idle');
      setEntryPosCode('');
      setActiveSalesMetrics({
        previousMonth: 0,
        lastYear: 0,
        avg3Months: 0,
        salesNet: 0,
      });
      return;
    }

    setIsSearchingMaster(true);
    try {
      const searchResults = await searchProducts(clean);
      if (searchResults && searchResults.length > 0) {
        const found =
          findProductByCode(searchResults, clean) || (searchResults.length === 1 ? searchResults[0] : null);

        if (found) {
          await populateSelectedProduct(found);
        } else {
          setActiveMasterProduct(null);
          setMatchedApiProduct(null); latestSalesSkuRef.current = null; setSalesLookupState('idle');
          setEntryPosCode('');
          setActiveSalesMetrics({
            previousMonth: 0,
            lastYear: 0,
            avg3Months: 0,
            salesNet: 0,
          });
        }
      } else {
        setActiveMasterProduct(null);
        setMatchedApiProduct(null); latestSalesSkuRef.current = null; setSalesLookupState('idle');
        setEntryPosCode('');
        setActiveSalesMetrics({
          previousMonth: 0,
          lastYear: 0,
          avg3Months: 0,
          salesNet: 0,
        });
      }
    } catch (err) {
      console.warn('Product master search error:', err);
      setActiveMasterProduct(null);
      setMatchedApiProduct(null); latestSalesSkuRef.current = null; setSalesLookupState('idle');
      setEntryPosCode('');
      setActiveSalesMetrics({
        previousMonth: 0,
        lastYear: 0,
        avg3Months: 0,
        salesNet: 0,
      });
    } finally {
      setIsSearchingMaster(false);
    }
  }, [populateSelectedProduct]);

  // Initial load of Product Master SKUs on mount
  useEffect(() => {
    searchProducts('').then((res) => {
      if (res && res.length > 0) {
        setApiSuggestions(res);
      }
    }).catch(console.warn);
  }, []);

  // Debounced search against Product Master API as user types
  useEffect(() => {
    let isCancelled = false;
    const clean = entryDcCode.trim();

    const fetchSuggestions = async () => {
      setIsSearchingSuggestions(true);
      try {
        const results = await searchProducts(clean);
        if (!isCancelled) {
          setApiSuggestions(results || []);
          // If the user typed an exact product code, auto-select it!
          if (clean.length >= 2) {
            const exact = findProductByCode(results || [], clean);
            if (exact) {
              populateSelectedProduct(exact);
            } else {
              setActiveMasterProduct(null);
              setMatchedApiProduct(null); latestSalesSkuRef.current = null; setSalesLookupState('idle');
              setEntryPosCode('');
              setActiveSalesMetrics({
                previousMonth: 0,
                lastYear: 0,
                avg3Months: 0,
                salesNet: 0,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Product master search error:', err);
        if (!isCancelled) {
          setApiSuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingSuggestions(false);
        }
      }
    };

    const timer = setTimeout(fetchSuggestions, 120);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [entryDcCode, populateSelectedProduct]);

  // Handle DC Code change & lookup
  const handleDcCodeChange = (code: string) => {
    setEntryDcCode(code);
    setShowDcSuggestions(true);
    if (!code.trim()) {
      setActiveMasterProduct(null);
      setMatchedApiProduct(null); latestSalesSkuRef.current = null; setSalesLookupState('idle');
      setEntryPosCode('');
      setActiveSalesMetrics({
        previousMonth: 0,
        lastYear: 0,
        avg3Months: 0,
        salesNet: 0,
      });
    }
  };

  const handleDcCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (entryDcCode.trim()) {
        loadProductAndSalesData(entryDcCode.trim());
        setShowDcSuggestions(false);
      }
    }
  };

  const handleSelectProduct = (prod: Product) => {
    setEntryDcCode(prod.sku);
    setShowDcSuggestions(false);
    populateSelectedProduct(prod);
  };

  // Calculation function matching Special Promo Excel formulas
  const calculateSpecialPromoLineData = (params: {
    dc: string;
    pos: string;
    barcode: string;
    desc: string;
    dept: string;
    subDept: string;
    pClass: string;
    segment: string;
    nmrp: number;
    normalMargin: number;
    supDisc: number;
    sparDisc: number;
    promoType: string;
    fromDate: string;
    toDate: string;
    days: number;
    outlets: string;
    tabloid: string;
    comment: string;
    supplierName?: string;
    previousMonth?: number;
    lastYear?: number;
    avg3Months?: number;
    salesNet?: number;
  }) => {
    const nmrp = params.nmrp;
    const normalMargin = params.normalMargin;
    const supD = params.supDisc / 100;
    const sparD = params.sparDisc / 100;

    const finalCost = Number((nmrp - nmrp * (normalMargin + supD)).toFixed(2));
    const rawSellingPrice = Number((nmrp - nmrp * (sparD + supD)).toFixed(2));
    const roundedSellingPrice = Math.round(rawSellingPrice / 10) * 10;
    const roundingMargin =
      rawSellingPrice > 0 ? Number((((rawSellingPrice - roundedSellingPrice) / rawSellingPrice) * 100).toFixed(2)) : 0;
    const finalMargin =
      roundedSellingPrice > 0 ? Number((((roundedSellingPrice - finalCost) / roundedSellingPrice) * 100).toFixed(2)) : 0;
    const savingAmount = Number((nmrp - roundedSellingPrice).toFixed(2));
    const savingPercent = nmrp > 0 ? Number(((savingAmount / nmrp) * 100).toFixed(2)) : 0;

    const avg3Months = params.avg3Months ?? 0;
    const previousMonth = params.previousMonth ?? 0;
    const lastYear = params.lastYear ?? 0;
    const salesNet = params.salesNet ?? 0;

    const avgPromoQty = Number(((avg3Months / 30) * params.days).toFixed(2));
    const avgPromoValue = Number((avgPromoQty * nmrp).toFixed(2));
    const sparContribBase = Number((avgPromoQty * (nmrp * sparD)).toFixed(2));
    const incSales =
      normalMargin - sparD > 0 ? Number((sparContribBase / (nmrp * (normalMargin - sparD))).toFixed(2)) : 0;

    let salesIncPct = 0.15;
    const pTypeUpper = params.promoType.toUpperCase();
    const tabloidUpper = params.tabloid.toUpperCase();
    if (pTypeUpper.includes('WEHD')) salesIncPct = 0.5;
    else if (pTypeUpper.includes('REWARDS')) salesIncPct = 0.8;
    else if (tabloidUpper.includes('FRONT')) salesIncPct = 0.25;
    else if (tabloidUpper.includes('INSIDER')) salesIncPct = 0.2;

    const incSales5 = Number((avgPromoQty * 0.05).toFixed(2));
    const forecastedQty = Math.ceil(avgPromoQty + avgPromoQty * salesIncPct + incSales5);
    const forecastedValue = Number((forecastedQty * nmrp).toFixed(2));
    const totalSavings = Number((forecastedQty * savingAmount).toFixed(2));
    const supplierContrib = Number((forecastedQty * nmrp * supD).toFixed(2));
    const sparContrib = Number((totalSavings - supplierContrib).toFixed(2));

    return {
      food: params.dept,
      promoType: params.promoType,
      from: params.fromDate,
      to: params.toDate,
      days: params.days,
      dept: params.dept,
      subDept: params.subDept,
      pClass: params.pClass,
      segment: params.segment,
      dc: params.dc,
      pos: params.pos,
      barcode: params.barcode,
      desc: params.desc,
      status: 'ACTIVE',
      statusText: 'ACTIVE',
      nmrp,
      normalMargin,
      supDisc: params.supDisc,
      sparDisc: params.sparDisc,
      finalCost,
      sellingBeforeRound: rawSellingPrice,
      sellingAfterRound: roundedSellingPrice,
      roundingMargin,
      finalMargin,
      savingOnNmrp: savingAmount,
      savingOnMrpPct: savingPercent,
      supplierName: params.supplierName || 'SPAR Retail Distributors',
      comment: params.comment,
      rank: 1,
      avg3Months,
      previousMonth,
      lastYear,
      salesNet,
      depQty: 725,
      subDepQty: 2,
      productClassQty: 2,
      segmentRank: 1,
      avgPromoQty,
      avgPromoValue,
      sparContributionBase: sparContribBase,
      incSales,
      salesIncreasePct: Number((salesIncPct * 100).toFixed(0)),
      incSales5,
      forecastedQty,
      forecastedValue,
      totalSavings,
      supplierContribution: supplierContrib,
      sparContribution: sparContrib,
      outlets: params.outlets,
      tabloid: params.tabloid,
    };
  };

  // Add line using the 11 input fields
  const handleAdd11FieldLine = async () => {
    const dc = entryDcCode.trim();
    if (!dc) {
      setNotification({ type: 'warning', message: 'Please enter a DC Product Code.' });
      return;
    }

    let masterProduct = activeMasterProduct;
    let matchedProduct: Product | undefined = matchedApiProduct || undefined;

    if (!masterProduct || !matchedProduct) {
      try {
        const searchRes = await searchProducts(dc);
        if (searchRes && searchRes.length > 0) {
          matchedProduct =
            findProductByCode(searchRes, dc) || (searchRes.length === 1 ? searchRes[0] : undefined);
          if (matchedProduct) {
            await populateSelectedProduct(matchedProduct);
            const nmrp = Number(matchedProduct.retailPrice) || 0;
            const baseCost = Number(matchedProduct.baseCost) || 0;
            const margin = nmrp > 0 && baseCost > 0 ? Number(((nmrp - baseCost) / nmrp).toFixed(4)) : 0;
            masterProduct = {
              posCode: `P-${matchedProduct.sku.replace(/\D/g, '').slice(-5) || matchedProduct.sku}`,
              barcode: matchedProduct.barcode || '',
              desc: matchedProduct.name,
              dept: (matchedProduct as any).departmentName || matchedProduct.category || departmentName || 'Fresh',
              subDept: (matchedProduct as any).subDepartment || matchedProduct.category || 'General',
              pClass: (matchedProduct as any).productClass || 'Standard',
              segment: matchedProduct.category || 'General',
              nmrp,
              margin,
              pack: 1,
              supplierName: (matchedProduct as any).supplierName || 'SPAR Retail Distributors',
            };
          }
        }
      } catch {
        // Search error
      }
    }

    if (!masterProduct || !matchedProduct) {
      setNotification({
        type: 'error',
        message: `Product Code "${dc}" does not exist in Product Master. Please select a valid SKU from the Product Master list.`,
      });
      return;
    }

    const computed = calculateSpecialPromoLineData({
      // The product's real DC code from Product Master, not whatever was typed into the search box.
      dc: matchedProduct.dcCode || '',
      pos: entryPosCode || masterProduct.posCode,
      barcode: masterProduct.barcode,
      desc: masterProduct.desc,
      dept: masterProduct.dept,
      subDept: masterProduct.subDept,
      pClass: masterProduct.pClass,
      segment: masterProduct.segment,
      nmrp: masterProduct.nmrp,
      normalMargin: masterProduct.margin,
      supDisc: entrySupDisc,
      sparDisc: entrySparDisc,
      promoType: entryPromoType,
      fromDate: entryFromDate,
      toDate: entryToDate,
      days: calculatedDurationDays,
      outlets: entryOutlets,
      tabloid: entryTabloid,
      comment: entryComment,
      supplierName: masterProduct.supplierName,
      previousMonth: activeSalesMetrics.previousMonth,
      lastYear: activeSalesMetrics.lastYear,
      avg3Months: activeSalesMetrics.avg3Months,
      salesNet: activeSalesMetrics.salesNet,
    });

    const newLine: PromoLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: matchedProduct?.id || `prod-${dc}`,
      product: matchedProduct || {
        id: `prod-${dc}`,
        sku: dc,
        name: masterProduct.desc,
        barcode: masterProduct.barcode,
        category: masterProduct.dept,
        departmentId: user?.departmentId || 'dept-fresh',
        baseCost: masterProduct.nmrp * (1 - masterProduct.margin),
        retailPrice: masterProduct.nmrp,
        vatRate: 15.0,
        uom: 'EA',
        isActive: true,
      },
      promoPrice: computed.sellingAfterRound,
      dealCost: computed.finalCost,
      scanDiscount: 0,
      rebateAmount: 0,
      fundingMechanism:
        computed.supDisc > 0 && computed.sparDisc > 0
          ? 'JOINT_FUNDED'
          : computed.supDisc > 0
            ? 'SUPPLIER_FUNDED'
            : 'SPAR_FUNDED',
      estimatedVolume: computed.forecastedQty,
      mechanic: entryPromoType,
      displayType: entryTabloid !== 'None' ? 'Tabloid Feature' : 'Standard Shelf',
      featurePosition: entryTabloid,
      coopSupport: computed.supplierContribution,
      notes: entryComment || `Outlets: ${entryOutlets}, Feature: ${entryTabloid}`,
      discountAmount: computed.savingOnNmrp,
      discountPercent: computed.savingOnMrpPct,
      netCost: computed.finalCost,
      marginAmount: Number((computed.sellingAfterRound / 1.15 - computed.finalCost).toFixed(2)),
      marginPercent: computed.finalMargin,
      forecastRevenue: computed.forecastedValue,
      forecastMargin: Number((computed.finalCost * computed.forecastedQty).toFixed(2)),
      // Extended fields
      ...computed,
    };

    setLines((prev) => [newLine, ...prev]);
    setIsDirty(true);
    setEntryDcCode('');
    setEntryPosCode('');
    setActiveMasterProduct(null);
    setEntryComment('');
    setShowDcSuggestions(false);
    setNotification({
      type: 'success',
      message: `Added "${masterProduct.desc}" with complete 51-column Special Promo calculations.`,
    });
  };

  // Direct Fill and Export of "Special Promo - MB, TG - Sep 2026.xlsx"
  const handleFillSpecialExcel = async () => {
    if (lines.length === 0) {
      setNotification({
        type: 'warning',
        message: 'Please add at least one promotional line before filling the Special Promo Excel file.',
      });
      return;
    }

    setIsExportingExcel(true);
    try {
      await fillSpecialPromoExcelDirect(
        {
          lines,
          promoType: entryPromoType,
          fromDate: entryFromDate,
          toDate: entryToDate,
          title:
            title ||
            `${entryPromoType} - ${new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}`,
        },
        'Special Promo - MB, TG - Sep 2026.xlsx'
      );

      setNotification({
        type: 'success',
        message: `Special Promo - MB, TG - Sep 2026.xlsx has been filled with ${lines.length} promotional lines and downloaded!`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed to export Special Promo Excel: ${err.message || 'Unknown error'}`,
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Download blank/sample Excel template matching the required headers
  const handleDownloadTemplate = () => {
    const wsData = [
      ['Promo Type', 'From Date', 'To Date', 'ProCode', 'Product_Description', 'Supplier Disc %', 'SPAR Disc %'],
      ['Monthly (2nd cycle)', '2026-10-01', '2026-10-31', '00000014', 'RANCRIP CASSAVA CHIPS ORIGINAL 100G', 5, 5],
      ['Special Promo', '2026-10-01', '2026-10-31', '00000008', 'CAMPIONI PASTA LASAGNE PLAIN #96 250G', 5, 5],
      ['WEHD', '2026-10-01', '2026-10-31', '00000020', 'ANCHOR FRESH MILK BOTTLE 1L', 5, 5],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 42 },
      { wch: 16 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Promotion Lines');
    XLSX.writeFile(wb, 'SPAR_Promotion_Lines_Template.xlsx');
  };

  // Upload and parse Excel spreadsheet to populate promotional product lines
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingExcel(true);
    setNotification({ type: 'info', message: `Reading "${file.name}"...` });

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      if (!ws) {
        throw new Error('No worksheet found in the uploaded Excel file.');
      }

      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows || rows.length === 0) {
        throw new Error('The uploaded Excel file does not contain any data rows.');
      }

      const importedLines: PromoLine[] = [];
      let skippedCount = 0;
      setImportProgress({ current: 0, total: rows.length });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setImportProgress({ current: i + 1, total: rows.length });

        // Normalize header keys
        const normalizedRow: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          const normKey = k.toLowerCase().replace(/[\s_\-%]/g, '');
          normalizedRow[normKey] = v;
        }

        // Extract ProCode (matching user spreadsheet column 'ProCode')
        const rawProCode = String(
          normalizedRow['procode'] ||
          normalizedRow['productcode'] ||
          normalizedRow['dcproductcode'] ||
          normalizedRow['dccode'] ||
          normalizedRow['sku'] ||
          row['ProCode'] ||
          row['Product Code'] ||
          row['DC Product Code'] ||
          row['SKU'] ||
          ''
        ).trim();

        if (!rawProCode) {
          skippedCount++;
          continue;
        }

        const promoType = String(
          normalizedRow['promotype'] ||
          row['Promo Type'] ||
          entryPromoType ||
          'Special Promo'
        ).trim();

        const fromDateRaw = normalizedRow['fromdate'] || normalizedRow['from'] || row['From Date'] || entryFromDate;
        const toDateRaw = normalizedRow['todate'] || normalizedRow['to'] || row['To Date'] || entryToDate;

        const fromDate = parseExcelDate(fromDateRaw, entryFromDate);
        const toDate = parseExcelDate(toDateRaw, entryToDate);

        const durationDays = Math.max(
          1,
          Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        );

        const supDisc = parseDiscount(
          normalizedRow['supplierdisc'] ||
          normalizedRow['supplierdiscount'] ||
          row['Supplier Disc %'] ||
          row['Supplier Discount %'] ||
          row['Supplier Discount'],
          entrySupDisc
        );

        const sparDisc = parseDiscount(
          normalizedRow['spardisc'] ||
          normalizedRow['spardiscount'] ||
          row['SPAR Disc %'] ||
          row['SPAR Discount %'] ||
          row['SPAR Discount'],
          entrySparDisc
        );

        const descFromExcel = String(
          normalizedRow['productdescription'] ||
          normalizedRow['description'] ||
          row['Product_Description'] ||
          row['Product Description'] ||
          row['Description'] ||
          ''
        ).trim();

        const outlets = String(
          normalizedRow['outlets'] || row['Outlets'] || entryOutlets || 'All outlets'
        ).trim();

        const tabloid = String(
          normalizedRow['tabloidfeature'] ||
          normalizedRow['tabloid'] ||
          row['Tabloid Feature'] ||
          row['Tabloid'] ||
          entryTabloid ||
          'None'
        ).trim();

        const comment = String(
          normalizedRow['comment'] || row['Comment'] || entryComment || ''
        ).trim();

        // Product Master lookup
        let matchedProduct: Product | null = null;
        try {
          const searchResults = await searchProducts(rawProCode);
          if (searchResults && searchResults.length > 0) {
            matchedProduct = findProductByCode(searchResults, rawProCode) || searchResults[0];
          }
        } catch (searchErr) {
          console.warn(`Product lookup failed for ${rawProCode}:`, searchErr);
        }

        const sku = matchedProduct?.sku || rawProCode;
        const desc = matchedProduct?.name || descFromExcel || `Product ${rawProCode}`;
        const nmrp = Number(matchedProduct?.retailPrice) || 400;
        const baseCost = Number(matchedProduct?.baseCost) || Number((nmrp * 0.75).toFixed(2));
        const normalMargin = nmrp > 0 ? Number(((nmrp - baseCost) / nmrp).toFixed(4)) : 0.15;
        const posCode = `P-${sku.replace(/\D/g, '').slice(-5) || sku}`;
        const barcode = matchedProduct?.barcode || '';
        const dept = (matchedProduct as any)?.departmentName || matchedProduct?.category || departmentName || 'Fresh';
        const subDept = (matchedProduct as any)?.subDepartment || matchedProduct?.category || 'General';
        const pClass = (matchedProduct as any)?.productClass || 'Standard';
        const segment = matchedProduct?.category || 'General';
        const supplierName = (matchedProduct as any)?.supplierName || 'SPAR Retail Distributors';

        // Live Sales API lookup
        let previousMonth = 0;
        let lastYear = 0;
        let avg3Months = 0;
        let salesNet = 0;

        try {
          const sales = await fetchProductSales(sku);
          if (sales) {
            previousMonth = sales.previousMonthQty ?? 0;
            lastYear = sales.lastYearQty ?? 0;
            avg3Months = sales.avg3MonthsQty ?? 0;
            salesNet = sales.salesNet ?? sales.totalSalesValue ?? 0;
          }
        } catch {
          // Keep 0
        }

        // Calculate Special Promo Excel formulas
        const computed = calculateSpecialPromoLineData({
          dc: matchedProduct?.dcCode || '', // real DC code from Product Master
          pos: posCode,
          barcode,
          desc,
          dept,
          subDept,
          pClass,
          segment,
          nmrp,
          normalMargin,
          supDisc,
          sparDisc,
          promoType,
          fromDate,
          toDate,
          days: durationDays,
          outlets,
          tabloid,
          comment,
          supplierName,
          previousMonth,
          lastYear,
          avg3Months,
          salesNet,
        });

        const lineId = `line-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;
        const newLine: PromoLine = {
          id: lineId,
          productId: matchedProduct?.id || `prod-${sku}`,
          product: matchedProduct || {
            id: `prod-${sku}`,
            sku,
            name: desc,
            barcode,
            category: dept,
            departmentId: user?.departmentId || 'dept-fresh',
            baseCost,
            retailPrice: nmrp,
            vatRate: 15.0,
            uom: 'EA',
            isActive: true,
          },
          promoPrice: computed.sellingAfterRound,
          dealCost: computed.finalCost,
          scanDiscount: 0,
          rebateAmount: 0,
          fundingMechanism:
            computed.supDisc > 0 && computed.sparDisc > 0
              ? 'JOINT_FUNDED'
              : computed.supDisc > 0
                ? 'SUPPLIER_FUNDED'
                : 'SPAR_FUNDED',
          estimatedVolume: computed.forecastedQty,
          mechanic: promoType,
          displayType: tabloid !== 'None' ? 'Tabloid Feature' : 'Standard Shelf',
          featurePosition: tabloid,
          coopSupport: computed.supplierContribution,
          notes: comment || `Outlets: ${outlets}, Feature: ${tabloid}`,
          discountAmount: computed.savingOnNmrp,
          discountPercent: computed.savingOnMrpPct,
          netCost: computed.finalCost,
          marginAmount: Number((computed.sellingAfterRound / 1.15 - computed.finalCost).toFixed(2)),
          marginPercent: computed.finalMargin,
          forecastRevenue: computed.forecastedValue,
          forecastMargin: Number((computed.finalCost * computed.forecastedQty).toFixed(2)),
          ...computed,
        };

        importedLines.push(newLine);
      }

      if (importedLines.length === 0) {
        throw new Error('No valid promotion lines could be processed from the file.');
      }

      setLines((prev) => [...importedLines, ...prev]);
      setIsDirty(true);
      setNotification({
        type: 'success',
        message: `Successfully imported ${importedLines.length} promotion line(s) from "${file.name}"!${
          skippedCount > 0 ? ` (${skippedCount} blank rows skipped)` : ''
        }`,
      });
    } catch (err: any) {
      console.error('Excel upload error:', err);
      setNotification({
        type: 'error',
        message: `Failed to import Excel file: ${err.message || 'Invalid format'}`,
      });
    } finally {
      setIsImportingExcel(false);
      setImportProgress(null);
      if (e.target) e.target.value = '';
    }
  };



  // Sales History Modal State
  const [salesModalProduct, setSalesModalProduct] = useState<{ sku: string; name: string } | null>(null);
  const [salesSummary, setSalesSummary] = useState<ProductSalesSummary | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  const handleOpenSalesModal = async (sku: string, name: string) => {
    setSalesModalProduct({ sku, name });
    setIsLoadingSales(true);
    setSalesError(null);
    setSalesSummary(null);
    try {
      const summary = await fetchProductSales(sku);
      setSalesSummary(summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sales service is currently unavailable.';
      setSalesError(msg);
    } finally {
      setIsLoadingSales(false);
    }
  };

  // Modals / Feedback
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<string | null>(null);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // Permission checks based on Status
  const isEditable = status === 'DRAFT' || status === 'REJECTED_BY_HEAD' || status === 'REOPENED';

  // Format currency helper
  const formatZar = (val?: number | null) =>
    val !== undefined && val !== null && !isNaN(val) ? `R${Number(val).toFixed(2)}` : 'R0.00';

  // 1. Load initial data & promo if editing
  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      try {
        // Fetch active promo types
        const types = await fetchPromoTypes();
        setPromoTypes(types);

        // Fetch user's drafts for quick switcher
        const userPromos = await fetchPromos(undefined, user?.departmentId || undefined);
        setMyDrafts(userPromos);

        // If editing existing promo
        const targetId = id || searchParams.get('id');
        if (targetId) {
          await loadPromo(targetId);
        } else {
          // Defaults for new promo
          initNewPromo();
        }
      } catch (err: any) {
        console.error('Failed to initialize promo entry:', err);
        setNotification({
          type: 'error',
          message: err.message || 'Unable to load promotional data.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    initData();
  }, [id, searchParams]);

  // Load promo details
  const loadPromo = async (promoListId: string) => {
    try {
      const p = await fetchPromoById(promoListId);
      setPromoId(p.id);
      setPromoCode(p.promoCode);
      setTitle(p.title);
      setPromoType(p.promoType);
      setStartDate(p.startDate ? p.startDate.split('T')[0] : '');
      setEndDate(p.endDate ? p.endDate.split('T')[0] : '');
      setNotes(p.notes || '');
      setStatus(p.status);
      setVersion(p.version || 1);
      setRejectionReason(p.rejectionReason || null);
      setDepartmentName(p.department?.name || user?.department?.name || 'Fresh');
      setCreatedByName(
        p.creator ? `${p.creator.firstName} ${p.creator.lastName}` : user?.name || ''
      );

      // Map lines with authoritative metrics
      const mappedLines: PromoLine[] = (p.promoLines || []).map((l) => recalculateLine(l));
      setLines(mappedLines);
      setIsDirty(false);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed to load promo: ${err.message}`,
      });
    }
  };

  // Initialize a new draft
  const initNewPromo = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    setPromoId(null);
    setPromoCode('Auto-generated on Save');
    setTitle('');
    setPromoType('WEEKLY_LEAFLET');
    setStartDate(nextWeek.toISOString().split('T')[0]);
    setEndDate(inTwoWeeks.toISOString().split('T')[0]);
    setNotes('');
    setStatus('DRAFT');
    setVersion(1);
    setRejectionReason(null);
    setDepartmentName(user?.department?.name || 'Fresh');
    setCreatedByName(user?.name || '');
    setLines([]);
    setIsDirty(false);
  };

  // Recalculate line metrics on client for dynamic instant feedback
  const recalculateLine = (line: PromoLine): PromoLine => {
    const normalRetail = Number(line.product?.retailPrice) || 0;
    const baseCost = Number(line.product?.baseCost) || 0;
    const prodVat = line.product?.vatRate;
    const vatRate = prodVat !== undefined && prodVat !== null && !isNaN(Number(prodVat)) ? Number(prodVat) : 15.0;
    const promoPrice = Number(line.promoPrice) || 0;
    const volume = Number(line.estimatedVolume) || 0;

    const discountAmount = Math.max(0, Number((normalRetail - promoPrice).toFixed(2)));
    const discountPercent =
      normalRetail > 0 ? Number((((normalRetail - promoPrice) / normalRetail) * 100).toFixed(2)) : 0;

    let netCost: number;
    if (line.dealCost !== undefined && line.dealCost !== null && !isNaN(Number(line.dealCost))) {
      netCost = Math.max(0, Number(Number(line.dealCost).toFixed(2)));
    } else {
      const rebate = Number(line.rebateAmount) || 0;
      netCost = Math.max(0, Number((baseCost - rebate).toFixed(2)));
    }

    const vatMultiplier = 1 + vatRate / 100;
    const retailExclVat = promoPrice > 0 ? promoPrice / vatMultiplier : 0;
    const marginAmount = Number((retailExclVat - netCost).toFixed(2));
    const marginPercent =
      retailExclVat > 0 ? Number(((marginAmount / retailExclVat) * 100).toFixed(2)) : 0;

    const forecastRevenue = Number((promoPrice * volume).toFixed(2));
    const forecastMargin = Number((marginAmount * volume).toFixed(2));

    return {
      ...line,
      discountAmount,
      discountPercent,
      netCost,
      marginAmount,
      marginPercent,
      forecastRevenue,
      forecastMargin,
    };
  };

  // Real-time calculation of totals
  const totals = useMemo(() => {
    let totalVolume = 0;
    let totalRevenue = 0;
    let totalMargin = 0;
    let totalRevenueExclVat = 0;

    for (const line of lines) {
      const vol = Number(line.estimatedVolume) || 0;
      const rev = Number(line.forecastRevenue) || 0;
      const mar = Number(line.forecastMargin) || 0;
      const prodVat = line.product?.vatRate;
      const vatRate = prodVat !== undefined && prodVat !== null && !isNaN(Number(prodVat)) ? Number(prodVat) : 15.0;

      totalVolume += vol;
      totalRevenue += rev;
      totalMargin += mar;
      if (rev > 0) {
        totalRevenueExclVat += rev / (1 + vatRate / 100);
      }
    }

    const blendedMarginPercent =
      totalRevenueExclVat > 0
        ? Number(((totalMargin / totalRevenueExclVat) * 100).toFixed(2))
        : 0;

    return {
      count: lines.length,
      totalVolume,
      totalRevenue,
      totalMargin,
      blendedMarginPercent,
    };
  }, [lines]);


  // Remove line handler
  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    setIsDirty(true);
    setLineToDelete(null);
  };

  // Cell edit listener
  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      const updatedRow = event.data as PromoLine;
      const recalculated = recalculateLine(updatedRow);

      setLines((prev) =>
        prev.map((l) => (l.id === recalculated.id ? recalculated : l))
      );
      setIsDirty(true);
    },
    []
  );

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    return [
      // Master Data (Read-only)
      {
        headerName: '#',
        valueGetter: (params) => (params.node ? (params.node.rowIndex ?? 0) + 1 : 1),
        width: 50,
        pinned: 'left',
        cellClass: 'cell-readonly text-center font-medium text-slate-500',
      },
      {
        headerName: 'Product Code / SKU',
        field: 'product.sku',
        width: 140,
        pinned: 'left',
        cellClass: 'cell-readonly font-mono font-semibold text-spar-green',
      },
      {
        headerName: 'Product Description',
        field: 'product.name',
        width: 220,
        pinned: 'left',
        cellClass: 'cell-readonly font-medium text-slate-900',
      },
      {
        headerName: 'Barcode',
        field: 'product.barcode',
        width: 120,
        cellClass: 'cell-readonly font-mono text-slate-500 text-xs',
      },
      {
        headerName: 'Category',
        field: 'product.category',
        width: 130,
        cellClass: 'cell-readonly text-slate-600 text-xs',
      },
      {
        headerName: 'UOM',
        field: 'product.uom',
        width: 70,
        cellClass: 'cell-readonly text-center text-slate-500 font-mono text-xs',
      },
      {
        headerName: 'Base Cost',
        field: 'product.baseCost',
        width: 100,
        cellClass: 'cell-readonly text-right font-mono text-xs',
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'Normal Retail',
        field: 'product.retailPrice',
        width: 110,
        cellClass: 'cell-readonly text-right font-mono font-semibold text-slate-700 text-xs',
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'VAT %',
        field: 'product.vatRate',
        width: 80,
        cellClass: 'cell-readonly text-center font-mono text-xs',
        valueFormatter: (p) => `${p.value}%`,
      },

      // 11 Editable Input Columns
      {
        headerName: 'Promo Retail (R) *',
        field: 'promoPrice',
        width: 130,
        editable: () => isEditable,
        cellClass: () =>
          isEditable
            ? 'cell-editable text-right font-mono font-bold text-spar-red bg-amber-50/50'
            : 'cell-readonly text-right font-mono',
        valueParser: (p) => Number(p.newValue) || 0,
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'Deal Cost (R)',
        field: 'dealCost',
        width: 110,
        editable: () => isEditable,
        cellClass: () =>
          isEditable ? 'cell-editable text-right font-mono' : 'cell-readonly text-right font-mono',
        valueParser: (p) => (p.newValue ? Number(p.newValue) : null),
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'Scan Disc. (R)',
        field: 'scanDiscount',
        width: 110,
        editable: () => isEditable,
        cellClass: () =>
          isEditable ? 'cell-editable text-right font-mono' : 'cell-readonly text-right font-mono',
        valueParser: (p) => Number(p.newValue) || 0,
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'Rebate (R)',
        field: 'rebateAmount',
        width: 100,
        editable: () => isEditable,
        cellClass: () =>
          isEditable ? 'cell-editable text-right font-mono' : 'cell-readonly text-right font-mono',
        valueParser: (p) => Number(p.newValue) || 0,
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'Funding',
        field: 'fundingMechanism',
        width: 140,
        editable: () => isEditable,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['SUPPLIER_FUNDED', 'SPAR_FUNDED', 'JOINT_FUNDED'],
        },
        cellClass: () => (isEditable ? 'cell-editable text-xs' : 'cell-readonly text-xs'),
      },
      {
        headerName: 'Est. Volume (Units) *',
        field: 'estimatedVolume',
        width: 130,
        editable: () => isEditable,
        cellClass: () =>
          isEditable
            ? 'cell-editable text-right font-mono font-bold bg-amber-50/50'
            : 'cell-readonly text-right font-mono',
        valueParser: (p) => parseInt(p.newValue, 10) || 0,
        valueFormatter: (p) => Number(p.value || 0).toLocaleString(),
      },
      {
        headerName: 'Mechanic',
        field: 'mechanic',
        width: 120,
        editable: () => isEditable,
        cellClass: () => (isEditable ? 'cell-editable text-xs' : 'cell-readonly text-xs'),
      },
      {
        headerName: 'Placement',
        field: 'displayType',
        width: 130,
        editable: () => isEditable,
        cellClass: () => (isEditable ? 'cell-editable text-xs' : 'cell-readonly text-xs'),
      },
      {
        headerName: 'Leaflet Pos.',
        field: 'featurePosition',
        width: 110,
        editable: () => isEditable,
        cellClass: () => (isEditable ? 'cell-editable text-xs' : 'cell-readonly text-xs'),
      },
      {
        headerName: 'Co-op (R)',
        field: 'coopSupport',
        width: 100,
        editable: () => isEditable,
        cellClass: () =>
          isEditable ? 'cell-editable text-right font-mono' : 'cell-readonly text-right font-mono',
        valueParser: (p) => Number(p.newValue) || 0,
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'Notes',
        field: 'notes',
        width: 160,
        editable: () => isEditable,
        cellClass: () => (isEditable ? 'cell-editable text-xs' : 'cell-readonly text-xs'),
      },

      // Calculated / Read-Only Columns
      {
        headerName: 'Disc. (R)',
        field: 'discountAmount',
        width: 100,
        cellClass: 'cell-readonly text-right font-mono text-emerald-700 font-semibold text-xs',
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'Disc. %',
        field: 'discountPercent',
        width: 90,
        cellClass: 'cell-readonly text-right font-mono text-emerald-700 font-semibold text-xs',
        valueFormatter: (p) => `${p.value || 0}%`,
      },
      {
        headerName: 'Net Cost (R)',
        field: 'netCost',
        width: 110,
        cellClass: 'cell-readonly text-right font-mono text-slate-600 text-xs',
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'Promo Margin (R)',
        field: 'marginAmount',
        width: 120,
        cellClass: (p) =>
          `cell-readonly text-right font-mono font-semibold text-xs ${Number(p.value) < 0 ? 'text-rose-600' : 'text-slate-800'
          }`,
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'Promo Margin %',
        field: 'marginPercent',
        width: 120,
        cellClass: (p) =>
          `cell-readonly text-right font-mono font-semibold text-xs ${Number(p.value) < 10 ? 'text-rose-600' : 'text-emerald-700'
          }`,
        valueFormatter: (p) => `${p.value || 0}%`,
      },
      {
        headerName: 'Forecast Rev (R)',
        field: 'forecastRevenue',
        width: 130,
        cellClass: 'cell-readonly text-right font-mono font-bold text-slate-900 text-xs',
        valueFormatter: (p) => formatZar(p.value),
      },
      {
        headerName: 'Forecast Profit (R)',
        field: 'forecastMargin',
        width: 130,
        cellClass: (p) =>
          `cell-readonly text-right font-mono font-bold text-xs ${Number(p.value) < 0 ? 'text-rose-600' : 'text-emerald-700'
          }`,
        valueFormatter: (p) => formatZar(p.value),
      },

      // POS Sales Stats Column
      {
        headerName: 'Sales Data',
        field: 'product.sku',
        width: 105,
        pinned: 'right',
        cellClass: 'text-center cell-readonly',
        cellRenderer: (params: any) => {
          const sku = params.data?.product?.sku || params.value;
          const name = params.data?.product?.name || 'Product';
          return (
            <button
              onClick={() => handleOpenSalesModal(sku, name)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              title="View POS Sales Performance"
            >
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              Sales Stats
            </button>
          );
        },
      },

      // Action Column
      {
        headerName: 'Action',
        field: 'id',
        width: 75,
        pinned: 'right',
        cellClass: 'text-center cell-readonly',
        cellRenderer: (params: any) => {
          if (!isEditable) return null;
          return (
            <button
              onClick={() => setLineToDelete(params.value)}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Remove item"
            >
              <Trash2 className="w-4 h-4 inline" />
            </button>
          );
        },
      },
    ];
  }, [isEditable]);

  // Validation before Save or Submit
  const validateForm = (isSubmittingAction = false): string | null => {
    const effStart = startDate || entryFromDate;
    const effEnd = endDate || entryToDate;

    if (effStart && effEnd && new Date(effEnd) < new Date(effStart)) {
      return 'End date cannot be earlier than start date.';
    }

    if (isSubmittingAction) {
      if (lines.length === 0) {
        return 'Add at least one product before submitting to Head.';
      }
      for (const l of lines) {
        if (!l.promoPrice || Number(l.promoPrice) <= 0) {
          return `Product "${l.product?.name || l.productId}" must have a promo price greater than 0.`;
        }
      }
    }
    return null;
  };

  // 12. Save Draft Handler
  const handleSaveDraft = async () => {
    const error = validateForm(false);
    if (error) {
      setNotification({ type: 'warning', message: error });
      return;
    }

    setIsSaving(true);
    setNotification(null);

    const effTitle =
      title.trim() ||
      `${entryPromoType} - ${new Date(entryFromDate).toLocaleString('default', { month: 'short', year: 'numeric' })}`;
    const effStartDate = startDate || entryFromDate;
    const effEndDate = endDate || entryToDate;

    try {
      const payload = {
        title: effTitle,
        promoType,
        startDate: effStartDate,
        endDate: effEndDate,
        notes: notes || entryComment || 'Created via Promo Entry',
        lines: lines.map((l) => ({
          productId: l.productId,
          promoPrice: Number(l.promoPrice),
          dealCost: l.dealCost !== undefined && l.dealCost !== null ? Number(l.dealCost) : null,
          scanDiscount: l.scanDiscount !== undefined && l.scanDiscount !== null ? Number(l.scanDiscount) : 0,
          fundingMechanism: l.fundingMechanism || 'SUPPLIER_FUNDED',
          rebateAmount: l.rebateAmount !== undefined && l.rebateAmount !== null ? Number(l.rebateAmount) : 0,
          estimatedVolume: l.estimatedVolume !== undefined && l.estimatedVolume !== null ? Number(l.estimatedVolume) : 0,
          mechanic: l.mechanic || entryPromoType,
          displayType: l.displayType || (entryTabloid !== 'None' ? 'Tabloid Feature' : 'Standard Shelf'),
          featurePosition: l.featurePosition || entryTabloid,
          coopSupport: l.coopSupport !== undefined && l.coopSupport !== null ? Number(l.coopSupport) : 0,
          notes: l.notes || null,
        })),
      };

      let saved: PromoList;
      if (promoId) {
        saved = await updatePromo(promoId, payload);
      } else {
        saved = await createPromo(payload);
        setPromoId(saved.id);
        setPromoCode(saved.promoCode);
      }

      setIsDirty(false);
      setNotification({
        type: 'success',
        message: 'Promo list saved as draft.',
      });

      // Update quick drafts list
      const updatedDrafts = await fetchPromos(undefined, user?.departmentId || undefined);
      setMyDrafts(updatedDrafts);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to save promo list.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 13 & 14. Submit to Head Handler
  const handleSubmitToHead = async () => {
    const error = validateForm(true);
    if (error) {
      setNotification({ type: 'warning', message: error });
      return;
    }

    // If draft has unsaved changes, save first
    setIsSubmitting(true);
    setNotification(null);

    const effTitle =
      title.trim() ||
      `${entryPromoType} - ${new Date(entryFromDate).toLocaleString('default', { month: 'short', year: 'numeric' })}`;
    const effStartDate = startDate || entryFromDate;
    const effEndDate = endDate || entryToDate;

    try {
      let currentId = promoId;

      // Save draft first if new or dirty
      if (!currentId || isDirty) {
        const payload = {
          title: effTitle,
          promoType,
          startDate: effStartDate,
          endDate: effEndDate,
          notes: notes || entryComment || 'Created via Promo Entry',
          lines: lines.map((l) => ({
            productId: l.productId,
            promoPrice: Number(l.promoPrice),
            dealCost: l.dealCost !== undefined && l.dealCost !== null ? Number(l.dealCost) : null,
            scanDiscount: l.scanDiscount !== undefined && l.scanDiscount !== null ? Number(l.scanDiscount) : 0,
            fundingMechanism: l.fundingMechanism || 'SUPPLIER_FUNDED',
            rebateAmount: l.rebateAmount !== undefined && l.rebateAmount !== null ? Number(l.rebateAmount) : 0,
            estimatedVolume: l.estimatedVolume !== undefined && l.estimatedVolume !== null ? Number(l.estimatedVolume) : 0,
            mechanic: l.mechanic || entryPromoType,
            displayType: l.displayType || (entryTabloid !== 'None' ? 'Tabloid Feature' : 'Standard Shelf'),
            featurePosition: l.featurePosition || entryTabloid,
            coopSupport: l.coopSupport !== undefined && l.coopSupport !== null ? Number(l.coopSupport) : 0,
            notes: l.notes || null,
          })),
        };

        if (currentId) {
          await updatePromo(currentId, payload);
        } else {
          const created = await createPromo(payload);
          currentId = created.id;
          setPromoId(created.id);
          setPromoCode(created.promoCode);
        }
      }

      // Execute Submit Workflow transition
      const submitted = await submitPromoToHead(currentId!);
      setStatus(submitted.status);
      setVersion(submitted.version);
      setIsDirty(false);
      setConfirmSubmitOpen(false);

      setNotification({
        type: 'success',
        message: 'Promo list submitted successfully.',
      });

      // Smooth navigation back to Dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Submission failed.',
      });
      setConfirmSubmitOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-spar-green border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-600">Loading promotional workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Page Header matching screenshot */}
      <div className="pt-0.5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">New Promo List</h1>
        <p className="text-xs text-slate-500 mt-0.5">Create and prepare a promotional list for Head review.</p>
      </div>

      {/* Toast Notification Banner */}
      {/* Head feedback on a rejected / returned list (includes per-line comments) */}
      {status === 'REJECTED_BY_HEAD' && rejectionReason && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="block font-bold uppercase tracking-wide text-[11px] text-rose-800">
              Returned by Department Head — please correct and resubmit
            </span>
            <p className="mt-1 whitespace-pre-line text-rose-950">{rejectionReason}</p>
          </div>
        </div>
      )}

      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between shadow-xs animate-fade-in ${notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
            {notification.type === 'warning' && <Info className="w-4 h-4 text-amber-600" />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ==================== 5. DEPT STAFF INPUT (11 INPUT FIELDS ONLY) ==================== */}
      {isEditable && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          {/* Card Header matching screenshot with Excel Upload actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Add a product to this promo list</h3>
                <p className="text-xs text-slate-500">
                  Pick the promo dates, find the product, enter the discounts, then click “Add to Promo List”.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className="text-xs text-slate-500 font-medium whitespace-nowrap"
                title="Counted from the From date to the To date, including both days"
              >
                Runs for{' '}
                <strong className="text-emerald-700 font-bold">
                  {calculatedDurationDays} day{calculatedDurationDays === 1 ? '' : 's'}
                </strong>
              </span>

              {/* Excel Upload and Template Actions */}
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <input
                  type="file"
                  ref={excelFileInputRef}
                  onChange={handleExcelFileUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  title="Download blank Excel template matching required headers"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Template</span>
                </button>
                <button
                  type="button"
                  disabled={isImportingExcel}
                  onClick={() => excelFileInputRef.current?.click()}
                  title="Upload Excel spreadsheet to populate promotion lines automatically"
                  className="px-3 py-1.5 rounded-lg bg-[#007d32] hover:bg-[#006829] active:bg-[#005722] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isImportingExcel ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Upload Excel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Import Progress Bar (if active) */}
          {isImportingExcel && importProgress && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                <div>
                  <span className="font-bold text-emerald-900">Importing Excel Lines:</span>{' '}
                  <span className="text-emerald-800">
                    Processing row {importProgress.current} of {importProgress.total}... querying Product Master & Sales metrics
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-emerald-800">
                {Math.round((importProgress.current / importProgress.total) * 100)}%
              </span>
            </div>
          )}

          {/* 11 Input Fields Grid */}
          <div className="grid grid-cols-12 gap-3 items-end">
            {/* 1. Promo Type */}
            <div className="col-span-12 sm:col-span-4 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Promo Type</label>
              <select
                value={entryPromoType}
                onChange={(e) => setEntryPromoType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="Special Promo">Special Promo</option>
                <option value="Monthly (1st cycle)">Monthly (1st cycle)</option>
                <option value="Monthly (2nd cycle)">Monthly (2nd cycle)</option>
                <option value="Rewards">Rewards</option>
                <option value="WEHD">WEHD</option>
                <option value="Stock Clearance">Stock Clearance</option>
                <option value="Celeste">Celeste</option>
              </select>
            </div>

            {/* 2. From Date */}
            <div className="col-span-6 sm:col-span-4 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">From Date</label>
              <input
                type="date"
                value={entryFromDate}
                onChange={(e) => setEntryFromDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* 3. To Date */}
            <div className="col-span-6 sm:col-span-4 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">To Date</label>
              <input
                type="date"
                value={entryToDate}
                onChange={(e) => setEntryToDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* 4. Product Code / Search Master */}
            <div className="col-span-12 sm:col-span-6 md:col-span-3 relative">
              <label className="block text-xs font-bold text-emerald-700 mb-1.5">
                Product Code / Search Master
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={entryDcCode}
                  onChange={(e) => handleDcCodeChange(e.target.value)}
                  onFocus={() => setShowDcSuggestions(true)}
                  onKeyDown={handleDcCodeKeyDown}
                  placeholder="Product code, DC code or product name"
                  className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Product Master API Live Picker Dropdown */}
              {showDcSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                  <div className="p-2 bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center justify-between sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Product Master SKUs ({apiSuggestions.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDcSuggestions(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {isSearchingSuggestions ? (
                    <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Searching Product Master API...</span>
                    </div>
                  ) : apiSuggestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No products found in Product Master
                    </div>
                  ) : (
                    apiSuggestions.map((prod) => (
                      <div
                        key={prod.id || prod.sku}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectProduct(prod);
                        }}
                        className="p-2 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-mono font-bold text-emerald-800">{prod.sku}</span>
                            {prod.dcCode && (
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 rounded px-1">
                                DC {prod.dcCode}
                              </span>
                            )}
                            <span className="text-slate-300">•</span>
                            <span className="font-semibold text-slate-800 truncate">{prod.name}</span>
                            {prod.category && (
                              <span className="text-[11px] text-slate-400">({prod.category})</span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-600 whitespace-nowrap font-medium">
                          Rs. {Number(prod.retailPrice).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 5. My POS Code */}
            <div className="col-span-4 sm:col-span-2 md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">My POS Code</label>
              <input
                type="text"
                readOnly
                value={entryPosCode}
                placeholder="00000000"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-mono text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* 6. Supplier Disc % */}
            <div className="col-span-4 sm:col-span-2 md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Supplier Disc %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={entrySupDisc}
                onChange={(e) => setEntrySupDisc(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* 7. SPAR Disc % */}
            <div className="col-span-4 sm:col-span-2 md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">SPAR Disc %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={entrySparDisc}
                onChange={(e) => setEntrySparDisc(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Live Product Master & Sales API Performance Indicator Card */}
          {activeMasterProduct ? (
            <div className="bg-gradient-to-r from-emerald-50/90 via-slate-50 to-blue-50/90 border border-emerald-200/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#007d32] text-white flex flex-col items-center justify-center font-bold text-[10px] shadow-xs">
                  <span>SPAR</span>
                  <span className="text-[8px] font-normal opacity-90">MASTER</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{activeMasterProduct.desc}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {activeMasterProduct.dept} • {activeMasterProduct.subDept}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Barcode: {activeMasterProduct.barcode || 'N/A'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-3 mt-1">
                    <span>
                      NMRP: <strong className="text-slate-900 font-mono">Rs. {activeMasterProduct.nmrp.toFixed(2)}</strong>
                    </span>
                    <span>
                      Normal Margin: <strong className="text-slate-900 font-mono">{(activeMasterProduct.margin * 100).toFixed(1)}%</strong>
                    </span>
                    <span>
                      POS Code: <strong className="text-emerald-800 font-mono font-bold">{entryPosCode || activeMasterProduct.posCode}</strong>
                    </span>
                    <span>
                      Supplier: <strong className="text-slate-800">{activeMasterProduct.supplierName || 'SPAR Retail'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Sales API metrics: latest sales month | same month last year | 3-month average */}
              {salesLookupState === 'loading' ? (
                <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-lg px-4 py-3 text-slate-500">
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading sales history from Sales API…</span>
                </div>
              ) : salesLookupState === 'none' ? (
                <div className="bg-white border border-amber-200 rounded-lg px-4 py-3 text-amber-800">
                  No sales history found for this product in the Sales API.
                </div>
              ) : salesLookupState === 'error' ? (
                <div className="bg-white border border-rose-200 rounded-lg px-4 py-3 text-rose-700">
                  Could not reach the Sales API. Press Enter in the product code box to retry.
                </div>
              ) : salesLookupState === 'ok' ? (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center bg-white border border-slate-200/90 rounded-lg p-1.5 shadow-xs divide-x divide-slate-200">
                    <div className="px-3 text-center">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Last month · {monthLabel(activeSalesMetrics.periods?.previousMonth)}
                      </span>
                      <span className="text-sm font-black font-mono text-slate-900">
                        {activeSalesMetrics.previousMonth.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-slate-500">units</span>
                      </span>
                    </div>
                    <div className="px-3 text-center">
                      <span className="block text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                        Last year · {monthLabel(activeSalesMetrics.periods?.lastYear)}
                      </span>
                      <span className="text-sm font-black font-mono text-blue-900">
                        {activeSalesMetrics.lastYear.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-slate-500">units</span>
                      </span>
                    </div>
                    <div className="px-3 text-center">
                      <span className="block text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                        Avg 3 months
                        {activeSalesMetrics.periods?.avg3Months?.length
                          ? ` · ${monthLabel(activeSalesMetrics.periods.avg3Months[0])}–${monthLabel(
                              activeSalesMetrics.periods.avg3Months[activeSalesMetrics.periods.avg3Months.length - 1]
                            )}`
                          : ''}
                      </span>
                      <span className="text-sm font-black font-mono text-emerald-800">
                        {activeSalesMetrics.avg3Months.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-slate-500">units/mo</span>
                      </span>
                    </div>
                  </div>
                  {activeSalesMetrics.periods && (
                    <span className="text-[10px] text-slate-500">
                      Sales API: {(activeSalesMetrics.totalQty ?? 0).toLocaleString()} units across{' '}
                      {(activeSalesMetrics.totalTransactions ?? 0).toLocaleString()} sales lines,{' '}
                      {activeSalesMetrics.periods.firstSaleDate} to {activeSalesMetrics.periods.lastSaleDate}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          ) : entryDcCode.trim().length >= 2 && !isSearchingMaster && !isSearchingSuggestions ? (
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-800 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>
                  No product or DC code <strong className="font-mono">&ldquo;{entryDcCode}&rdquo;</strong> found in Product Master. Check the code, or pick a product from the suggestions list.
                </span>
              </div>
            </div>
          ) : null}

          {/* Sub-row Options */}
          <div className="grid grid-cols-12 gap-3 items-end pt-2 border-t border-slate-100">
            {/* 8. Outlets */}
            <div className="col-span-12 sm:col-span-6 md:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Outlets</label>
              <select
                value={entryOutlets}
                onChange={(e) => setEntryOutlets(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="All outlets">All outlets (Default)</option>
                <option value="Colombo Fort, Thalawathugoda">Colombo Fort, Thalawathugoda</option>
                <option value="Negombo only">Negombo only</option>
              </select>
            </div>

            {/* 9. Tabloid Feature */}
            <div className="col-span-12 sm:col-span-6 md:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Tabloid Feature</label>
              <select
                value={entryTabloid}
                onChange={(e) => setEntryTabloid(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="None">None</option>
                <option value="Front Page">Front Page (25% uplift)</option>
                <option value="Insider / Hero">Insider / Hero (15% uplift)</option>
              </select>
            </div>

            {/* 10. Comment */}
            <div className="col-span-12 sm:col-span-8 md:col-span-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Comment (Optional)</label>
              <input
                type="text"
                value={entryComment}
                onChange={(e) => setEntryComment(e.target.value)}
                placeholder="Promo remarks..."
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* 11. Action Button */}
            <div className="col-span-12 sm:col-span-4 md:col-span-2">
              <button
                type="button"
                onClick={handleAdd11FieldLine}
                className="w-full bg-[#007d32] hover:bg-[#00682a] text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Add to Promo List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. PROMOTION LINES TABLE ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
              2
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                Products in this list ({lines.length})
              </h3>
              <p className="text-xs text-slate-500">Prices and margins are calculated the same way as the Special Promo Excel.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher */}
            <div
              className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium text-slate-600"
              role="group"
              aria-label="Table view"
            >
              <button
                onClick={() => setTableViewMode('special')}
                aria-pressed={tableViewMode === 'special'}
                title="Every column from the Special Promo Excel"
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap ${tableViewMode === 'special'
                  ? 'bg-white text-emerald-800 font-bold shadow-sm'
                  : 'hover:text-slate-900'
                  }`}
              >
                Full Excel view
              </button>
              <button
                onClick={() => setTableViewMode('aggrid')}
                aria-pressed={tableViewMode === 'aggrid'}
                title="Only the key columns"
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap ${tableViewMode === 'aggrid'
                  ? 'bg-white text-emerald-800 font-bold shadow-sm'
                  : 'hover:text-slate-900'
                  }`}
              >
                Compact view
              </button>
            </div>

            {/* Direct Fill Special Promo Excel Button */}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-700" />}
              onClick={handleFillSpecialExcel}
              isLoading={isExportingExcel}
              disabled={lines.length === 0}
              className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs"
            >
              Download as Special Promo Excel
            </Button>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="py-12 px-4 text-center border border-slate-200/80 rounded-xl bg-white">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1">No products added yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Add products using the form above, or use “Upload Excel” to bring in many at once. Prices, margins and
              forecasts are worked out for you.
            </p>
          </div>
        ) : tableViewMode === 'special' ? (
          /* ==================== 51-COLUMN SPECIAL PROMO EXCEL MODEL VIEW ==================== */
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[580px] shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs">
                {/* Master Classification Row 1 (Excel Rows 11 & 12 groups) */}
                <tr className="bg-[#1b432e] text-white text-[11px] font-bold text-center tracking-wider">
                  <th colSpan={2} className="py-1 px-2 border-r border-[#2d5c43]">CLASSIFICATION</th>
                  <th colSpan={3} className="py-1 px-2 border-r border-[#2d5c43] bg-[#225038]">PROMO PERIOD</th>
                  <th colSpan={4} className="py-1 px-2 border-r border-[#2d5c43]">CATEGORY HIERARCHY</th>
                  <th colSpan={5} className="py-1 px-2 border-r border-[#2d5c43] bg-[#225038]">ITEM MASTER & STATUS</th>
                  <th colSpan={4} className="py-1 px-2 border-r border-[#2d5c43]">PRICING & DISCOUNTS</th>
                  <th colSpan={5} className="py-1 px-2 border-r border-[#2d5c43] bg-[#225038]">CALCULATED PRICES & MARGINS</th>
                  <th colSpan={2} className="py-1 px-2 border-r border-[#2d5c43]">CUSTOMER SAVINGS</th>
                  <th colSpan={2} className="py-1 px-2 border-r border-[#2d5c43]">SUPPLIER & NOTES</th>
                  <th colSpan={3} className="py-1 px-2 border-r border-[#2d5c43] bg-[#225038]">SALES RANK & VOL</th>
                  <th colSpan={1} className="py-1 px-2 border-r border-[#2d5c43]">TABLOID</th>
                  {/* The 3 User-specified Sales API Columns */}
                  <th colSpan={3} className="py-1 px-2 border-r border-blue-900 bg-blue-900 text-amber-300 font-black">
                    📈 Sales QTY (SALES API LIVE)
                  </th>
                  <th colSpan={5} className="py-1 px-2 border-r border-[#2d5c43] bg-[#225038]">Rank (Sub Dept Wise)</th>
                  <th colSpan={6} className="py-1 px-2 border-r border-[#2d5c43]">PROMO FORECAST EQUATIONS</th>
                  <th colSpan={5} className="py-1 px-2 border-r border-emerald-900 bg-[#0f3422] text-emerald-200">
                    DISCOUNTED VALUE & CONTRIBUTIONS
                  </th>
                  <th colSpan={1} className="py-1 px-2 border-r border-[#2d5c43]">OUTLET</th>
                  <th colSpan={1} className="py-1 px-2">ACTION</th>
                </tr>

                {/* 51 Exact Excel Header Columns Row (A13 to AY13) */}
                <tr className="bg-[#eaf1ec] text-[#1b432e] font-bold border-b border-[#c8dcd0] text-[10.5px]">
                  <th className="py-2 px-2.5 whitespace-nowrap">Food/Non Food</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Promo Type</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">From</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">To</th>
                  <th className="py-2 px-2 text-center whitespace-nowrap">Days</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Dept</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Sub Dept</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Class</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Segment</th>
                  <th className="py-2 px-2.5 whitespace-nowrap font-mono text-emerald-900">DC Code</th>
                  <th className="py-2 px-2.5 whitespace-nowrap font-mono">MY POS Code</th>
                  <th className="py-2 px-2.5 whitespace-nowrap font-mono">Barcode</th>
                  <th className="py-2 px-3 whitespace-nowrap min-w-[150px]">Description</th>
                  <th className="py-2 px-2 whitespace-nowrap text-center">Status</th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap">NMRP</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Normal Margin</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap text-emerald-800">Supplier Disc %</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap text-emerald-800">SPAR Disc %</th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-amber-50 text-amber-950 font-bold">Final Cost</th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap">Raw Price</th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-emerald-100/90 font-black text-emerald-950">
                    Promo Price (MROUND 10)
                  </th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Rounding Margin</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap font-bold text-slate-800">Final Margin %</th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap font-bold text-emerald-700">Saving On NMRP</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap font-bold text-emerald-700">Saving %</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Supplier Name</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Comment</th>
                  <th className="py-2 px-2 text-center whitespace-nowrap">3M Value Rank</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">3M Avg Sales</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Forecast Vol</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Tabloid Feature</th>
                  {/* The 3 Specific User Columns from Sales API */}
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-blue-50 text-blue-950 font-bold border-l border-blue-200">
                    Previous Month
                  </th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-blue-50 text-blue-950 font-bold">
                    LAST YEAR Sep 2025
                  </th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-blue-50 text-blue-950 font-bold border-r border-blue-200">
                    AVG 3 Months
                  </th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap">Sales Net</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Dep - QTY</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">S. Dep - QTY</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Class - QTY</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Segment Rank</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Avg Promo Qty</th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap">Avg Promo Value</th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap">SPAR Contrib Base</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Inc Sales (SPAR)</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Sales Inc %</th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Inc Sales (5%)</th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-emerald-50 text-emerald-950 font-black">
                    FORECASTED QTY
                  </th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-emerald-50 text-emerald-950 font-bold">
                    FORECAST SALES VALUE
                  </th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-amber-50 text-amber-950 font-bold">
                    TOTAL SAVINGS
                  </th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-indigo-50 text-indigo-950 font-bold">
                    SUPPLIER CONTRIB
                  </th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-emerald-100 text-emerald-950 font-black">
                    SPAR CONTRIB
                  </th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Outlet</th>
                  <th className="py-2 px-2 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {lines.map((l, idx) => {
                  const nmrp = Number(l.nmrp || l.product?.retailPrice || 400);
                  const baseMargin = Number(l.normalMargin || 0.15);
                  const supD = Number(l.supDisc ?? 5);
                  const sparD = Number(l.sparDisc ?? 5);
                  const supDFrac = supD / 100;
                  const sparDFrac = sparD / 100;

                  // Official equations
                  const finalCost = Number(l.dealCost || l.finalCost || (nmrp - nmrp * (baseMargin + supDFrac)));
                  const rawSellingPrice = Number(l.sellingBeforeRound || (nmrp - nmrp * (sparDFrac + supDFrac)));
                  const promoPrice = Number(l.promoPrice || l.sellingAfterRound || (Math.round(rawSellingPrice / 10) * 10));
                  const roundingMargin = rawSellingPrice > 0 ? ((rawSellingPrice - promoPrice) / rawSellingPrice) * 100 : 0;
                  const finalMarginPct = promoPrice > 0 ? (((promoPrice - finalCost) / promoPrice) * 100).toFixed(1) : '0';
                  const saving = nmrp - promoPrice;
                  const savingPct = nmrp > 0 ? ((saving / nmrp) * 100).toFixed(1) : '0';

                  const days = Number(l.days || calculatedDurationDays);
                  const prevMonth = Number(l.previousMonth ?? 340);
                  const lastYr = Number(l.lastYear ?? 310);
                  const avg3M = Number(l.avg3Months ?? 350);
                  const salesNet = Number(l.salesNet ?? 11434);

                  const avgPromoQty = Number(l.avgPromoQty ?? Number(((avg3M / 30) * days).toFixed(2)));
                  const avgPromoValue = Number(l.avgPromoValue ?? Number((avgPromoQty * nmrp).toFixed(2)));
                  const sparContribBase = Number(l.sparContributionBase ?? Number((avgPromoQty * (nmrp * sparDFrac)).toFixed(2)));
                  const incSales = Number(
                    l.incSales ??
                    (baseMargin - sparDFrac > 0
                      ? Number((sparContribBase / (nmrp * (baseMargin - sparDFrac))).toFixed(2))
                      : 0)
                  );
                  const upliftPct = Number(l.salesIncreasePct ?? 15);
                  const incSales5 = Number(l.incSales5 ?? Number((avgPromoQty * 0.05).toFixed(2)));
                  const fcstQty = Number(
                    l.estimatedVolume ||
                    l.forecastedQty ||
                    Math.ceil(avgPromoQty + avgPromoQty * (upliftPct / 100) + incSales5)
                  );
                  const fcstValue = Number(l.forecastRevenue || l.forecastedValue || fcstQty * nmrp);
                  const totalSavings = Number(l.totalSavings || fcstQty * saving);
                  const supplierContrib = Number(l.supplierContribution || fcstQty * nmrp * supDFrac);
                  const sparContrib = Number(l.sparContribution || totalSavings - supplierContrib);

                  return (
                    <tr key={l.id || idx} className="hover:bg-slate-50 transition border-b border-slate-100 text-[11px]">
                      {/* 1. Food */}
                      <td className="py-2 px-2.5 text-slate-700">{l.food || l.dept || 'Fresh'}</td>
                      {/* 2. Promo Type */}
                      <td className="py-2 px-2.5 text-slate-800 font-semibold">{l.promo || l.mechanic || entryPromoType}</td>
                      {/* 3. From */}
                      <td className="py-2 px-2.5 text-slate-600 font-mono">{l.from || entryFromDate}</td>
                      {/* 4. To */}
                      <td className="py-2 px-2.5 text-slate-600 font-mono">{l.to || entryToDate}</td>
                      {/* 5. Days */}
                      <td className="py-2 px-2 text-center font-bold text-emerald-800 font-mono">{days}</td>
                      {/* 6. Dept */}
                      <td className="py-2 px-2.5 text-slate-700">{l.dept || 'Fresh'}</td>
                      {/* 7. Sub Dept */}
                      <td className="py-2 px-2.5 text-slate-600">{l.subDept || 'General'}</td>
                      {/* 8. Class */}
                      <td className="py-2 px-2.5 text-slate-600">{l.pClass || 'Standard'}</td>
                      {/* 9. Segment */}
                      <td className="py-2 px-2.5 text-slate-600">{l.segment || 'General'}</td>
                      {/* 10. DC Code */}
                      <td className="py-2 px-2.5 font-mono font-bold text-emerald-800 bg-emerald-50/40">
                        {l.dc || '—'}
                      </td>
                      {/* 11. POS Code */}
                      <td className="py-2 px-2.5 font-mono text-slate-600">{l.pos || 'P-00000'}</td>
                      {/* 12. Barcode */}
                      <td className="py-2 px-2.5 font-mono text-slate-500 text-[10.5px]">
                        {l.barcode || l.product?.barcode || '-'}
                      </td>
                      {/* 13. Description */}
                      <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {l.desc || l.product?.name || 'Promo Item'}
                      </td>
                      {/* 14. Status */}
                      <td className="py-2 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800">
                          {l.statusText || 'ACTIVE'}
                        </span>
                      </td>
                      {/* 15. NMRP */}
                      <td className="py-2 px-2.5 text-right font-mono text-slate-800">Rs. {nmrp.toFixed(2)}</td>
                      {/* 16. Normal Margin */}
                      <td className="py-2 px-2 text-right font-mono text-slate-600">{(baseMargin * 100).toFixed(0)}%</td>
                      {/* 17. Supplier Disc */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700">{supD}%</td>
                      {/* 18. SPAR Disc */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700">{sparD}%</td>
                      {/* 19. Final Cost */}
                      <td className="py-2 px-2.5 text-right font-mono bg-amber-50/80 text-amber-950 font-bold">
                        Rs. {finalCost.toFixed(2)}
                      </td>
                      {/* 20. Raw Price */}
                      <td className="py-2 px-2.5 text-right font-mono text-slate-500">Rs. {rawSellingPrice.toFixed(2)}</td>
                      {/* 21. Promo Price (MROUND 10) */}
                      <td className="py-2 px-2.5 text-right font-mono font-black text-emerald-950 bg-emerald-100/70">
                        Rs. {promoPrice.toFixed(2)}
                      </td>
                      {/* 22. Rounding Margin */}
                      <td className="py-2 px-2 text-right font-mono text-slate-500">{roundingMargin.toFixed(1)}%</td>
                      {/* 23. Final Margin % */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">{finalMarginPct}%</td>
                      {/* 24. Saving On NMRP */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700">Rs. {saving.toFixed(2)}</td>
                      {/* 25. Saving % */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700">{savingPct}%</td>
                      {/* 26. Supplier Name */}
                      <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">{l.supplierName || 'SPAR Retail Distributors'}</td>
                      {/* 27. Comment */}
                      <td className="py-2 px-2.5 text-slate-500 whitespace-nowrap">{l.comment || '-'}</td>
                      {/* 28. 3M Value Rank */}
                      <td className="py-2 px-2 text-center font-mono text-slate-600">{l.rank || idx + 1}</td>
                      {/* 29. 3M Avg Sales */}
                      <td className="py-2 px-2 text-right font-mono text-slate-700">{avg3M}</td>
                      {/* 30. Forecast Vol */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">{fcstQty}</td>
                      {/* 31. Tabloid */}
                      <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">{l.tabloid || 'None'}</td>

                      {/* 32. Previous Month (SALES API LIVE) */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 bg-blue-50/70 border-l border-blue-200">
                        {prevMonth.toLocaleString()}
                      </td>
                      {/* 33. LAST YEAR Sep 2025 (SALES API LIVE) */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-blue-900 bg-blue-50/70">
                        {lastYr.toLocaleString()}
                      </td>
                      {/* 34. AVG 3 Months (SALES API LIVE) */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-800 bg-blue-50/70 border-r border-blue-200">
                        {avg3M.toLocaleString()}
                      </td>

                      {/* 35. Sales Net */}
                      <td className="py-2 px-2.5 text-right font-mono text-slate-700">Rs. {salesNet.toLocaleString()}</td>
                      {/* 36. Dep - QTY */}
                      <td className="py-2 px-2 text-right font-mono text-slate-600">{l.depQty || 725}</td>
                      {/* 37. S. Dep - QTY */}
                      <td className="py-2 px-2 text-right font-mono text-slate-600">{l.subDepQty || 2}</td>
                      {/* 38. Class - QTY */}
                      <td className="py-2 px-2 text-right font-mono text-slate-600">{l.productClassQty || 2}</td>
                      {/* 39. Segment Rank */}
                      <td className="py-2 px-2 text-right font-mono text-slate-600">{l.segmentRank || 1}</td>

                      {/* 40. Avg Promo Qty */}
                      <td className="py-2 px-2 text-right font-mono text-slate-700">{avgPromoQty}</td>
                      {/* 41. Avg Promo Value */}
                      <td className="py-2 px-2.5 text-right font-mono text-slate-700">Rs. {avgPromoValue.toFixed(2)}</td>
                      {/* 42. SPAR Contrib Base */}
                      <td className="py-2 px-2.5 text-right font-mono text-slate-700">Rs. {sparContribBase.toFixed(2)}</td>
                      {/* 43. Inc Sales (SPAR) */}
                      <td className="py-2 px-2 text-right font-mono text-slate-700">{incSales.toFixed(2)}</td>
                      {/* 44. Sales Inc % */}
                      <td className="py-2 px-2 text-right font-mono text-slate-700">{upliftPct}%</td>
                      {/* 45. Inc Sales (5%) */}
                      <td className="py-2 px-2 text-right font-mono text-slate-700">{incSales5.toFixed(2)}</td>

                      {/* 46. FORECASTED QTY */}
                      <td className="py-2 px-2.5 text-right font-mono font-black text-slate-950 bg-emerald-50/70">
                        {fcstQty}
                      </td>
                      {/* 47. FORECAST SALES VALUE */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 bg-emerald-50/70">
                        Rs. {fcstValue.toFixed(2)}
                      </td>
                      {/* 48. TOTAL SAVINGS */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-900 bg-amber-50/60">
                        Rs. {totalSavings.toFixed(2)}
                      </td>
                      {/* 49. SUPPLIER CONTRIB */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-indigo-800 bg-indigo-50/60">
                        Rs. {supplierContrib.toFixed(2)}
                      </td>
                      {/* 50. SPAR CONTRIB */}
                      <td className="py-2 px-2.5 text-right font-mono font-black text-emerald-900 bg-emerald-100/60">
                        Rs. {sparContrib.toFixed(2)}
                      </td>

                      {/* 51. Outlet */}
                      <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">{l.outlets || 'All outlets'}</td>

                      {/* 52. Action */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(l.id)}
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                          title="Remove Line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Formula & Totals Equation Footer matching Special Promo Excel */}
              <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white font-bold text-[11px] shadow-lg border-t-2 border-emerald-500">
                <tr>
                  <td colSpan={14} className="py-2.5 px-3 uppercase tracking-wider text-emerald-300 font-mono text-xs">
                    📊 SPECIAL PROMO TOTALS & EXCEL EQUATIONS (=SUM)
                  </td>
                  <td colSpan={8} className="py-2.5 px-2 text-right text-slate-300 font-mono">
                    Blended Promo Margin:
                  </td>
                  <td className="py-2.5 px-2 text-right text-emerald-300 font-mono font-black text-xs">
                    {(() => {
                      let totalTurnover = 0;
                      let totalCost = 0;
                      lines.forEach((l) => {
                        const nmrp = Number(l.nmrp || l.product?.retailPrice || 400);
                        const baseMargin = Number(l.normalMargin || 0.15);
                        const supD = Number(l.supDisc ?? 5) / 100;
                        const finalCost = Number(l.dealCost || l.finalCost || (nmrp - nmrp * (baseMargin + supD)));
                        const fcstQty = Number(l.estimatedVolume || l.forecastedQty || 120);
                        totalTurnover += fcstQty * nmrp;
                        totalCost += fcstQty * finalCost;
                      });
                      return totalTurnover > 0 ? `${(((totalTurnover - totalCost) / totalTurnover) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </td>
                  <td colSpan={22} className="py-2.5 px-2 text-right text-slate-400 font-mono text-[10px]">
                    =SUM(AT14:AX{13 + lines.length})
                  </td>
                  {/* Sum Column 46: Forecasted Qty */}
                  <td className="py-2.5 px-2 text-right font-mono font-black text-amber-300 text-xs bg-slate-800">
                    {lines.reduce((acc, l) => acc + Number(l.estimatedVolume || l.forecastedQty || 0), 0).toLocaleString()}
                  </td>
                  {/* Sum Column 47: Forecasted Value */}
                  <td className="py-2.5 px-2 text-right font-mono font-black text-white text-xs bg-slate-800">
                    Rs.{' '}
                    {lines
                      .reduce((acc, l) => {
                        const nmrp = Number(l.nmrp || l.product?.retailPrice || 400);
                        const q = Number(l.estimatedVolume || l.forecastedQty || 0);
                        return acc + q * nmrp;
                      }, 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {/* Sum Column 48: Total Savings */}
                  <td className="py-2.5 px-2 text-right font-mono font-black text-amber-400 text-xs bg-slate-800">
                    Rs.{' '}
                    {lines
                      .reduce((acc, l) => {
                        const nmrp = Number(l.nmrp || l.product?.retailPrice || 400);
                        const supD = Number(l.supDisc ?? 5) / 100;
                        const sparD = Number(l.sparDisc ?? 5) / 100;
                        const promoPrice = Number(l.promoPrice || (Math.round((nmrp - nmrp * (sparD + supD)) / 10) * 10));
                        const saving = nmrp - promoPrice;
                        const q = Number(l.estimatedVolume || l.forecastedQty || 0);
                        return acc + q * saving;
                      }, 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {/* Sum Column 49: Supplier Contribution */}
                  <td className="py-2.5 px-2 text-right font-mono font-black text-indigo-300 text-xs bg-slate-800">
                    Rs.{' '}
                    {lines
                      .reduce((acc, l) => {
                        const nmrp = Number(l.nmrp || l.product?.retailPrice || 400);
                        const supD = Number(l.supDisc ?? 5) / 100;
                        const q = Number(l.estimatedVolume || l.forecastedQty || 0);
                        return acc + q * nmrp * supD;
                      }, 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {/* Sum Column 50: SPAR Contribution */}
                  <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-400 text-xs bg-slate-800">
                    Rs.{' '}
                    {lines
                      .reduce((acc, l) => {
                        const nmrp = Number(l.nmrp || l.product?.retailPrice || 400);
                        const supD = Number(l.supDisc ?? 5) / 100;
                        const sparD = Number(l.sparDisc ?? 5) / 100;
                        const promoPrice = Number(l.promoPrice || (Math.round((nmrp - nmrp * (sparD + supD)) / 10) * 10));
                        const saving = nmrp - promoPrice;
                        const q = Number(l.estimatedVolume || l.forecastedQty || 0);
                        const totalSav = q * saving;
                        const supContrib = q * nmrp * supD;
                        return acc + (totalSav - supContrib);
                      }, 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="py-2.5 px-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          /* ==================== COMPACT AG-GRID VIEW ==================== */
          <div className="ag-theme-quartz w-full" style={{ height: '420px' }}>
            <AgGridReact
              rowData={lines}
              columnDefs={columnDefs}
              onCellValueChanged={onCellValueChanged}
              defaultColDef={{
                resizable: true,
                sortable: true,
                filter: true,
              }}
              rowHeight={38}
              headerHeight={40}
              suppressRowClickSelection
              stopEditingWhenCellsLoseFocus
            />
          </div>
        )}
      </div>

      {/* 7. Summary / Campaign Totals */}
      <div className="bg-[#0b1727] text-white rounded-xl shadow-md p-4 px-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            TOTAL SKUS
          </span>
          <span className="text-lg font-bold font-mono text-white mt-1 block">
            {totals.count} items
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            FORECAST VOLUME
          </span>
          <span className="text-lg font-bold font-mono text-white mt-1 block">
            {totals.totalVolume.toLocaleString()} units
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            FORECAST REVENUE
          </span>
          <span className="text-lg font-bold font-mono text-white mt-1 block">
            {formatZar(totals.totalRevenue)}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            FORECAST GROSS PROFIT
          </span>
          <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
            {formatZar(totals.totalMargin)}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            BLENDED MARGIN %
          </span>
          <span className="text-lg font-bold font-mono text-indigo-400 mt-1 block">
            {totals.blendedMarginPercent}%
          </span>
        </div>
      </div>

      {/* Inline Bottom Actions Right-Aligned */}
      {isEditable && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {isDirty && (
            <span className="mr-auto text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-2 shadow-xs transition"
          >
            <Save className="w-4 h-4 text-emerald-600" />
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => {
              const err = validateForm(true);
              if (err) {
                setNotification({ type: 'warning', message: err });
              } else {
                setConfirmSubmitOpen(true);
              }
            }}
            className="bg-[#007d32] hover:bg-[#00682a] text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 shadow-xs transition"
          >
            <Send className="w-4 h-4" />
            Submit to Head
          </button>
        </div>
      )}

      {/* 14. Submission Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={handleSubmitToHead}
        title="Submit Promo List to Head"
        message="Submit this promo list for Head review? Once submitted, the promotional list will be locked and sent to your department Head for final approval."
        confirmText="Submit to Head"
        cancelText="Cancel"
        type="warning"
        isLoading={isSubmitting}
      />

      {/* Remove Line Confirmation Dialog */}
      <ConfirmDialog
        isOpen={lineToDelete !== null}
        onClose={() => setLineToDelete(null)}
        onConfirm={() => lineToDelete && handleRemoveLine(lineToDelete)}
        title="Remove Product Line"
        message="Remove this product from the promotional list? Any entered prices and volumes for this SKU will be discarded."
        confirmText="Remove Line"
        cancelText="Keep Line"
        type="danger"
      />

      {/* Unsaved Changes Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmLeaveOpen}
        onClose={() => setConfirmLeaveOpen(false)}
        onConfirm={() => navigate('/dashboard')}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes on this promotional list. If you leave now, newly entered values will be lost."
        confirmText="Discard and Leave"
        cancelText="Continue Editing"
        type="warning"
      />

      {/* POS Sales Performance Modal */}
      {salesModalProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">POS Sales History & Performance</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    SKU: {salesModalProduct.sku} • {salesModalProduct.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSalesModalProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {isLoadingSales ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-spar-green border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Fetching historical sales data from Sales API...</p>
                </div>
              ) : salesError ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{salesError}</span>
                </div>
              ) : !salesSummary || salesSummary.totalTransactions === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">No historical sales recorded for this SKU.</p>
                  <p>Product has not yet been scanned at POS checkout registers.</p>
                </div>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invoices</span>
                      <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                        {salesSummary.totalTransactions.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Units Sold</span>
                      <span className="text-lg font-bold font-mono text-emerald-700 mt-0.5 block">
                        {salesSummary.totalQuantitySold.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sales Value</span>
                      <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                        {formatZar(salesSummary.totalSalesValue)}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Price</span>
                      <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                        {formatZar(salesSummary.averageSellingPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Recent POS Transactions (Sample)
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs divide-y divide-slate-100">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px]">
                          <tr>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Store Location</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Price</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {salesSummary.recentSalesLines.map((line, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-1.5 px-3 text-slate-600">{line.invoiceDate}</td>
                              <td className="py-1.5 px-3 text-slate-800 font-sans font-medium">{line.locationDesc}</td>
                              <td className="py-1.5 px-3 text-right text-slate-700">{line.qty}</td>
                              <td className="py-1.5 px-3 text-right text-slate-700">{formatZar(line.sellingPrice)}</td>
                              <td className="py-1.5 px-3 text-right font-bold text-emerald-700">{formatZar(line.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSalesModalProduct(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
