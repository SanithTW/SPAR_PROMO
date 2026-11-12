import React from 'react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Database, Package, Tag, Layers } from 'lucide-react';
import { MetricCard } from '../components/common/MetricCard.js';

export const MasterData: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Master Data & SKU Catalog"
        description="Master Data workspace to manage SKU definitions, VAT rates, and promotional base configurations."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Master Data' }]}
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

      <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-spar-green flex items-center justify-center">
          <Database className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Master Data Management Foundation Active</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Role-based access is active for Master Data Specialists. Complete SKU catalog importing and external synchronization will follow in Phase 3.
        </p>
      </div>
    </div>
  );
};
