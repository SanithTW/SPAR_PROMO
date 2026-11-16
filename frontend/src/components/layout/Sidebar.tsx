import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { fetchHeadReviewList } from '../../services/promoService.js';
import { NavItem, navItemsFor, roleLabel } from './navigation.js';

interface SidebarProps {
  /** Below the lg breakpoint the sidebar is a drawer; this controls whether it is showing. */
  mobileOpen: boolean;
  onClose: () => void;
}

const SECTIONS: NavItem['section'][] = ['Promotions', 'Administration', 'Account'];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const loadPendingCount = async () => {
      if (user?.role === 'HEAD' || user?.role === 'ADMIN') {
        try {
          const items = await fetchHeadReviewList({ status: 'SUBMITTED_TO_HEAD' });
          if (isMounted) setPendingCount(items.length);
        } catch {
          // silently handle background count error
        }
      } else if (isMounted) {
        setPendingCount(null);
      }
    };

    loadPendingCount();
    const interval = setInterval(loadPendingCount, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const items = navItemsFor(user?.role);

  const displayName = user ? user.name || `${user.firstName} ${user.lastName}`.trim() : 'SPAR User';
  const initials = user
    ? `${user.firstName ? user.firstName[0] : ''}${user.lastName ? user.lastName[0] : ''}`.toUpperCase() || 'SP'
    : 'SP';
  const displaySubtitle = user?.department
    ? `${roleLabel(user.role)} · ${user.department.name}`
    : roleLabel(user?.role);

  return (
    <>
      {/* Dimmed backdrop behind the drawer on small screens */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#003818] text-white flex flex-col flex-shrink-0 shadow-2xl select-none transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        {/* SPAR Brand Logo */}
        <div className="p-4 pb-2 flex items-start gap-2">
          <div className="flex-1 bg-white rounded-xl p-2.5 flex items-center justify-center shadow-md">
            <img
              src="/spar-logo.png"
              alt="SPAR"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/spar-logo_2.png')) {
                  target.src = '/spar-logo_2.png';
                }
              }}
            />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-emerald-100/80 hover:bg-[#005e26] hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-2">
          <p className="text-[11px] font-bold tracking-widest text-[#54c78a] uppercase">Promo Approval</p>
        </div>

        {/* Navigation Menu, grouped so admin tools sit apart from daily promo work */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5 mt-1">
          {SECTIONS.map((section, sectionIndex) => {
            const sectionItems = items.filter((i) => i.section === section);
            if (sectionItems.length === 0) return null;
            return (
              <div key={section}>
                {/* The first group sits right under "Promo Approval", so it needs no heading of its own. */}
                {sectionIndex > 0 && (
                  <p className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200/50">
                    {section}
                  </p>
                )}
                <div className="space-y-0.5">
                  {sectionItems.map((item) => {
                    const Icon = item.icon;
                    const badge =
                      item.path === '/head-review' && pendingCount !== null && pendingCount > 0
                        ? pendingCount
                        : null;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        title={item.description}
                        className={({ isActive }) =>
                          `group flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#54c78a] ${
                            isActive
                              ? 'font-bold bg-[#007d32] text-white shadow-inner'
                              : 'font-semibold text-emerald-100/75 hover:bg-[#005e26] hover:text-white'
                          }`
                        }
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </span>
                        {badge !== null && (
                          <span
                            className="bg-[#e31e24] text-white text-[10px] font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full shadow-sm"
                            title={`${badge} waiting for your review`}
                          >
                            {badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Signed-in user and sign out */}
        <div className="p-3 m-3 mt-0 bg-[#004c1f] rounded-2xl border border-[#00682a] space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#d9222a] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate leading-tight" title={displayName}>
                {displayName}
              </p>
              <p className="text-[11px] text-emerald-300/90 truncate" title={displaySubtitle}>
                {displaySubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#00682a] bg-[#003818] hover:bg-[#e31e24] hover:border-[#e31e24] text-emerald-50 text-xs font-bold py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#54c78a]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};
