import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: '📊', label: 'Dashboard', exact: true },
    ]
  },
  {
    label: 'Operations',
    items: [
      { path: '/stock-in', icon: '📥', label: 'Receive Stock' },
      { path: '/stock-out', icon: '📤', label: 'Dispatch Stock' },
    ]
  },
  {
    label: 'Management',
    roles: ['admin', 'manager'],
    items: [
      { path: '/audit', icon: '🔍', label: 'Stock Audit', roles: ['admin', 'manager'] },
      { path: '/reports', icon: '📈', label: 'Reports', roles: ['admin', 'manager'] },
      { path: '/suppliers', icon: '🏭', label: 'Suppliers', roles: ['admin', 'manager'] },
      { path: '/items', icon: '📦', label: 'Items Catalog', roles: ['admin', 'manager'] },
      { path: '/kitchens', icon: '🍳', label: 'Kitchens', roles: ['admin'] },
    ]
  }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🏪</div>
          <h1>Warehouse<br />Stock System</h1>
          <span>Central Management</span>
        </div>
        <nav className="sidebar-nav">
          {navGroups.map(group => {
            const visible = group.items.filter(item =>
              !item.roles || item.roles.includes(user?.role)
            );
            if (visible.length === 0) return null;
            return (
              <div className="nav-section" key={group.label}>
                <div className="nav-label">{group.label}</div>
                {visible.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
                    onClick={e => { if (isActive(item.path, item.exact)) e.preventDefault(); }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">⏻</button>
        </div>
      </aside>
      <main className="main-content">
        <div className="layout-topbar" style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 28px 0', background: 'var(--bg-primary)' }}>
          <button
            onClick={toggleTheme}
            className="btn btn-outline btn-sm"
            style={{ borderRadius: '20px', padding: '6px 12px' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
