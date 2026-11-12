import React from 'react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Input } from '../components/common/Input.js';
import { Button } from '../components/common/Button.js';
import { useAuth } from '../contexts/AuthContext.js';
import { Shield, Database, Bell } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Account & System Settings"
        description="User preferences, retail department configuration, and security settings."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Settings' }]}
      />

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-spar-green" /> User Profile Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="First Name" defaultValue={user?.firstName} disabled />
          <Input label="Last Name" defaultValue={user?.lastName} disabled />
          <Input label="Email Address" defaultValue={user?.email} disabled />
          <Input label="Assigned Role" defaultValue={user?.role} disabled />
        </div>

        <div className="pt-2">
          <Input
            label="Department Assignment"
            defaultValue={user?.department ? `${user.department.name} (${user.department.code})` : 'Cross-Department / Enterprise'}
            disabled
          />
        </div>
      </div>

      {/* System Governance Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-spar-green" /> Promotional Workflow Rules
        </h3>

        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="font-semibold text-slate-800">Final Approval Authority</p>
              <p className="text-slate-500">Department Head sign-off releases promo directly to Marketing</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
              Department Head
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="font-semibold text-slate-800">Director Stage Exclusion</p>
              <p className="text-slate-500">Director approval layer has been permanently eliminated</p>
            </div>
            <span className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold text-xs rounded-full">
              Bypassed / Removed
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="font-semibold text-slate-800">Rejection Protocol</p>
              <p className="text-slate-500">Requires Head comment and routes back to Staff submitter</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full">
              Enforced
            </span>
          </div>
        </div>
      </div>

      {/* Notifications Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4 text-spar-green" /> Notifications & Alerts
        </h3>
        <p className="text-xs text-slate-500">
          Email and in-app notifications for pending Head reviews and marketing release events.
        </p>
        <Button variant="outline" size="sm" onClick={() => alert('Preferences saved')}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
};
