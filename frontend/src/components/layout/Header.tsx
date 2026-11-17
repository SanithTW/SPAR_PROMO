import React from 'react';
import { Menu } from 'lucide-react';
import { NotificationBell } from './NotificationBell.js';
import { QuickSearch } from './QuickSearch.js';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {/* Opens the sidebar drawer on small screens */}
        <button
          onClick={onMenuClick}
          className="lg:hidden -ml-1 p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <QuickSearch />
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <NotificationBell />
      </div>
    </header>
  );
};
