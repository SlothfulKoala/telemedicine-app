import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(true);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [pulseKey, setPulseKey] = useState(0);

  const role = user?.role || 'guest';

  const brandHomeRoute =
    role === 'doctor'
      ? '/doctor/dashboard'
      : role === 'patient'
      ? '/patient/dashboard'
      : role === 'admin'
      ? '/admin/dashboard'
      : '/';

  const navConfig = {
    guest: [
      { label: 'Overview', path: '/' },
      { label: 'Specialties', path: '/speciality' },
      { label: 'Security & Privacy', path: '/security' },
    ],
    patient: [
      { label: 'My Appointments', path: '/patient/dashboard' },
      { label: 'Find Doctors', path: '/search' },
      { label: 'Health Vault', path: '/vault' },
    ],
    doctor: [
      { label: 'Clinical Console', path: '/doctor/dashboard' },
      { label: 'Schedule Builder', path: '/doctor/schedule' },
      { label: 'Earnings & Analytics', path: '/doctor/analytics' },
    ],
    admin: [
      { label: 'Admin Console', path: '/admin/dashboard' },
      { label: 'Specialist Directory', path: '/search' },
    ],
  };

  const links = navConfig[role] || navConfig.guest;

  const handleLogout = async () => {
    await logout();
    navigate('/login?mode=login');
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
      style={{
        width: '100%',
        padding: '26px 48px 0 48px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        zIndex: 40,
      }}
    >
      {/* Left: Brand Pulse Logo (Routes to role's home dashboard) */}
      <Link
        to={brandHomeRoute}
        onMouseEnter={() => setPulseKey((prev) => prev + 1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          color: 'var(--cream)',
          fontSize: '21px',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          width: 'fit-content',
        }}
      >
        <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
          <path
            d="M1 11H7L10 3L14.5 19L18 8L20.5 11H27"
            stroke="rgba(243, 239, 230, 0.3)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <motion.path
            key={pulseKey}
            d="M1 11H7L10 3L14.5 19L18 8L20.5 11H27"
            stroke="#F3EFE6"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: 'easeInOut' }}
          />
        </svg>
        <span>Vitalise</span>
      </Link>

      {/* Center: Frosted Pill Navigation */}
      <nav
        className="glass-nav-pill"
        onMouseLeave={() => setHoveredTab(null)}
      >
        {links.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === '/search' && location.pathname.startsWith('/patient/checkout'));
          const isHovered = hoveredTab === item.label;

          return (
            <Link
              key={item.label}
              to={item.path}
              onMouseEnter={() => setHoveredTab(item.label)}
              className={`glass-nav-link ${isActive ? 'active' : ''}`}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="nav-active-slider"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 34,
                    mass: 0.8,
                  }}
                />
              )}

              <AnimatePresence>
                {isHovered && !isActive && (
                  <motion.span
                    layoutId="nav-hover-pill"
                    className="nav-hover-slider"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 460,
                      damping: 32,
                      mass: 0.6,
                    }}
                  />
                )}
              </AnimatePresence>

              <span style={{ position: 'relative', zIndex: 2 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: Role Status & Auth Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
        }}
      >
        {role === 'doctor' && (
          <button
            type="button"
            onClick={() => setAccepting((prev) => !prev)}
            className="glass-nav-pill"
            style={{
              padding: '7px 14px',
              color: 'var(--cream)',
              fontSize: '12.5px',
              cursor: 'pointer',
              gap: '8px',
            }}
          >
            <span>Status: {accepting ? 'Accepting Consults' : 'Offline'}</span>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: accepting ? '#84b59f' : '#888',
              }}
            />
          </button>
        )}

        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="nav-login-btn"
            style={{ gap: '6px' }}
          >
            <span>Sign Out</span>
            <LogOut size={14} />
          </button>
        ) : (
          <>
            <Link to="/login?mode=login" className="nav-login-btn">
              Log In
            </Link>

            <Link to="/login?mode=register" className="nav-signup-btn">
              <span>Sign Up</span>
              <span style={{ fontSize: '13px', lineHeight: 1 }}>↗</span>
            </Link>
          </>
        )}
      </div>
    </motion.header>
  );
};

export default Navbar;