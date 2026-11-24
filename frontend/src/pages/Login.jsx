import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  HeartHandshake,
  ChevronDown,
  Check,
  Sparkles,
  Minus,
  Plus,
  Lock,
} from 'lucide-react';
import { api, useAuth } from '../context/AuthContext';

const LOGIN_HIGHLIGHT = {
  badge: 'WELCOME BACK',
  headline: 'Welcome back to Vitalise.',
  description:
    'Sign in with your email and password. You will be automatically directed to your patient portal, specialist clinical console, or administrative dashboard.',
  pillars: [
    'Automatic role detection from your account',
    'Direct access to your upcoming consultations',
    'Private prescriptions and medical records',
  ],
  icon: Lock,
};

const ROLE_HIGHLIGHTS = {
  patient: {
    badge: 'FOR PATIENTS & FAMILIES',
    headline: 'Healthcare that revolves around you.',
    description:
      'Connect with trusted specialists from home or in the clinic. Book appointments in seconds and keep your family’s prescriptions and health reports safely in one place.',
    pillars: [
      'Book guaranteed time slots with zero waiting rooms',
      'Consult face-to-face on video or visit the clinic',
      'Instant digital prescriptions & organized health records',
    ],
    icon: HeartHandshake,
  },
  doctor: {
    badge: 'FOR SPECIALISTS & CLINICS',
    headline: 'A calmer way to run your practice.',
    description:
      'Focus on patient care instead of paperwork. Set your flexible weekly schedule—all video, all in-clinic, or a custom mix—and manage your daily patient queue effortlessly.',
    pillars: [
      'Set all-video, all-clinic, or custom hybrid shifts in your schedule',
      'Clean daily patient timeline with one-click call launch',
      'Complete consultations & issue structured prescriptions',
    ],
    icon: Stethoscope,
  },
};

const SPECIALTY_OPTIONS = [
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'General Medicine',
  'Neurology',
  'Orthopedics',
  'Gynecology & Obstetrics',
  'Psychiatry & Mental Health',
  'Ophthalmology',
  'ENT (Otolaryngology)',
  'Gastroenterology',
  'Pulmonology',
  'Endocrinology & Diabetes',
  'Nephrology',
  'Urology',
  'Oncology',
  'Rheumatology',
  'Dentistry & Oral Care',
];

