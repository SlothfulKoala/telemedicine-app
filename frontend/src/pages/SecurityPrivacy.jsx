import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Video, ShieldCheck, KeyRound, EyeOff, FileCheck2 } from 'lucide-react';

const SECURITY_PILLARS = [
  {
    title: 'Encrypted Health Records',
    description:
      'Uploaded lab reports, diagnostic scans, and medical notes are encrypted before storage so your personal health information remains private.',
    icon: Lock,
  },
  {
    title: 'Private Peer-to-Peer Video Rooms',
    description:
      'Consultations take place in private, session-authenticated browser rooms with direct peer-to-peer media streams between you and your doctor.',
    icon: Video,
  },
  {
    title: 'Role-Based Access Control',
    description:
      'Strict separation between Patient, Specialist, and Administrator accounts ensures only your assigned doctor can review your consultation files.',
    icon: KeyRound,
  },
  {
    title: 'Verified Specialist Onboarding',
    description:
      'Every practitioner profile undergoes credential verification before being listed for patient consultations.',
    icon: ShieldCheck,
  },
  {
    title: 'Zero Third-Party Data Selling',
    description:
      'Your medical history, prescriptions, and appointment records are never sold or shared with external advertising networks.',
    icon: EyeOff,
  },
  {
    title: 'Protected Slot Reservations',
    description:
      'When you select a consultation slot, it is temporarily reserved for your session during checkout to prevent double-bookings.',
    icon: FileCheck2,
  },
];

const SecurityPrivacy = () => {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
      style={{
        flex: 1,
        width: '100%',
        maxWidth: '1380px',
        margin: '0 auto',
        padding: '44px 48px 72px 48px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '24px',
          marginBottom: '44px',
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '11.5px',
              letterSpacing: '0.07em',
              color: 'var(--cream)',
              marginBottom: '18px',
            }}
          >
            <span>TRUST & DATA PROTECTION</span>
          </div>

          <h1
            className="hero-display-title"
            style={{ fontSize: 'clamp(2.6rem, 4.4vw, 3.8rem)', marginBottom: '16px' }}
          >
            Your health data belongs only to you.
          </h1>

          <p style={{ fontSize: '17px', lineHeight: 1.6, color: 'var(--cream-soft)' }}>
            Vitalise is engineered from the ground up to keep consultations,
            prescriptions, and personal medical records confidential.
          </p>
        </div>

        <Link to="/login?mode=register" className="btn-cream-pill">
          <span>Create a Private Account</span>
          <span className="arrow-cycle-box">
            <span className="arrow-icon-primary">↗</span>
            <span className="arrow-icon-clone">↗</span>
          </span>
        </Link>
      </div>

      {/* 3-Column Glass Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '22px',
        }}
      >
        {SECURITY_PILLARS.map((item) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.title}
              className="glass-widget-inner"
              style={{ padding: '28px' }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '13px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  color: 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                }}
              >
                <IconComponent size={20} />
              </div>

              <h2
                style={{
                  fontSize: '19px',
                  fontWeight: 500,
                  color: '#ffffff',
                  marginBottom: '10px',
                }}
              >
                {item.title}
              </h2>

              <p
                style={{
                  fontSize: '14.5px',
                  lineHeight: 1.6,
                  color: 'var(--cream-soft)',
                }}
              >
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </motion.main>
  );
};

export default SecurityPrivacy;