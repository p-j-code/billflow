import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectActiveBusiness } from '@/store/slices/businessSlice';
import { logoutThunk } from '@/store/slices/authSlice';
import { toggleSidebar, selectUI } from '@/store/slices/uiSlice';
import clsx from 'clsx';
import {
  LayoutDashboard, Users, Building2, Search,
  ChevronLeft, LogOut, Settings, Receipt,
  FileText, TrendingUp,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/invoices',  icon: Receipt,         label: 'Invoices'        },
  { to: '/notes',     icon: FileText,        label: 'Notes & Proforma'},
  { to: '/parties',   icon: Users,           label: 'Parties'         },
  { to: '/hsn',       icon: Search,          label: 'HSN / SAC'       },
  { to: '/reports',   icon: TrendingUp,      label: 'Reports'         },
  { to: '/business',  icon: Building2,       label: 'Business Setup'  },
];

export default function Sidebar() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { sidebarCollapsed: collapsed } = useSelector(selectUI);
  const activeBiz = useSelector(selectActiveBusiness);

  const handleLogout = async () => { await dispatch(logoutThunk()); navigate('/login'); };

  return (
    <aside className={clsx(
      'flex flex-col bg-surface border-r border-border transition-all duration-300 h-screen sticky top-0',
      collapsed ? 'w-[60px]' : 'w-[220px]'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center text-canvas font-display font-bold text-sm shrink-0">₹</div>
            <span className="font-display font-bold text-base text-primary tracking-tight">BillFlow</span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center text-canvas font-display font-bold text-sm mx-auto">₹</div>
        )}
        {!collapsed && (
          <button onClick={() => dispatch(toggleSidebar())} className="text-muted hover:text-primary transition-colors p-1 rounded">
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* Active business */}
      {!collapsed && activeBiz && (
        <div className="mx-3 mt-3 px-3 py-2 bg-card border border-border rounded-lg">
          <p className="text-xs text-muted mb-0.5 uppercase tracking-wider font-semibold">Active Business</p>
          <p className="text-xs text-primary font-semibold truncate">{activeBiz.name}</p>
          {activeBiz.gstin && <p className="text-xs text-muted font-mono">{activeBiz.gstin.slice(0, 10)}...</p>}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {!collapsed && <p className="text-xs text-muted uppercase tracking-wider font-semibold px-2 mb-2">Menu</p>}
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => clsx('sidebar-item', isActive && 'active', collapsed && 'justify-center')}
            title={collapsed ? label : undefined}>
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="text-sm">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-border space-y-0.5 shrink-0">
        {collapsed && (
          <button onClick={() => dispatch(toggleSidebar())} className="sidebar-item w-full justify-center" title="Expand">
            <ChevronLeft size={16} className="rotate-180" />
          </button>
        )}
        <NavLink to="/settings"
          className={({ isActive }) => clsx('sidebar-item', isActive && 'active', collapsed && 'justify-center')}
          title={collapsed ? 'Settings' : undefined}>
          <Settings size={16} className="shrink-0" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </NavLink>
        <button onClick={handleLogout}
          className={clsx('sidebar-item w-full hover:bg-danger/10 hover:text-danger', collapsed && 'justify-center')}
          title={collapsed ? 'Logout' : undefined}>
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
