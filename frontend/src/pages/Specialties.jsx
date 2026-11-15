import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HeartPulse,
  Sparkles,
  Baby,
  Stethoscope,
  Brain,
  Bone,
  Eye,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SPECIALTIES_LIST = [
  {
    slug: 'cardiologist',
    name: 'Cardiology',
    tagline: 'Heart & Vascular Care',
    description:
      'Preventive heart screenings, blood pressure management, ECG reviews, and post-cardiac care consultations.',
    icon: HeartPulse,
  },
  {
    slug: 'dermatologist',
    name: 'Dermatology',
    tagline: 'Skin, Hair & Clinical Aesthetics',
    description:
      'Consultations for acne, eczema, hair loss, allergies, and personalized skin treatment plans via HD video or clinic.',
    icon: Sparkles,
  },
  {
    slug: 'pediatrician',
    name: 'Pediatrics',
    tagline: 'Infant, Child & Adolescent Health',
    description:
      'Growth monitoring, seasonal illness care, nutrition guidance, and routine developmental checkups for children.',
    icon: Baby,
  },
  {
    slug: 'general-physician',
    name: 'General Medicine',
    tagline: 'Primary Care & Internal Medicine',
    description:
      'Fever, infections, diabetes management, thyroid care, and comprehensive diagnostic report evaluations.',
    icon: Stethoscope,
  },
  {
    slug: 'neurologist',
    name: 'Neurology',
    tagline: 'Brain, Spine & Nerve Care',
    description:
      'Evaluation and long-term management for migraines, vertigo, nerve pain, and sleep disorders.',
    icon: Brain,
  },
  {
    slug: 'orthopedic',
    name: 'Orthopedics',
    tagline: 'Joint, Bone & Sports Medicine',
    description:
      'Back pain, joint stiffness, sports injury recovery, and mobility rehabilitation guidance.',
    icon: Bone,
  },
  {
    slug: 'ophthalmologist',
    name: 'Ophthalmology',
    tagline: 'Comprehensive Eye & Vision Care',
    description:
      'Digital eye strain, vision consultations, dry eye treatment, and preventive eye health checkups.',
    icon: Eye,
  },
  {
    slug: 'endocrinologist',
    name: 'Endocrinology',
    tagline: 'Hormonal & Metabolic Health',
    description:
      'Specialized care for diabetes, PCOS, thyroid imbalances, and metabolic wellness.',
    icon: Activity,
  },
];

const Specialties = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectSpecialty = (slug) => {
    const target = `/search?specialisation=${encodeURIComponent(slug)}`;
    if (!user) {
      navigate(`/login?mode=login&redirect=${encodeURIComponent(target)}`);
    } else {
      navigate(target);
    }
  };

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
      {/* Page Header */}
      <div style={{ maxWidth: '680px', marginBottom: '44px' }}>
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
          <span>MEDICAL DEPARTMENTS</span>
        </div>

        <h1
          className="hero-display-title"
          style={{ fontSize: 'clamp(2.6rem, 4.4vw, 3.8rem)', marginBottom: '16px' }}
        >
          Care across every specialty.
        </h1>

        <p style={{ fontSize: '17px', lineHeight: 1.6, color: 'var(--cream-soft)' }}>
          Choose a department below to sign in and view specialists available for
          video or in-clinic consultations.
        </p>
      </div>

      {/* 4-Column Matte Frosted Glass Specialty Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '22px',
        }}
      >
        {SPECIALTIES_LIST.map((spec) => {
          const IconComponent = spec.icon;
          return (
            <div
              key={spec.slug}
              className="glass-widget-inner"
              style={{
                padding: '26px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '22px',
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '13px',
                    background: 'var(--cream)',
                    color: 'var(--ink-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '18px',
                  }}
                >
                  <IconComponent size={21} strokeWidth={2} />
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--cream-muted)',
                    marginBottom: '4px',
                  }}
                >
                  {spec.tagline}
                </div>

                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: 500,
                    color: '#ffffff',
                    marginBottom: '10px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {spec.name}
                </h2>

                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.58,
                    color: 'var(--cream-soft)',
                  }}
                >
                  {spec.description}
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => handleSelectSpecialty(spec.slug)}
                  className="time-slot-btn secondary"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Consult {spec.name}</span>
                  <span>↗</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.main>
  );
};

export default Specialties;