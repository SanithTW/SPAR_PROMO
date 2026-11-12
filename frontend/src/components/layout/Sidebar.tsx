import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileEdit,
  CheckSquare,
  Eye,
  Users,
  Settings,
  ShieldAlert,
  Database,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { RoleType } from '../../types/index.js';
import { fetchHeadReviewList } from '../../services/promoService.js';

interface NavItemConfig {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles?: RoleType[];
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const loadPendingCount = async () => {
      if (user?.role === 'HEAD' || user?.role === 'ADMIN') {
        try {
          const items = await fetchHeadReviewList({ status: 'SUBMITTED_TO_HEAD' });
          if (isMounted) {
            setPendingCount(items.length);
          }
        } catch {
          // silently handle background count error
        }
      } else {
        if (isMounted) setPendingCount(null);
      }
    };

    loadPendingCount();
    const interval = setInterval(loadPendingCount, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const navigation: NavItemConfig[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      name: 'Calendar',
      path: '/calendar',
      icon: <CalendarDays className="w-4 h-4" />,
    },
    {
      name: 'Promo entry',
      path: '/promo-entry',
      icon: <FileEdit className="w-4 h-4" />,
      roles: ['STAFF', 'HEAD', 'ADMIN'],
    },
    {
      name: 'View',
      path: '/approved-promos',
      icon: <Eye className="w-4 h-4" />,
      roles: ['STAFF', 'MARKETING', 'HEAD', 'ADMIN'],
    },
    {
      name: 'Head Review',
      path: '/head-review',
      icon: <CheckSquare className="w-4 h-4" />,
      roles: ['HEAD', 'ADMIN'],
      badge: pendingCount !== null && pendingCount > 0 ? `${pendingCount}` : undefined,
    },
    {
      name: 'Users & Departments',
      path: '/users-departments',
      icon: <Users className="w-4 h-4" />,
      roles: ['ADMIN'],
    },
    {
      name: 'Master Data',
      path: '/master-data',
      icon: <Database className="w-4 h-4" />,
      roles: ['MASTER_DATA', 'ADMIN'],
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: <Settings className="w-4 h-4" />,
      roles: ['STAFF', 'MARKETING', 'HEAD', 'ADMIN'],
    },
    {
      name: 'Audit',
      path: '/audit',
      icon: <ShieldAlert className="w-4 h-4" />,
      roles: ['HEAD', 'ADMIN'],
    },
  ];

  const filteredNav = navigation.filter((item) => {
    if (!item.roles) return true;
    return hasRole(item.roles);
  });

  const displayName = user ? user.name || `${user.firstName} ${user.lastName}`.trim() : 'SPAR User';
  const displayDept = user?.department ? user.department.name : null;
  const initials = user
    ? `${user.firstName ? user.firstName[0] : ''}${user.lastName ? user.lastName[0] : ''}`.toUpperCase() || 'SP'
    : 'SP';

  const roleLabel = user?.role === 'STAFF' ? 'Dept Staff' : user?.role === 'HEAD' ? 'Dept Head' : user?.role || 'Staff';
  const displaySubtitle = displayDept ? `${roleLabel} - ${displayDept}` : roleLabel;

  return (
    <aside className="w-64 bg-[#003818] text-white flex flex-col justify-between flex-shrink-0 z-20 shadow-2xl min-h-screen select-none">
      <div>
        {/* SPAR Brand Logo */}
        <div className="p-4 pb-2">
          <div className="bg-white rounded-xl p-2.5 flex items-center justify-center shadow-md">
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
        </div>

        <div className="px-6 py-2">
          <p className="text-[11px] font-bold tracking-widest text-[#54c78a] uppercase">Promo Approval</p>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-2 px-3 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-xl text-sm transition ${
                  isActive
                    ? 'font-bold bg-[#007d32] text-white shadow-inner'
                    : 'font-semibold text-emerald-100/70 hover:bg-[#005e26] hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="bg-[#e31e24] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Profile Badge & Logout */}
      <div className="p-4 m-3 bg-[#004c1f] rounded-2xl flex items-center justify-between border border-[#00682a]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#d9222a] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
            {initials}
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-white truncate leading-tight">{displayName}</p>
            <p className="text-[10px] text-emerald-300/80 truncate">{displaySubtitle}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="bg-[#e31e24] hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow transition flex-shrink-0"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};
