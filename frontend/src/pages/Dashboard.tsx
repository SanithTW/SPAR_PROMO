import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { fetchDashboardSummary, fetchRecentPromos } from '../services/dashboardService.js';
import { DashboardSummary, RecentPromoItem } from '../types/index.js';
import { apiRequest } from '../services/api.js';
import {
  FileText,
  Clock,
  XCircle,
  CheckCircle2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

interface PromoTableLine {
  id?: string;
  food: string;
  promo: string;
  from: string;
  to: string;
  days: number;
  dept: string;
  subDept: string;
  pClass: string;
  segment: string;
  dc: string;
  pos: string;
  barcode: string;
  desc: string;
  supDisc: number;
  sparDisc: number;
  nmrp: number;
  baseMargin: number;
  promoPrice?: number;
  marginPercent?: number;
}

const MASTER_DATA: Record<
  string,
  {
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
  }
> = {
  '100245': {
    posCode: 'P-88231',
    barcode: '4791002450017',
    desc: 'Fresh Milk 1L',
    dept: 'Fresh',
    subDept: 'Dairy',
    pClass: 'Chilled',
    segment: 'Milk',
    nmrp: 450,
    margin: 0.18,
    pack: 12,
  },
  '100391': {
    posCode: 'P-88412',
    barcode: '4791003910014',
    desc: 'Red Onions 1kg',
    dept: 'Fresh',
    subDept: 'Vegetables',
    pClass: 'Produce',
    segment: 'Onions',
    nmrp: 380,
    margin: 0.15,
    pack: 20,
  },
  '100517': {
    posCode: 'P-88790',
    barcode: '4791005170019',
    desc: 'Chicken Breast 500g',
    dept: 'Fresh',
    subDept: 'Meat',
    pClass: 'Chilled',
    segment: 'Poultry',
    nmrp: 920,
    margin: 0.14,
    pack: 10,
  },
  '100688': {
    posCode: 'P-88955',
    barcode: '4791006880016',
    desc: 'Bananas (Ambul) 1kg',
    dept: 'Fresh',
    subDept: 'Fruits',
    pClass: 'Produce',
    segment: 'Bananas',
    nmrp: 290,
    margin: 0.16,
    pack: 15,
  },
  '100742': {
    posCode: 'P-89102',
    barcode: '4791007420013',
    desc: 'Free-range Eggs x10',
    dept: 'Fresh',
    subDept: 'Dairy',
    pClass: 'Chilled',
    segment: 'Eggs',
    nmrp: 640,
    margin: 0.12,
    pack: 8,
  },
  '3000432': {
    posCode: 'P-99120',
    barcode: '4791009912003',
    desc: 'Campion Super Basmati Rice 5kg',
    dept: 'Food',
    subDept: 'Grains & Rice',
    pClass: 'Dry Food',
    segment: 'Basmati',
    nmrp: 2450,
    margin: 0.22,
    pack: 4,
  },
};

export const Dashboard: React.FC = () => {
  const { user, isHead } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentPromos, setRecentPromos] = useState<RecentPromoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State for 11 Input Fields
  const [promoType, setPromoType] = useState('Special Promo');
  const [fromDate, setFromDate] = useState('2026-10-01');
  const [toDate, setToDate] = useState('2026-10-30');
  const [dcCode, setDcCode] = useState('');
  const [posCode, setPosCode] = useState('');
  const [supDisc, setSupDisc] = useState(5);
  const [sparDisc, setSparDisc] = useState(5);
  const [outlets, setOutlets] = useState('All outlets');
  const [tabloid, setTabloid] = useState('None');
  const [comment, setComment] = useState('');

  // Table Lines State initialized with seed lines
  const [lines, setLines] = useState<PromoTableLine[]>([
    {
      food: 'Fresh',
      promo: 'Monthly Tabloid',
      from: '2026-10-01',
      to: '2026-10-31',
      days: 31,
      dept: 'Fresh',
      subDept: 'Dairy',
      pClass: 'Chilled',
      segment: 'Milk',
      dc: '100245',
      pos: 'P-88231',
      barcode: '4791002450017',
      desc: 'Fresh Milk 1L',
      supDisc: 5,
      sparDisc: 5,
      nmrp: 450,
      baseMargin: 0.18,
    },
    {
      food: 'Fresh',
      promo: 'Monthly Tabloid',
      from: '2026-10-01',
      to: '2026-10-31',
      days: 31,
      dept: 'Fresh',
      subDept: 'Vegetables',
      pClass: 'Produce',
      segment: 'Onions',
      dc: '100391',
      pos: 'P-88412',
      barcode: '4791003910014',
      desc: 'Red Onions 1kg',
      supDisc: 5,
      sparDisc: 5,
      nmrp: 380,
      baseMargin: 0.15,
    },
    {
      food: 'Fresh',
      promo: 'Monthly Tabloid',
      from: '2026-10-01',
      to: '2026-10-31',
      days: 31,
      dept: 'Fresh',
      subDept: 'Meat',
      pClass: 'Chilled',
      segment: 'Poultry',
      dc: '100517',
      pos: 'P-88790',
      barcode: '4791005170019',
      desc: 'Chicken Breast 500g',
      supDisc: 4,
      sparDisc: 6,
      nmrp: 920,
      baseMargin: 0.14,
    },
    {
      food: 'Fresh',
      promo: 'Monthly Tabloid',
      from: '2026-10-01',
      to: '2026-10-31',
      days: 31,
      dept: 'Fresh',
      subDept: 'Fruits',
      pClass: 'Produce',
      segment: 'Bananas',
      dc: '100688',
      pos: 'P-88955',
      barcode: '4791006880016',
      desc: 'Bananas (Ambul) 1kg',
      supDisc: 5,
      sparDisc: 5,
      nmrp: 290,
      baseMargin: 0.16,
    },
    {
      food: 'Fresh',
      promo: 'Monthly Tabloid',
      from: '2026-10-01',
      to: '2026-10-31',
      days: 31,
      dept: 'Fresh',
      subDept: 'Dairy',
      pClass: 'Chilled',
      segment: 'Eggs',
      dc: '100742',
      pos: 'P-89102',
      barcode: '4791007420013',
      desc: 'Free-range Eggs x10',
      supDisc: 5,
      sparDisc: 5,
      nmrp: 640,
      baseMargin: 0.12,
    },
  ]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryData, recentData] = await Promise.all([
        fetchDashboardSummary(),
        fetchRecentPromos(15),
      ]);
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

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.firstName || user?.name?.split(' ')[0] || 'Colleague';
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }, [user]);

  // Duration Calculation (To - From + 1)
  const calculatedDays = useMemo(() => {
    if (!fromDate || !toDate) return 1;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [fromDate, toDate]);

  // Handle DC code input change and lookup
  const handleDcCodeChange = (code: string) => {
    setDcCode(code);
    const product = MASTER_DATA[code.trim()];
    if (product) {
      setPosCode(product.posCode);
    } else {
      setPosCode('');
    }
  };

  // Add line to table
  const handleAddLine = async () => {
    const dc = dcCode.trim();
    const product = MASTER_DATA[dc];
    if (!product) {
      alert('Product not found in Master Data. Please try 100245, 100391, 100517, 100688, 100742, or 3000432.');
      return;
    }

    const newLine: PromoTableLine = {
      food: product.dept,
      promo: promoType,
      from: fromDate,
      to: toDate,
      days: calculatedDays,
      dept: product.dept,
      subDept: product.subDept,
      pClass: product.pClass,
      segment: product.segment,
      dc,
      pos: product.posCode,
      barcode: product.barcode,
      desc: product.desc,
      supDisc,
      sparDisc,
      nmrp: product.nmrp,
      baseMargin: product.margin,
    };

    setLines((prev) => [newLine, ...prev]);
    setDcCode('');
    setPosCode('');
    setComment('');

    // Also persist via API if active draft creation desired
    try {
      await apiRequest('/promo-lists', {
        method: 'POST',
        body: JSON.stringify({
          title: `${product.desc} - ${promoType}`,
          promoType: 'WEEKLY_LEAFLET',
          startDate: new Date(fromDate).toISOString(),
          endDate: new Date(toDate).toISOString(),
          notes: comment || `Outlets: ${outlets}, Feature: ${tabloid}`,
          lines: [
            {
              productId: 'prod-fresh-001',
              promoPrice: Math.round(product.nmrp * (1 - (supDisc + sparDisc) / 100)),
              dealCost: product.nmrp * (1 - product.margin),
              estimatedVolume: 100,
            },
          ],
        }),
      });
      loadDashboardData();
    } catch {
      // Ignore background sync errors for rapid line addition
    }
  };

  const handleDeleteLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Pricing & Margin calculation helper
  const calculateLineMath = (line: PromoTableLine) => {
    const nmrp = line.nmrp || 400;
    const baseMargin = line.baseMargin || 0.15;
    const supD = line.supDisc / 100;
    const sparD = line.sparDisc / 100;

    const cost = nmrp - nmrp * (baseMargin + supD);
    const rawPrice = nmrp - nmrp * (sparD + supD);
    const roundedPrice = Math.round(rawPrice / 10) * 10;
    const margin = roundedPrice > 0 ? ((roundedPrice - cost) / roundedPrice) * 100 : 0;

    return { price: roundedPrice, margin: margin.toFixed(1) };
  };

  const handleCardClick = (type: 'drafts' | 'waiting' | 'rejected' | 'approved') => {
    switch (type) {
      case 'drafts':
        navigate('/promo-entry?status=DRAFT');
        break;
      case 'waiting':
        if (isHead) {
          navigate('/head-review?status=SUBMITTED_TO_HEAD');
        } else {
          navigate('/promo-entry?status=SUBMITTED_TO_HEAD');
        }
        break;
      case 'rejected':
        if (isHead) {
          navigate('/head-review?status=REJECTED_BY_HEAD');
        } else {
          navigate('/promo-entry?status=REJECTED_BY_HEAD');
        }
        break;
      case 'approved':
        navigate('/approved-promos');
        break;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadDashboardData} className="font-bold underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* ==================== GREETING HEADER ==================== */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{greeting}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.department
              ? `Showing ${user.department.name} department lists only.`
              : 'Showing all enterprise departments.'}
          </p>
        </div>
        <button
          onClick={() => {
            const entryEl = document.getElementById('entry-section');
            if (entryEl) {
              entryEl.scrollIntoView({ behavior: 'smooth' });
            } else {
              navigate('/promo-entry');
            }
          }}
          className="bg-[#e31e24] hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New promo list
        </button>
      </div>

      {/* ==================== FOUR STAT METRIC CARDS ==================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {/* Card 1: Drafts */}
        <div
          onClick={() => handleCardClick('drafts')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-32 hover:border-slate-300 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{summary?.drafts ?? 0}</p>
            <p className="text-xs font-semibold text-slate-500">Drafts</p>
          </div>
        </div>

        {/* Card 2: Waiting for Me */}
        <div
          onClick={() => handleCardClick('waiting')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-32 hover:border-slate-300 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{summary?.waitingForMe ?? 1}</p>
            <p className="text-xs font-semibold text-slate-500">Waiting for me</p>
          </div>
        </div>

        {/* Card 3: Rejected */}
        <div
          onClick={() => handleCardClick('rejected')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-32 hover:border-slate-300 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{summary?.rejected ?? 1}</p>
            <p className="text-xs font-semibold text-slate-500">Rejected</p>
          </div>
        </div>

        {/* Card 4: Approved */}
        <div
          onClick={() => handleCardClick('approved')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-32 hover:border-slate-300 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{summary?.approved ?? 0}</p>
            <p className="text-xs font-semibold text-slate-500">Approved</p>
          </div>
        </div>
      </div>

      {/* ==================== DEPT STAFF PROMO ENTRY ROW ==================== */}
      <section id="entry-section" className="bg-white rounded-2xl border border-emerald-300 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-md">
              Dept Staff Input
            </span>
            <h3 className="text-sm font-bold text-slate-800">Add Promotion Line (11 Input Fields Only)</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Calculated Duration:{' '}
            <strong className="text-emerald-700 font-bold">{calculatedDays} Days</strong> (To - From + 1)
          </span>
        </div>

        {/* 11 Input Fields Grid */}
        <div className="grid grid-cols-12 gap-3 items-end">
          {/* 1. Promo Type */}
          <div className="col-span-12 sm:col-span-4 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Promo Type</label>
            <select
              value={promoType}
              onChange={(e) => setPromoType(e.target.value)}
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
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* 3. To Date */}
          <div className="col-span-6 sm:col-span-4 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* 4. DC Product Code / Search Master */}
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <label className="block text-xs font-bold text-emerald-700 mb-1.5">
              DC Product Code / Search Master
            </label>
            <div className="relative">
              <input
                type="text"
                value={dcCode}
                onChange={(e) => handleDcCodeChange(e.target.value)}
                placeholder="e.g. 100245, 100391, 100517, or 3000432"
                className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 5. My POS Code */}
          <div className="col-span-4 sm:col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">My POS Code</label>
            <input
              type="text"
              readOnly
              value={posCode}
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
              value={supDisc}
              onChange={(e) => setSupDisc(Number(e.target.value))}
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
              value={sparDisc}
              onChange={(e) => setSparDisc(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Sub-row Options */}
        <div className="grid grid-cols-12 gap-3 items-end pt-2 border-t border-slate-100">
          {/* 8. Outlets */}
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Outlets</label>
            <select
              value={outlets}
              onChange={(e) => setOutlets(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
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
              value={tabloid}
              onChange={(e) => setTabloid(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
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
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Promo remarks..."
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
            />
          </div>

          {/* 11. Action Button */}
          <div className="col-span-12 sm:col-span-4 md:col-span-2">
            <button
              onClick={handleAddLine}
              className="w-full bg-[#007d32] hover:bg-[#00682a] text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add to Promo List
            </button>
          </div>
        </div>
      </section>

      {/* ==================== RECENT PROMO LISTS TABLE ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">Recent promo lists</h2>
            {isLoading && <span className="text-xs text-slate-400 font-medium">Syncing...</span>}
          </div>
          <button
            onClick={() => navigate(isHead ? '/head-review' : '/promo-view')}
            className="text-xs font-bold text-[#e31e24] hover:underline"
          >
            View all {recentPromos.length > 0 ? `(${recentPromos.length})` : ''}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#eaf1ec] text-[#2c533e] font-bold border-b border-[#d8e6dc]">
                <th className="py-3 px-3 whitespace-nowrap">Food / Non Food / Fresh</th>
                <th className="py-3 px-3 whitespace-nowrap">Promo type</th>
                <th className="py-3 px-3 whitespace-nowrap">From</th>
                <th className="py-3 px-3 whitespace-nowrap">To</th>
                <th className="py-3 px-3 whitespace-nowrap">Days</th>
                <th className="py-3 px-3 whitespace-nowrap">Dept</th>
                <th className="py-3 px-3 whitespace-nowrap">Sub dept</th>
                <th className="py-3 px-3 whitespace-nowrap">Product class</th>
                <th className="py-3 px-3 whitespace-nowrap">Segment</th>
                <th className="py-3 px-3 whitespace-nowrap">DC Product Code</th>
                <th className="py-3 px-3 whitespace-nowrap">MY POS code</th>
                <th className="py-3 px-3 whitespace-nowrap">Product Barcode</th>
                <th className="py-3 px-3 whitespace-nowrap">Product Description</th>
                <th className="py-3 px-3 whitespace-nowrap text-right">Promo Price (LKR)</th>
                <th className="py-3 px-3 whitespace-nowrap text-right">Margin %</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {lines.map((r, idx) => {
                const math = calculateLineMath(r);
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 text-slate-700">{r.food}</td>
                    <td className="py-3 px-3 text-slate-700">{r.promo}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{r.from}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{r.to}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{r.days}</td>
                    <td className="py-3 px-3 text-slate-700">{r.dept}</td>
                    <td className="py-3 px-3 text-slate-700">{r.subDept}</td>
                    <td className="py-3 px-3 text-slate-600">{r.pClass}</td>
                    <td className="py-3 px-3 text-slate-600">{r.segment}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{r.dc}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{r.pos}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{r.barcode}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">{r.desc}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-800">
                      Rs. {math.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-700">{math.margin}%</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleDeleteLine(idx)}
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
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {lines.length} of {lines.length} active promo items</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white border border-slate-200 rounded font-semibold hover:bg-slate-50">
              Previous
            </button>
            <button className="px-3 py-1 bg-[#007d32] hover:bg-[#00682a] text-white rounded font-semibold transition">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
