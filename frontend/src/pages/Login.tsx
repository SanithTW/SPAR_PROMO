import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  LockKeyhole,
  CalendarDays,
  Headphones,
  Layers
} from 'lucide-react';

type RoleKey = 'staff' | 'head' | 'marketing' | 'admin';

interface RolePreset {
  key: RoleKey;
  label: string;
  department: string;
  badge: string;
  badgeColor: string;
  email: string;
}

const ROLE_PRESETS: RolePreset[] = [
  {
    key: 'staff',
    label: 'Commercial Staff',
    department: 'Fresh Produce',
    badge: 'Planner',
    badgeColor: 'bg-emerald-50 text-[#007D32] border-emerald-200',
    email: 'staff.fresh@spar.internal',
  },
  {
    key: 'head',
    label: 'Department Head',
    department: 'Fresh Produce',
    badge: 'Final Approver',
    badgeColor: 'bg-red-50 text-[#E31B23] border-red-200',
    email: 'head.fresh@spar.internal',
  },
  {
    key: 'marketing',
    label: 'Marketing Team',
    department: 'Cross-Dept',
    badge: 'Export',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    email: 'marketing@spar.internal',
  },
  {
    key: 'admin',
    label: 'System Admin',
    department: 'Enterprise',
    badge: 'Admin',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    email: 'admin@spar.internal',
  },
];

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('staff.fresh@spar.internal');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRoleKey, setActiveRoleKey] = useState<RoleKey>('staff');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter your work username or email.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      let loginIdentifier = username.trim();
      if (!loginIdentifier.includes('@')) {
        loginIdentifier = `${loginIdentifier}@spar.internal`;
      }

      await login(loginIdentifier, password);

      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid work credentials. Please verify your email and password.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: RolePreset) => {
    setActiveRoleKey(preset.key);
    setUsername(preset.email);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0a1612] font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* ==================== LEFT ENTERPRISE SHOWCASE PANEL (50%) ==================== */}
      <aside className="relative hidden lg:flex w-1/2 min-w-[500px] max-w-[740px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#041a10] via-[#00381e] to-[#02140b] p-12 xl:p-16 text-white select-none border-r border-emerald-950/40 shadow-2xl">
        {/* Ambient Subtle Lighting (SPAR Emerald + Subtle Crimson Flare) */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-emerald-500/18 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 -right-40 h-[480px] w-[480px] rounded-full bg-[#E31B23]/14 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-36 left-10 h-80 w-80 rounded-full bg-[#E31B23]/8 blur-[100px]" />

        {/* Faint Architectural Grid Lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}
        />

        {/* Background Watermark SPAR Tree Badge */}
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-[380px] w-[380px] opacity-[0.05] transform rotate-6">
          <img src="/spar-tree.svg" alt="" className="w-full h-full object-contain filter invert brightness-200" />
        </div>

        {/* Top Header & Brand Identity */}
        <div className="relative z-10">
          {/* Top Brand Stripe Accent (SPAR Red & SPAR Green) */}
          <div className="flex items-center gap-2 mb-8">
            <div className="h-1.5 w-12 rounded-full bg-[#E31B23] shadow-sm shadow-red-900/50" />
            <div className="h-1.5 w-20 rounded-full bg-[#007D32] shadow-sm shadow-emerald-900/50" />
            <div className="h-1.5 w-3 rounded-full bg-white/20" />
          </div>

          {/* Logo Card & Live Status Pill */}
          <div className="flex flex-wrap items-center gap-3.5 mb-10">
            <div className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 shadow-xl shadow-black/30 ring-1 ring-white/25">
              <img
                src="/spar-logo.png"
                alt="SPAR Logo"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/spar-logo_2.png')) {
                    target.src = '/spar-logo_2.png';
                  }
                }}
              />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3.5 py-1.5 backdrop-blur-md border border-white/15 text-xs font-medium text-emerald-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E31B23] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E31B23]" />
              </span>
              <span className="tracking-wide text-[10.5px] font-bold uppercase text-red-200">
                Commercial Promo Portal
              </span>
            </div>
          </div>

          {/* Hero Headlines */}
          <h1 className="text-4xl xl:text-[44px] font-black leading-[1.12] tracking-tight text-white mb-4">
            Commercial Promotion <br />
            <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">
              Planning & Governance
            </span>
          </h1>

          <p className="max-w-lg text-[14px] font-normal leading-relaxed text-emerald-100/80 mb-10">
            Centralized promotional lifecycle management for SPAR retail operations. Access departmental promo lists, verify live POS margins, and submit for atomic Department Head approval.
          </p>

          {/* Clean Operational Context Card (Internal Employee Context) */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md shadow-2xl shadow-black/25 overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-[#E31B23] via-emerald-400 to-[#007D32]" />
            <div className="p-6 space-y-4">
              {/* Operational Cycle Info */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-white/10">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                  <CalendarDays className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/90">
                    Active Commercial Cycle
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    Weekly Leaflet & Monthly Catalogue Planning
                  </div>
                  <div className="text-xs text-emerald-100/60 mt-0.5">
                    Submissions close every Wednesday at 17:00
                  </div>
                </div>
              </div>

              {/* Department Scopes */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-white/10">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                  <Layers className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/90">
                    Governed Retail Categories
                  </div>
                  <div className="text-xs text-white/90 mt-1 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-black/30 border border-white/10 text-[11px] text-emerald-200 font-medium">
                      Fresh Produce & Butchery
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/30 border border-white/10 text-[11px] text-emerald-200 font-medium">
                      Packaged Food & Dairy
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/30 border border-white/10 text-[11px] text-emerald-200 font-medium">
                      Non-Food & Household
                    </span>
                  </div>
                </div>
              </div>

              {/* Internal Commercial Helpdesk */}
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                  <Headphones className="w-4 h-4 text-red-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-red-200/90">
                    Internal Support & Master Data
                  </div>
                  <div className="text-xs text-emerald-100/70 mt-0.5">
                    Commercial Helpdesk: Ext. 2400 · <span className="text-white font-medium">retailops@spar.lk</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Brand Line */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-[11px] text-emerald-200/70 font-medium">
          <span>SPAR Sri Lanka (Pvt) Ltd · Commercial Operations</span>
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            System v1.4 Online
          </span>
        </div>
      </aside>

      {/* ==================== RIGHT AUTHENTICATION SUITE (50%) ==================== */}
      <main className="flex flex-1 items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#F8FAFC] relative">
        {/* Subtle Decorative Ambient Lighting */}
        <div className="pointer-events-none absolute top-10 right-10 h-72 w-72 rounded-full bg-[#E31B23]/4 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-10 left-10 h-72 w-72 rounded-full bg-[#007D32]/5 blur-[100px]" />

        <div className="w-full max-w-[460px] relative z-10">
          {/* Executive Sign-In Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/5 overflow-hidden">
            {/* Top Signature Brand Bar (SPAR Red to SPAR Green) */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#E31B23] via-[#E31B23] to-[#007D32]" />

            <div className="p-8 sm:p-10">
              {/* Mobile Header (Shown on tablet / mobile) */}
              <div className="lg:hidden mb-8 flex items-center justify-between pb-6 border-b border-slate-100">
                <img
                  src="/spar-logo.png"
                  alt="SPAR Logo"
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith('/spar-logo_2.png')) {
                      target.src = '/spar-logo_2.png';
                    }
                  }}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E31B23] bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                  Internal Portal
                </span>
              </div>

              {/* Card Title & Description */}
              <div className="mb-7">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900">
                    Sign in
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-[#E31B23] border border-red-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E31B23]" />
                    SPAR Intranet
                  </span>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Enter your commercial credentials to access the promotional approval dashboard.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5 animate-in fade-in duration-200 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-[#E31B23] flex-shrink-0 mt-0.5" />
                  <div className="font-semibold leading-normal">{error}</div>
                </div>
              )}

              {/* Interactive Segmented Role Switcher */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Select Workspace Role (Dev)</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">Password123!</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {ROLE_PRESETS.map((preset) => {
                    const isSelected = activeRoleKey === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2.5 text-left rounded-xl border transition-all text-xs cursor-pointer ${
                          isSelected
                            ? 'border-[#007D32] bg-emerald-50/70 ring-2 ring-[#007D32]/15 shadow-xs'
                            : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold block text-[11px] ${isSelected ? 'text-[#007D32]' : 'text-slate-800'}`}>
                            {preset.label}
                          </span>
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${preset.badgeColor}`}>
                            {preset.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                          {preset.department}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Work Email or ID
                  </label>
                  <div className="relative flex items-center">
                    <User size={17} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. staff.fresh@spar.internal"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm font-medium text-slate-900 transition focus:border-[#007D32] focus:bg-white focus:ring-4 focus:ring-[#007D32]/10 focus:outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <a
                      href="#admin-contact"
                      className="text-[11px] font-semibold text-[#E31B23] hover:text-[#b5141a] hover:underline transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <Lock size={17} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-11 text-sm font-medium text-slate-900 transition focus:border-[#007D32] focus:bg-white focus:ring-4 focus:ring-[#007D32]/10 focus:outline-none placeholder:text-slate-400 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center select-none pt-1">
                  <label
                    className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600"
                    onClick={() => setRememberMe(!rememberMe)}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-md border transition-all ${
                        rememberMe
                          ? 'bg-[#007D32] border-[#007D32] shadow-sm shadow-emerald-800/20'
                          : 'bg-white border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {rememberMe && <Check size={12} className="stroke-[3] text-white" />}
                    </div>
                    <span>Keep me authenticated for 24 hours</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-[#007D32] to-[#005E26] hover:from-[#006F2C] hover:to-[#005221] font-bold text-white shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer border-t border-white/20 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Promotional Console</span>
                      <ArrowRight className="w-4 h-4 text-emerald-200 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Security Compliance Seal */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#007D32]" />
                  <span>256-Bit SSL · RBAC Enforced</span>
                </span>
                <span className="flex items-center gap-1">
                  <LockKeyhole className="w-3 h-3 text-slate-400" />
                  <span>SPAR Internal Network</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;