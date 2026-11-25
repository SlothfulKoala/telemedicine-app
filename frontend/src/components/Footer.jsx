import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Footer = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const role = user?.role || 'guest';

  const handleSignOut = async () => {
    try {
      if (typeof logout === 'function') {
        await logout();
      }
    } finally {
      navigate('/');
    }
  };

  const brandHomeRoute =
    role === 'doctor'
      ? '/doctor/dashboard'
      : role === 'patient'
      ? '/patient/dashboard'
      : role === 'admin'
      ? '/admin/dashboard'
      : '/';

  const roleConfig = {
    guest: {
      headingLead: 'Ready for healthcare that',
      headingMuted: 'feels effortless?',
      subtext:
        'Connect with verified specialists, book your consultation slot in real time, and manage your medical records in one calm, private space.',
      primaryCta: { label: 'Book a Consult', to: '/search' },
      secondaryCta: {
        label: 'Join as a Specialist',
        to: '/login?mode=register&role=doctor',
      },
      columns: [
        {
          title: 'Get Started',
          links: [
            { label: 'Sign In', to: '/login?mode=login' },
            { label: 'Patient Sign Up', to: '/login?mode=register&role=patient' },
          ],
        },
        {
          title: 'Legal',
          links: [
            { label: 'Privacy & Security', href: '#privacy' },
            { label: 'Terms of Care', href: '#terms' },
          ],
        },
      ],
    },

    patient: {
      headingLead: 'Need a follow-up or',
      headingMuted: 'a new consultation?',
      subtext:
        'Browse verified specialists with open slots this week, review your upcoming visits, or access your encrypted prescriptions anytime.',
      primaryCta: { label: 'Find a Specialist', to: '/search' },
      secondaryCta: null,
      columns: [
        {
          title: 'Your Care',
          links: [
            { label: 'My Appointments', to: '/patient/dashboard' },
            { label: 'Video Room', to: '/video' },
            { label: 'Health Vault', to: '/vault' },
          ],
        },
        {
          title: 'Account',
          links: [
            { label: 'Privacy & Security', href: '#privacy' },
            { label: 'Terms of Care', href: '#terms' },
            { label: 'Sign Out', action: handleSignOut },
          ],
        },
      ],
    },

    doctor: {
      headingLead: 'Run your clinical schedule',
      headingMuted: 'with complete clarity.',
      subtext:
        'Adjust your weekly working hours, customize rest buffers between slots, and manage your active patient queue from one calm workspace.',
      primaryCta: { label: 'Schedule Builder', to: '/doctor/schedule' },
      secondaryCta: null,
      columns: [
        {
          title: 'Workspace',
          links: [
            { label: 'Clinical Console', to: '/doctor/dashboard' },
            { label: 'Video Room', to: '/video' },
          ],
        },
        {
          title: 'Account',
          links: [
            { label: 'Privacy & Security', href: '#privacy' },
            { label: 'Terms of Care', href: '#terms' },
            { label: 'Sign Out', action: handleSignOut },
          ],
        },
      ],
    },

    admin: {
      headingLead: 'Platform governance &',
      headingMuted: 'specialist oversight.',
      subtext:
        'Verify specialist credentials, monitor platform health, and maintain secure clinical standards across Vitalise.',
      primaryCta: { label: 'Admin Console', to: '/admin/dashboard' },
      secondaryCta: null,
      columns: [
        {
          title: 'Platform',
          links: [{ label: 'Specialist Directory', to: '/search' }],
        },
        {
          title: 'Account',
          links: [
            { label: 'Privacy & Security', href: '#privacy' },
            { label: 'Terms of Care', href: '#terms' },
            { label: 'Sign Out', action: handleSignOut },
          ],
        },
      ],
    },
  };

  const activeConfig = roleConfig[role] || roleConfig.guest;

  return (
    <footer className="vitalise-footer">
      {/* Subtle SVG Fractal Noise Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
          opacity: 0.035,
          zIndex: 1,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient Refraction Orbs */}
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          right: '240px',
          width: '480px',
          height: '480px',
          background: 'rgba(120, 148, 188, 0.22)',
          borderRadius: '50%',
          filter: 'blur(130px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40px',
          right: '80px',
          width: '360px',
          height: '360px',
          background: 'rgba(243, 239, 230, 0.12)',
          borderRadius: '50%',
          filter: 'blur(110px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-140px',
          left: '10%',
          width: '420px',
          height: '420px',
          background: 'rgba(68, 96, 138, 0.25)',
          borderRadius: '50%',
          filter: 'blur(130px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Content Layer */}
      <div className="vitalise-footer-container">
        {/* Top Role-Aware CTA Section */}
        <div className="vitalise-footer-top">
          <div>
            <h2
              className="hero-display-title"
              style={{
                fontSize: 'clamp(2.2rem, 3.6vw, 3.1rem)',
                marginBottom: '14px',
              }}
            >
              {activeConfig.headingLead}{' '}
              <span style={{ color: 'rgba(243, 239, 230, 0.52)' }}>
                <br />
                {activeConfig.headingMuted}
              </span>
            </h2>
            <p
              style={{
                color: 'var(--cream-soft)',
                fontSize: '15.5px',
                lineHeight: 1.6,
                maxWidth: '460px',
              }}
            >
              {activeConfig.subtext}
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            {activeConfig.primaryCta && (
              <Link to={activeConfig.primaryCta.to} className="btn-cream-pill">
                <span>{activeConfig.primaryCta.label}</span>
                <span className="arrow-cycle-box">
                  <span className="arrow-icon-primary">↗</span>
                  <span className="arrow-icon-clone">↗</span>
                </span>
              </Link>
            )}

            {activeConfig.secondaryCta && (
              <Link to={activeConfig.secondaryCta.to} className="btn-glass-pill">
                <span>{activeConfig.secondaryCta.label}</span>
                <span className="arrow-cycle-box">
                  <span className="arrow-icon-primary">↗</span>
                  <span className="arrow-icon-clone">↗</span>
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="vitalise-footer-divider" />

        {/* Middle Brand & Compact 2-Column Navigation */}
        <div className="vitalise-footer-middle">
          <div style={{ maxWidth: '360px' }}>
            <Link
              to={brandHomeRoute}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="22" height="18" viewBox="0 0 28 22" fill="none">
                  <path
                    d="M1 11H7L10 3L14.5 19L18 8L20.5 11H27"
                    stroke="#101622"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span
                style={{
                  color: 'var(--cream)',
                  fontSize: '22px',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                }}
              >
                Vitalise
              </span>
            </Link>

            <p
              style={{
                color: 'rgba(243, 239, 230, 0.65)',
                fontSize: '14px',
                lineHeight: 1.65,
              }}
            >
              Vitalise brings patients and medical specialists together with
              protected slot scheduling, browser-based video consultations, and
              organized health records.
            </p>
          </div>

          <div
            className="vitalise-footer-links-grid"
            style={{
              gridTemplateColumns: 'repeat(2, minmax(140px, auto))',
              gap: '56px',
            }}
          >
            {activeConfig.columns.map((col) => (
              <div key={col.title} className="vitalise-footer-col">
                <h4 className="vitalise-footer-col-title">{col.title}</h4>
                {col.links.map((item) => {
                  if (item.action) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.action}
                        className="vitalise-footer-link"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          font: 'inherit',
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  }
                  if (item.href) {
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        className="vitalise-footer-link"
                      >
                        {item.label}
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="vitalise-footer-link"
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="vitalise-footer-divider" />

        {/* Bottom Copyright & Status Row */}
        <div className="vitalise-footer-bottom">
          <span>&copy; 2026 Vitalise Healthcare. All rights reserved.</span>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#84b59f',
              }}
            />
            <span>
              {user?.name
                ? `Signed in as ${user.name} (${role})`
                : 'All consultation & booking services operational'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;