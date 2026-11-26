import React from 'react';
import { Menu } from 'lucide-react';
import { NotificationBell } from './NotificationBell.js';
import { QuickSearch } from './QuickSearch.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { getRoleTheme } from '../../utils/roleTheme.js';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const roleTheme = getRoleTheme(user?.role);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {/* Top Signature Brand Bar matching Login */}
      <div className="h-1 w-full bg-gradient-to-r from-[#E31B23] via-[#E31B23] to-[#007D32]" />
      <div className="h-15 py-2.5 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Opens the sidebar drawer on small screens */}
          <button
            onClick={onMenuClick}
            className="lg:hidden -ml-1 p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <QuickSearch />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {user && (
            <div className="hidden md:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-[#E31B23] border border-red-200">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E31B23]" />
                SPAR Intranet
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold ${roleTheme.badgeClass}`}
              >
                {roleTheme.label} · {roleTheme.badge}
              </span>
            </div>
          )}
          <NotificationBell />
        </div>
      </div>
    </header>
  );
};
