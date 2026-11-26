import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Database, Package, Tag, Layers, ArrowRight, CheckCircle2, List as ListIcon } from 'lucide-react';
import { MetricCard } from '../components/common/MetricCard.js';

export const MasterData: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Master Data & SKU Catalog"
        description="Master Data workspace to manage SKU definitions, VAT rates, and promotional base configurations."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Master Data' }]}
        actions={
          <button
            onClick={() => navigate('/list')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#007D32] hover:bg-[#00682a] text-white text-xs font-bold px-3.5 py-2 transition cursor-pointer"
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>View Approved SKU Lines</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Active SKU Catalog"
          value="1,248"
          subtitle="Managed master retail items"
          icon={<Package className="w-5 h-5" />}
          color="green"
        />
        <MetricCard
          title="Promotional Mechanisms"
          value="5"
          subtitle="Leaflet, Catalogue, Specials"
          icon={<Tag className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Retail Categories"
          value="24"
          subtitle="Synchronized with ERP"
          icon={<Layers className="w-5 h-5" />}
          color="slate"
        />
      </div>

      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/[0.04] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#E31B23] via-amber-500 to-[#007D32]" />
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              Master Data Governance Active
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Product Master & POS Pricing Integration
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Role-based access is active for Master Data Specialists. Live SKU lookups, base NMRP costs, VAT configurations, and supplier funding rules feed directly into Commercial Staff promo sheets.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-2.5">
            {[
              { label: 'Product Master API Sync', status: 'Configured' },
              { label: 'Promotional Mechanism Table', status: '5 Active Types' },
              { label: 'Approved SKU Line Feed', status: 'Live Read Access' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 text-xs"
              >
                <span className="font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#007D32]" />
                  {item.label}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#007D32] font-bold text-[11px]">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
