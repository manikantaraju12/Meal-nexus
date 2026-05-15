import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = {
  donor: [
    { label: 'Dashboard', path: '/donor/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Donate Food', path: '/donor/donate', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
    { label: 'My Donations', path: '/donor/donations', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Campaigns', path: '/campaigns', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  ],
  ngo: [
    { label: 'Dashboard', path: '/ngo/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'My Donations', path: '/ngo/donations', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { label: 'Campaigns', path: '/campaigns', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  ],
  volunteer: [
    { label: 'Dashboard', path: '/volunteer/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'My Tasks', path: '/volunteer/tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  ],
  admin: [
    { label: 'Overview', path: '/admin/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Users', path: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Donations', path: '/admin/donations', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { label: 'Tasks', path: '/admin/tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  ],
};

const ROLE_LABELS = {
  donor: 'Donor Portal',
  ngo: 'NGO Portal',
  volunteer: 'Volunteer',
  admin: 'Admin Panel',
};

const ROLE_COLORS = {
  donor: 'from-emerald-500 to-teal-500',
  ngo: 'from-blue-500 to-indigo-500',
  volunteer: 'from-orange-500 to-amber-500',
  admin: 'from-purple-500 to-pink-500',
};

const Layout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = NAV_ITEMS[user?.role] || [];
  const roleLabel = ROLE_LABELS[user?.role] || 'Dashboard';
  const roleGradient = ROLE_COLORS[user?.role] || 'from-emerald-500 to-teal-500';

  return (
    <div className="flex min-h-screen relative">
      {/* Decorative orbs */}
      <div className="orb w-96 h-96" style={{ top: '-10%', left: '-5%', background: 'radial-gradient(circle, #10b981, transparent)' }} />
      <div className="orb w-80 h-80" style={{ bottom: '10%', right: '5%', background: 'radial-gradient(circle, #0d9488, transparent)', animationDelay: '4s' }} />

      {/* Sidebar */}
      <aside
        className="glass-dark flex flex-col relative z-10 transition-all duration-300"
        style={{ width: collapsed ? '4.5rem' : '15rem', minHeight: '100vh' }}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3" style={{ minHeight: '4.5rem' }}>
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleGradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <span className="text-white font-bold text-sm">MN</span>
          </div>
          {!collapsed && (
            <div>
              <div className="font-bold text-white text-sm leading-tight">MealNexus</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{roleLabel}</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-white/40 hover:text-white/80 transition flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
            </svg>
          </button>
        </div>

        <div className="section-divider mx-3 my-0" />

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${active ? 'nav-item-active' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User profile + logout */}
        <div className="p-3">
          <div className="section-divider mb-3" />
          <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleGradient} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                <div className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.45)' }}>{user?.role}</div>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={`nav-item w-full mt-1 text-red-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-300 ${collapsed ? 'justify-center' : ''}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="glass border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-10" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(20px)' }}>
          <div>
            <h1 className="text-lg font-bold text-white">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="text-sm text-white/60">
              Welcome, <span className="text-white font-medium">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
