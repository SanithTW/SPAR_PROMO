import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { Button } from '../components/common/Button.js';
import { AuditLogItem } from '../types/index.js';
import { fetchAuditLogs } from '../services/promoService.js';
import { formatDateTime } from '../utils/formatters.js';
import { ShieldCheck, RefreshCw } from 'lucide-react';

export const Audit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (l) => <span className="text-slate-500 font-mono text-[11px]">{formatDateTime(l.createdAt)}</span>,
    },
    {
      key: 'action',
      header: 'Action Performed',
      render: (l) => {
        const isApproved = l.action.includes('APPROVED');
        const isRejected = l.action.includes('REJECTED');
        const isLogin = l.action.includes('LOGIN');

        let badge = 'bg-slate-100 text-slate-700 border-slate-200';
        if (isApproved) badge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        if (isRejected) badge = 'bg-rose-50 text-rose-800 border-rose-200';
        if (isLogin) badge = 'bg-blue-50 text-blue-700 border-blue-200';

        return (
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${badge}`}>
            {l.action}
          </span>
        );
      },
    },
    {
      key: 'performer',
      header: 'Actor',
      render: (l) => (
        <div>
          <span className="font-semibold text-slate-900 block">
            {l.performer ? `${l.performer.firstName} ${l.performer.lastName}` : 'System'}
          </span>
          <span className="text-[10px] text-slate-500">{l.performer?.email || 'Automated'}</span>
        </div>
      ),
    },
    {
      key: 'entityType',
      header: 'Target Entity',
      render: (l) => <span className="text-slate-600 font-medium">{l.entityType}</span>,
    },
    {
      key: 'details',
      header: 'Audit Description',
      render: (l) => <span className="text-slate-700 max-w-md block truncate">{l.details || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit Trail & Compliance"
        description="Immutable chronological record of promotional creations, submissions, Head approvals, rejections, and access logs."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Audit Trail' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Logs
          </Button>
        }
      />

      <div className="p-4 sm:px-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-slate-700 flex items-start gap-3.5 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 text-[#007D32] flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-slate-900 block mb-0.5">Enterprise Compliance & Immutable Logging</span>
          Every promotional workflow state change is recorded with user identity, timestamp, and IP address to guarantee compliance with SPAR commercial auditing standards.
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        keyExtractor={(l) => l.id}
        isLoading={isLoading}
        emptyTitle="No audit records yet"
      />
    </div>
  );
};
