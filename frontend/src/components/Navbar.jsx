import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Power } from 'lucide-react';
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

  const navConfig = {
    guest: [
      { label: 'Find Doctors', path: '/' },
      { label: 'Specialties', path: '/search' },
      { label: 'Video Consult', path: '/video' },
      { label: 'Health Vault', path: '/vault' },
    ],
    patient: [
      { label: 'Dashboard', path: '/patient/dashboard' },
      { label: 'Find Doctors', path: '/search' },
      { label: 'My Appointments', path: '/patient/appointments' },
      { label: 'Health Vault', path: '/vault' },
    ],
    doctor: [
      { label: 'Clinical Console', path: '/doctor/dashboard' },
      { label: 'Schedule Builder', path: '/doctor/schedule' },
      { label: 'Patient Queue', path: '/doctor/queue' },
      { label: 'Payouts', path: '/doctor/payouts' },
    ],
    admin: [
      { label: 'System Overview', path: '/admin/dashboard' },
      { label: 'Doctor Verification', path: '/admin/verify' },
      { label: 'Slot Transactions', path: '/admin/transactions' },
      { label: 'Audit Logs', path: '/admin/logs' },
    ],
  };

  const links = navConfig[role] || navConfig.guest;

  const handleAuthClick = async () => {
    if (user) {
      await logout();
      navigate('/login');
    } else {
      navigate('/login');
    }
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
        zIndex: 30,
      }}
    >
      {/* Left: Animated ECG Pulse Wave Logo + Vitalise */}
      <Link
        to="/"
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
          {/* Base faint path */}
          <path
            d="M1 11H7L10 3L14.5 19L18 8L20.5 11H27"
            stroke="rgba(243, 239, 230, 0.3)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Animated live ECG trace */}
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

      {/* Center: Dual-Layer Liquid Frosted Pill Navigation */}
      <nav
        className="glass-nav-pill"
        onMouseLeave={() => setHoveredTab(null)}
      >
        {links.map((item) => {
          const isActive = location.pathname === item.path;
          const isHovered = hoveredTab === item.label;

          return (
            <Link
              key={item.label}
              to={item.path}
              onMouseEnter={() => setHoveredTab(item.label)}
              className={`glass-nav-link ${isActive ? 'active' : ''}`}
            >
              {/* Layer 1: Primary Active Page Slider */}
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

              {/* Layer 2: Soft Magnetic Hover Pill */}
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

      {/* Right: Cream Circle Power Button + Two-Line Glass Pill */}
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
            onClick={() => setAccepting(!accepting)}
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

        <button
          onClick={handleAuthClick}
          className="circle-icon-btn circle-btn-cream"
          title={user ? 'Sign Out' : 'Sign In'}
        >
          <Power size={16} strokeWidth={2.2} />
        </button>

        <button className="circle-btn-glass" title="Menu">
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <path
              d="M1 2H15M1 8H15"
              stroke="#F3EFE6"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </motion.header>
  );
};

export default Navbar;