import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { User, Lock, Eye, EyeOff, Check, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('staff.fresh@spar.internal');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Username or email is required.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);

    try {
      // Allow entering either full email or username
      let loginIdentifier = username.trim();
      if (!loginIdentifier.includes('@')) {
        loginIdentifier = `${loginIdentifier}@spar.internal`;
      }

      await login(loginIdentifier, password);

      // Post-login destination
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setUsername(demoEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-800 antialiased">
      {/* ==================== LEFT RED HERO PANEL ==================== */}
      <aside className="relative hidden lg:flex w-[47%] min-w-[460px] max-w-[680px] flex-col justify-between overflow-hidden bg-[#ed1b24] p-16 text-white after:absolute after:bottom-0 after:left-0 after:h-3 after:w-full after:bg-[#007d32] after:content-[''] select-none">
        {/* Decorative Circle in Bottom Right */}
        <div className="pointer-events-none absolute -bottom-36 -right-28 h-[580px] w-[580px] rounded-full bg-[#d80027]" />

        <div className="relative z-10">
          {/* Logo Badge */}
          <div className="mb-16 inline-flex rounded-xl bg-white px-5 py-2.5 shadow-md">
            <img
              src="/spar-logo.png"
              alt="SPAR Logo"
              className="h-9 w-auto object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/spar-logo_2.png')) {
                  target.src = '/spar-logo_2.png';
                }
              }}
            />
          </div>

          <h1 className="mb-5 text-[42px] font-black leading-tight tracking-tight">
            Promo Approval<br />System
          </h1>
          <p className="mb-12 max-w-sm text-sm font-normal leading-relaxed text-white/95">
            One place for Fresh, Food and Non-Food promotions — from entry to Head approval to Marketing.
          </p>

          {/* Value Props */}
          <div className="space-y-6">
            {[
              'Enter promo lines with auto-filled product and POS data',
              'Head review & final approvals with comments',
              'Approved promos ready for Marketing to export',
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-4 text-sm font-medium">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check size={14} className="stroke-[3] text-white" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer brand stamp */}
        <div className="relative z-10 text-xs text-white/80 font-medium">
          SPAR Sri Lanka · Retail Operations & Commercial Excellence
        </div>
      </aside>

      {/* ==================== RIGHT LOGIN AREA ==================== */}
      <main className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo (only shown on small screens) */}
          <div className="lg:hidden mb-6 inline-flex rounded-xl bg-white p-2.5 shadow-md border border-slate-200">
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

          <h2 className="text-3xl font-black tracking-tight text-[#0d3822]">Sign in</h2>
          <p className="mt-1.5 mb-6 text-sm text-slate-500">
            Use the username and password given by your Admin.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-[#ed1b24] flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">Username</label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-3.5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. staff.fresh@spar.internal"
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 transition focus:border-[#007d32] focus:ring-4 focus:ring-[#007d32]/10 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">Password</label>
              <div className="relative flex items-center">
                <Lock size={18} className="absolute left-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-11 text-sm font-medium text-slate-800 transition focus:border-[#007d32] focus:ring-4 focus:ring-[#007d32]/10 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between text-xs font-medium">
              <label
                className="flex cursor-pointer items-center gap-2 select-none text-slate-700"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                    rememberMe ? 'bg-[#007d32] border-[#007d32]' : 'bg-white border-slate-300'
                  }`}
                >
                  {rememberMe && <Check size={12} className="stroke-[3] text-white" />}
                </div>
                <span>Remember me</span>
              </label>

              <a href="#admin-contact" className="text-slate-500 hover:text-[#007d32] hover:underline">
                Forgot password? Contact Admin
              </a>
            </div>

            {/* Sign In CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-lg bg-[#007d32] font-bold text-white shadow-md shadow-emerald-900/10 transition hover:bg-[#006629] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Quick Test Demo Credentials */}
          <div className="mt-8 pt-5 border-t border-slate-200">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Quick Test Accounts (Password: Password123!)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('staff.fresh@spar.internal')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
              >
                <span className="font-semibold text-slate-800 block">Commercial Staff</span>
                <span className="text-[10px] text-slate-500 truncate block">staff.fresh@spar.internal</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('head.fresh@spar.internal')}
                className="p-2 text-left rounded-lg border border-emerald-300 bg-emerald-50/40 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#007d32] block">Dept Head</span>
                  <span className="text-[9px] bg-[#007d32] text-white font-bold px-1 rounded">FINAL</span>
                </div>
                <span className="text-[10px] text-slate-500 truncate block">head.fresh@spar.internal</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('marketing@spar.internal')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
              >
                <span className="font-semibold text-slate-800 block">Marketing</span>
                <span className="text-[10px] text-slate-500 truncate block">marketing@spar.internal</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin@spar.internal')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
              >
                <span className="font-semibold text-slate-800 block">System Admin</span>
                <span className="text-[10px] text-slate-500 truncate block">admin@spar.internal</span>
              </button>
            </div>
          </div>

          <footer className="mt-8 text-center text-xs text-slate-400">
            SPAR Sri Lanka · Internal system · v1.0
          </footer>
        </div>
      </main>
    </div>
  );
};
