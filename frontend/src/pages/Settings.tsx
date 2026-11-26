import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Input } from '../components/common/Input.js';
import { Button } from '../components/common/Button.js';
import { useAuth } from '../contexts/AuthContext.js';
import { getRoleTheme } from '../utils/roleTheme.js';
import { Shield, Database, Bell, CheckCircle2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const roleTheme = getRoleTheme(user?.role);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSavePreferences = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Account & System Settings"
        description="User preferences, retail department configuration, and governance profile."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Settings' }]}
      />

      {/* Profile Card */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/[0.04] overflow-hidden">
        <div className={`h-1 w-full bg-gradient-to-r ${roleTheme.accentBar}`} />
        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#007D32]" /> User Profile Information
            </h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${roleTheme.badgeClass}`}
            >
              {roleTheme.label} · {roleTheme.badge}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First Name" defaultValue={user?.firstName} disabled />
            <Input label="Last Name" defaultValue={user?.lastName} disabled />
            <Input label="Email Address" defaultValue={user?.email} disabled />
            <Input label="Assigned Role" defaultValue={user?.role} disabled />
          </div>

          <div>
            <Input
              label="Department Assignment"
              defaultValue={
                user?.department
                  ? `${user.department.name} (${user.department.code})`
                  : 'Cross-Department / Enterprise'
              }
              disabled
            />
          </div>
        </div>
      </section>

      {/* System Governance Card */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/[0.04] overflow-hidden">
        <div className="p-6 sm:p-7 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
            <Database className="w-4 h-4 text-[#007D32]" /> Promotional Workflow Rules
          </h3>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center justify-between gap-4 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <div>
                <p className="font-bold text-slate-900">Final Approval Authority</p>
                <p className="text-slate-500 mt-0.5">
                  Department Head sign-off releases promo directly to Marketing
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-[#007D32] border border-emerald-200 font-bold text-[11px] rounded-lg whitespace-nowrap">
                Department Head
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <div>
                <p className="font-bold text-slate-900">Director Stage Exclusion</p>
                <p className="text-slate-500 mt-0.5">
                  Director approval layer has been permanently eliminated
                </p>
              </div>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] rounded-lg whitespace-nowrap">
                Bypassed / Removed
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <div>
                <p className="font-bold text-slate-900">Rejection Protocol</p>
                <p className="text-slate-500 mt-0.5">
                  Requires Head comment and routes back to Staff submitter
                </p>
              </div>
              <span className="px-2.5 py-1 bg-red-50 text-[#E31B23] border border-red-200 font-bold text-[11px] rounded-lg whitespace-nowrap">
                Enforced
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications Card */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/[0.04] overflow-hidden">
        <div className="p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#007D32]" /> Notifications & Alerts
            </h3>
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#007D32]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Preferences saved
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition">
              <div>
                <p className="text-xs font-bold text-slate-900">In-App Workflow Alerts</p>
                <p className="text-[11px] text-slate-500">
                  Real-time bell notifications for submissions, approvals, and returns
                </p>
              </div>
              <input
                type="checkbox"
                checked={inAppAlerts}
                onChange={(e) => setInAppAlerts(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#007D32] focus:ring-[#007D32]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition">
              <div>
                <p className="text-xs font-bold text-slate-900">Email Digest Summaries</p>
                <p className="text-[11px] text-slate-500">
                  Notifications for pending Head reviews and Marketing release events
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#007D32] focus:ring-[#007D32]"
              />
            </label>
          </div>

          <div className="pt-1">
            <Button variant="primary" size="sm" onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
