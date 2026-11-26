import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';

export const AppLayout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the page changes.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased overflow-hidden relative selection:bg-emerald-500 selection:text-white">
      {/* Subtle ambient lighting matching Login workspace */}
      <div className="pointer-events-none fixed top-16 right-12 h-72 w-72 rounded-full bg-[#E31B23]/[0.03] blur-[110px]" />
      <div className="pointer-events-none fixed bottom-10 left-72 h-72 w-72 rounded-full bg-[#007D32]/[0.04] blur-[110px]" />

      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Header onMenuClick={() => setMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