const GlassSelect = ({ label, value, placeholder, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="auth-input-group" ref={dropdownRef} style={{ zIndex: open ? 90 : 1 }}>
      <label className="auth-input-label">{label}</label>
      <div className="custom-glass-select-wrapper">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`custom-glass-select-trigger ${open ? 'is-open' : ''}`}
          style={{
            color: value ? '#ffffff' : 'rgba(243, 239, 230, 0.42)',
          }}
        >
          <span>{value || placeholder}</span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--cream)' }}
          >
            <ChevronDown size={16} />
          </motion.span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="custom-glass-select-menu"
            >
              {options.map((option) => {
                const isSelected = option === value;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    className={`custom-glass-select-option ${isSelected ? 'selected' : ''}`}
                  >
                    <span>{option}</span>
                    {isSelected && <Check size={14} strokeWidth={2.5} />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser, login, register } = useAuth();

  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const initialRole = searchParams.get('role') === 'doctor' ? 'doctor' : 'patient';
  const redirectPath = searchParams.get('redirect') || '';

  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialisation: '',
    city: '',
    feeRupees: '',
    qualifications: '',
  });

  const parsedQualifications = formData.qualifications
    .split(',')
    .map((q) => q.trim())
    .filter(Boolean);

  const modeParam = searchParams.get('mode');
  const roleParam = searchParams.get('role');
  useEffect(() => {
    if (modeParam === 'login' || modeParam === 'register') {
      setMode(modeParam);
      setErrorMsg('');
    }
    if (roleParam && ['patient', 'doctor'].includes(roleParam)) {
      setRole(roleParam);
    }
  }, [modeParam, roleParam]);

  useEffect(() => {
    if (user && !submitting) {
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else if (user.role === 'doctor') {
        navigate('/doctor/dashboard', { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/patient/dashboard', { replace: true });
      }
    }
  }, [user, submitting, navigate, redirectPath]);

  const handleModeSwitch = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setErrorMsg('');
    const params = new URLSearchParams(window.location.search);
    params.set('mode', nextMode);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  const handleRoleSwitch = (nextRole) => {
    if (nextRole === role) return;
    setRole(nextRole);
    setErrorMsg('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeeStep = (delta) => {
    setFormData((prev) => {
      const currentVal = parseInt(prev.feeRupees, 10);
      const base = isNaN(currentVal) ? 500 : currentVal;
      const nextVal = Math.max(0, base + delta);
      return { ...prev, feeRupees: String(nextVal) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (mode === 'register' && role === 'doctor') {
      if (!formData.specialisation) {
        setErrorMsg('Please select your medical specialty.');
        return;
      }
      if (parsedQualifications.length === 0) {
        setErrorMsg('Please enter at least one qualification (e.g. MBBS, MD).');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await login(formData.email.trim(), formData.password);
        const loggedUser = res?.user;
        const activeRole = loggedUser?.role;

        if (redirectPath) {
          navigate(redirectPath, { replace: true });
        } else if (activeRole === 'doctor') {
          navigate('/doctor/dashboard', { replace: true });
        } else if (activeRole === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/patient/dashboard', { replace: true });
        }
      } else {
        const regRes = await register({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
          role,
        });

        let finalUser = regRes?.user;

        if (role === 'doctor') {
          const feeInRupees = Number(formData.feeRupees);
          const feeInPaise = isNaN(feeInRupees) ? 50000 : Math.round(feeInRupees * 100);

          const profilePayload = {
            regNumber: `MCI-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
            fee: feeInPaise,
            city: formData.city.trim(),
            specialisations: [formData.specialisation],
            consultationModes: ['video', 'in_person'],
            qualifications: parsedQualifications.map((deg) => ({
              degree: deg,
              institute: 'Verified Medical Institute',
              year: 2020,
            })),
          };

          const profileRes = await api.post('/doctors/profile', profilePayload);
          if (profileRes.data?.user) {
            finalUser = profileRes.data.user;
            setUser(finalUser);
          }
        }

        const activeRole = finalUser?.role || role;
        if (redirectPath) {
          navigate(redirectPath, { replace: true });
        } else if (activeRole === 'doctor') {
          navigate('/doctor/schedule', { replace: true });
        } else {
          navigate('/patient/dashboard', { replace: true });
        }
      }
    } catch (err) {
      const backendMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (mode === 'login'
          ? 'Incorrect email or password. Please try again.'
          : 'Could not complete registration. Please check your details and try again.');
      setErrorMsg(backendMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const activeInfo =
    mode === 'login' ? LOGIN_HIGHLIGHT : ROLE_HIGHLIGHTS[role] || ROLE_HIGHLIGHTS.patient;
  const RoleIcon = activeInfo.icon;

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="auth-page-wrapper"
    >
      <motion.div
        layout
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="auth-split-container"
      >
        {/* LEFT COLUMN */}
        <div className="auth-editorial-pane">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode === 'login' ? 'login' : role}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.09)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontSize: '11.5px',
                    fontWeight: 500,
                    letterSpacing: '0.07em',
                    color: 'var(--cream)',
                    marginBottom: '26px',
                  }}
                >
                  <RoleIcon size={13} />
                  <span>{activeInfo.badge}</span>
                </div>

                <h1
                  className="hero-display-title"
                  style={{
                    fontSize: 'clamp(2.4rem, 3.8vw, 3.45rem)',
                    marginBottom: '18px',
                  }}
                >
                  {activeInfo.headline}
                </h1>

                <p
                  style={{
                    fontSize: '15.5px',
                    lineHeight: 1.62,
                    color: 'var(--cream-soft)',
                    marginBottom: '32px',
                  }}
                >
                  {activeInfo.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                  {activeInfo.pillars.map((pillar) => (
                    <div
                      key={pillar}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14.5px',
                        color: '#ffffff',
                      }}
                    >
                      <CheckCircle2 size={16} color="var(--cream)" style={{ flexShrink: 0 }} />
                      <span>{pillar}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div style={{ marginTop: '36px' }}>
            {redirectPath ? (
              <div
                className="glass-widget-inner"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#84b59f',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
                  Sign in or create an account to continue directly to your appointment.
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--cream-muted)',
                }}
              >
                <Sparkles size={14} />
                <span>Private, confidential care designed for patients and specialists</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="auth-form-pane">
          {/* 1. Mode Switcher */}
          <div
            className="auth-segmented-track"
            style={{
              gridTemplateColumns: '1fr 1fr',
              maxWidth: '300px',
              width: '100%',
              margin: '0 auto 24px auto',
            }}
          >
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`auth-segment-btn ${mode === 'login' ? 'active' : ''}`}
            >
              {mode === 'login' && (
                <motion.span
                  layoutId="auth-mode-pill"
                  className="auth-segment-pill-cream"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('register')}
              className={`auth-segment-btn ${mode === 'register' ? 'active' : ''}`}
            >
              {mode === 'register' && (
                <motion.span
                  layoutId="auth-mode-pill"
                  className="auth-segment-pill-cream"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span>Create Account</span>
            </button>
          </div>

          {/* 2. Role Selector (Only visible during Create Account) */}
          <AnimatePresence initial={false}>
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 22 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  className="auth-segmented-track"
                  style={{ gridTemplateColumns: '1fr 1fr', width: '100%' }}
                >
                  {['patient', 'doctor'].map((r) => {
                    const isSelected = role === r;
                    const label = r === 'doctor' ? 'Specialist / Doctor' : 'Patient';
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleSwitch(r)}
                        className={`auth-segment-btn ${isSelected ? 'active-frosted' : ''}`}
                      >
                        {isSelected && (
                          <motion.span
                            layoutId="auth-role-pill"
                            className="auth-segment-pill-glass"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Banner */}
          <AnimatePresence initial={false}>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(217, 107, 107, 0.16)',
                  border: '1px solid rgba(217, 107, 107, 0.38)',
                  color: '#ffd6d6',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Main Form */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.form
              key={`${mode}-${mode === 'register' ? role : 'unified'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
            >
              {mode === 'register' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="auth-input-group">
                    <label className="auth-input-label">
                      {role === 'doctor' ? 'Doctor Name' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder={role === 'doctor' ? 'e.g. Dr. Aarav Mehta' : 'e.g. Rahul Verma'}
                      value={formData.name}
                      onChange={handleChange}
                      className="auth-input-field"
                    />
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                      className="auth-input-field"
                    />
                  </div>
                </div>
              )}

              <div className="auth-input-group">
                <label className="auth-input-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="auth-input-field"
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Password (min 8 characters)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={8}
                    placeholder="Enter at least 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    className="auth-input-field"
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(243, 239, 230, 0.65)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Clean 2x2 Doctor Registration Fields (No Cluttered Institute/Year Inputs!) */}
              {mode === 'register' && role === 'doctor' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '12px' }}>
                    <GlassSelect
                      label="Medical Specialty"
                      value={formData.specialisation}
                      placeholder="Select specialty..."
                      options={SPECIALTY_OPTIONS}
                      onChange={(selectedSpec) =>
                        setFormData((prev) => ({ ...prev, specialisation: selectedSpec }))
                      }
                    />

                    <div className="auth-input-group">
                      <label className="auth-input-label">City / Location</label>
                      <input
                        type="text"
                        name="city"
                        required
                        placeholder="e.g. New Delhi"
                        value={formData.city}
                        onChange={handleChange}
                        className="auth-input-field"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: '12px', alignItems: 'start' }}>
                    <div className="auth-input-group">
                      <label className="auth-input-label">Consultation Fee (₹)</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          name="feeRupees"
                          required
                          min="0"
                          placeholder="e.g. 500"
                          value={formData.feeRupees}
                          onChange={handleChange}
                          className="auth-input-field"
                          style={{ paddingRight: '72px' }}
                        />
                        <div className="fee-stepper-controls">
                          <button
                            type="button"
                            onClick={() => handleFeeStep(-50)}
                            className="fee-step-btn"
                          >
                            <Minus size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeeStep(50)}
                            className="fee-step-btn"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="auth-input-group">
                      <label className="auth-input-label">
                        Qualifications (separate with comma)
                      </label>
                      <input
                        type="text"
                        name="qualifications"
                        required
                        placeholder="e.g. MBBS, MD, DM"
                        value={formData.qualifications}
                        onChange={handleChange}
                        className="auth-input-field"
                      />
                      {parsedQualifications.length > 0 && (
                        <div className="qualification-tags-row">
                          {parsedQualifications.map((deg, idx) => (
                            <span key={`${deg}-${idx}`} className="qualification-tag-pill">
                              <Check size={10} strokeWidth={3} />
                              <span>{deg}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  color: 'var(--cream-soft)',
                  marginTop: '2px',
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{ accentColor: '#F3EFE6', width: '14px', height: '14px' }}
                  />
                  <span>Keep me signed in</span>
                </label>

                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('register')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--cream)',
                      textDecoration: 'underline',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    New to Vitalise? Create account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--cream)',
                      textDecoration: 'underline',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Already have an account? Sign in
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-cream-pill"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '14px 26px',
                  marginTop: '6px',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <span>
                  {submitting
                    ? mode === 'login'
                      ? 'Signing you in...'
                      : 'Setting up your account...'
                    : mode === 'login'
                    ? 'Sign In'
                    : `Create ${role === 'doctor' ? 'Specialist' : 'Patient'} Account`}
                </span>
                {!submitting && (
                  <span className="arrow-cycle-box">
                    <span className="arrow-icon-primary">↗</span>
                    <span className="arrow-icon-clone">↗</span>
                  </span>
                )}
              </button>
            </motion.form>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.main>
  );
};

export default Login;