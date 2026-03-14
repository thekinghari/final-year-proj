import { useState } from 'react';
import { FiMap, FiBarChart2, FiUsers, FiFileText, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import './AdminHeader.css';

const NAV_ITEMS = [
  { key: 'dashboard', icon: FiBarChart2, label: 'Dashboard' },
  { key: 'map',       icon: FiMap,       label: 'India Map' },
  { key: 'analytics', icon: FiBarChart2, label: 'Analytics' },
  { key: 'users',     icon: FiUsers,     label: 'Users' },
  { key: 'reports',   icon: FiFileText,  label: 'Reports' },
];

const AdminHeader = ({ user, currentPage, setCurrentPage, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (key) => {
    setCurrentPage(key);
    setMobileOpen(false);
  };

  return (
    <header className="admin-header-new">
      <div className="admin-header-container">
        {/* Logo */}
        <div className="admin-logo-section">
          <div className="logo-icon-new">🌊</div>
          <span className="logo-text-new">Blue Carbon Registry</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="admin-nav-new">
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              className={`nav-item-new ${currentPage === key ? 'active' : ''}`}
              onClick={() => handleNav(key)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* Right Section */}
        <div className="admin-header-actions">
          <div className="admin-user-section">
            <div className="admin-avatar-new">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">{user?.name || 'Admin'}</span>
              <span className="admin-user-role">ADMIN</span>
            </div>
          </div>
          <button className="logout-btn-new" onClick={onLogout} title="Logout">
            <FiLogOut size={18} />
          </button>
          {/* Mobile hamburger */}
          <button
            className="admin-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && (
        <nav className="admin-mobile-nav">
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              className={`admin-mobile-nav-item ${currentPage === key ? 'active' : ''}`}
              onClick={() => handleNav(key)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
          <button className="admin-mobile-nav-item logout" onClick={onLogout}>
            <FiLogOut size={18} />
            Logout
          </button>
        </nav>
      )}
    </header>
  );
};

export default AdminHeader;
