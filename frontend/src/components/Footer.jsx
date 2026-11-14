import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="vitalise-footer">
      {/* --- Subtle SVG Fractal Noise Overlay (Preserved from your snippet) --- */}
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

      {/* --- Soft Slate-Blue & Warm Cream Ambient Refraction Orbs (Zero Neon) --- */}
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

      {/* --- Main Content Layer --- */}
      <div className="vitalise-footer-container">
        {/* Top CTA Section */}
        <div className="vitalise-footer-top">
          <div>
            <h2
              className="hero-display-title"
              style={{
                fontSize: 'clamp(2.2rem, 3.6vw, 3.1rem)',
                marginBottom: '14px',
              }}
            >
              Ready for healthcare that{' '}
              <span style={{ color: 'rgba(243, 239, 230, 0.52)' }}>
                <br />
                feels effortless?
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
              Connect with verified specialists, lock your consultation slot in
              real time, and manage your medical records in one calm, private
              space.
            </p>
          </div>

          {/* Interactive Action Buttons with Diagonal Arrow Cycle */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            <Link to="/search" className="btn-cream-pill">
              <span>Book a Consult</span>
              <span className="arrow-cycle-box">
                <span className="arrow-icon-primary">↗</span>
                <span className="arrow-icon-clone">↗</span>
              </span>
            </Link>

            <Link to="/login" className="btn-glass-pill">
              <span>Join as a Specialist</span>
              <span className="arrow-cycle-box">
                <span className="arrow-icon-primary">↗</span>
                <span className="arrow-icon-clone">↗</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Thin Glass Divider */}
        <div className="vitalise-footer-divider" />

        {/* Middle Brand & Navigation Columns */}
        <div className="vitalise-footer-middle">
          {/* Left: Brand Identity */}
          <div style={{ maxWidth: '360px' }}>
            <Link
              to="/"
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

          {/* Right: 3-Column Site Navigation */}
          <div className="vitalise-footer-links-grid">
            <div className="vitalise-footer-col">
              <h4 className="vitalise-footer-col-title">For Patients</h4>
              <Link to="/search" className="vitalise-footer-link">
                Find Doctors
              </Link>
              <Link to="/video" className="vitalise-footer-link">
                Video Consultations
              </Link>
              <Link to="/patient/dashboard" className="vitalise-footer-link">
                Patient Dashboard
              </Link>
              <Link to="/vault" className="vitalise-footer-link">
                Health Records Vault
              </Link>
            </div>

            <div className="vitalise-footer-col">
              <h4 className="vitalise-footer-col-title">For Specialists</h4>
              <Link to="/doctor/dashboard" className="vitalise-footer-link">
                Clinical Console
              </Link>
              <Link to="/doctor/schedule" className="vitalise-footer-link">
                Schedule Builder
              </Link>
              <Link to="/login" className="vitalise-footer-link">
                Specialist Portal
              </Link>
            </div>

            <div className="vitalise-footer-col">
              <h4 className="vitalise-footer-col-title">Account & Support</h4>
              <Link to="/login" className="vitalise-footer-link">
                Sign In / Register
              </Link>
              <Link to="/search" className="vitalise-footer-link">
                Browse Specialties
              </Link>
              <a href="#privacy" className="vitalise-footer-link">
                Privacy & Security
              </a>
              <a href="#terms" className="vitalise-footer-link">
                Terms of Care
              </a>
            </div>
          </div>
        </div>

        {/* Thin Glass Divider */}
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
            <span>All consultation & booking services operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;