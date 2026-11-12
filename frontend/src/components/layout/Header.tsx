import React from 'react';
import { Search } from 'lucide-react';
import { NotificationBell } from './NotificationBell.js';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery = '',
  onSearchChange = () => {},
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-3">
        {/* Responsive Brand Logo on small screens */}
        <div className="md:hidden flex-shrink-0">
          <img
            src="/spar-logo.png"
            alt="SPAR Logo"
            className="h-6 w-auto object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith('/spar-logo_2.png')) {
                target.src = '/spar-logo_2.png';
              }
            }}
          />
        </div>

        {/* Top Search Input matching user design */}
        <div className="relative w-64 sm:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search lists, products, DC codes..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Notifications */}
      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  );
};
