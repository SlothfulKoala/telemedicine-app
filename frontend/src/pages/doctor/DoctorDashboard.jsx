import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  CheckCircle2,
  Sliders,
  Video,
  Building2,
  Clock,
  Sparkles,
  User,
  IndianRupee,
  FileText,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { api, useAuth } from '../../context/AuthContext';

const formatRupees = (paise) => {
  const num = Number(paise || 0);
  return `₹${Math.round(num / 100).toLocaleString('en-IN')}`;
};

const formatDateShort = (raw) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const createEmptyMedicineRow = () => ({
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
});

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeQueue, setActiveQueue] = useState([]);
  const [completedList, setCompletedList] = useState([]);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'
  const [loading, setLoading] = useState(true);

  // 2-Step Completion -> Prescription Modal State
  const [modalAppt, setModalAppt] = useState(null);
  const [modalStep, setModalStep] = useState('complete'); // 'complete' | 'prescription'
  const [markPaidNow, setMarkPaidNow] = useState(true);
  const [collectedMethod, setCollectedMethod] = useState('clinic_upi');
  const [transactionRef, setTransactionRef] = useState('');
  const [submittingModal, setSubmittingModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Structured Prescription Builder State (1–30 rows)
  const [medicines, setMedicines] = useState([createEmptyMedicineRow()]);

  const loadConsoleData = useCallback(async () => {
    try {
      setLoading(true);
      const [activeRes, completedRes, analyticsRes] = await Promise.allSettled([
        api.get('/booking/doctor/appointments'),
        api.get('/booking/doctor/appointments/completed'),
        api.get('/booking/doctor/analytics'),
      ]);

      if (activeRes.status === 'fulfilled') {
        setActiveQueue(activeRes.value.data?.appointments || []);
        if (activeRes.value.data?.timezone) setTimezone(activeRes.value.data.timezone);
      }
      if (completedRes.status === 'fulfilled') {
        setCompletedList(completedRes.value.data?.appointments || []);
      }
      if (analyticsRes.status === 'fulfilled') {
        setWeeklyEarnings(analyticsRes.value.data?.kpis?.weeklyEarnings || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsoleData();
  }, [loadConsoleData]);

  const openCompleteModal = (appt) => {
    setModalAppt(appt);
    setModalStep('complete');
    setMarkPaidNow(!appt.payment?.isPaid && (appt.payment?.amount || 0) > 0);
    setCollectedMethod('clinic_upi');
    setTransactionRef('');
    setMedicines([createEmptyMedicineRow()]);
    setModalError('');
    setModalSuccess('');
  };

  const openPrescriptionModal = (appt) => {
    setModalAppt(appt);
    setModalStep('prescription');
    setMedicines([createEmptyMedicineRow()]);
    setModalError('');
    setModalSuccess('');
  };

  const closeModal = () => {
    setModalAppt(null);
    setModalError('');
    setModalSuccess('');
  };

  // Step 1: Complete Appointment (+ optionally mark Pay Later payment as collected)
  const handleConfirmComplete = async () => {
    if (!modalAppt) return;
    setSubmittingModal(true);
    setModalError('');

    try {
      await api.patch(`/booking/doctor/appointments/${modalAppt.id}/complete`, {
        markPaid: !modalAppt.payment?.isPaid && markPaidNow,
        collectedMethod: markPaidNow ? collectedMethod : undefined,
        transactionRef: markPaidNow && transactionRef.trim() ? transactionRef.trim() : undefined,
      });

      await loadConsoleData();
      // Smoothly transition straight into Step 2: Issue Digital Prescription!
      setModalStep('prescription');
      setModalSuccess('Visit marked completed! You can now issue a digital prescription below.');
    } catch (err) {
      setModalError(
        err.response?.data?.message || 'Could not mark this appointment as completed.'
      );
    } finally {
      setSubmittingModal(false);
    }
  };

  // Step 2: Save Encrypted Structured Prescription (automatically appears in Patient Health Vault)
  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (!modalAppt) return;

    const validMeds = medicines.filter(
      (m) => m.name.trim() && m.dosage.trim() && m.frequency.trim() && m.duration.trim()
    );
    if (validMeds.length === 0) {
      setModalError('Please fill in Name, Dosage, Frequency, and Duration for at least one medicine.');
      return;
    }

    setSubmittingModal(true);
    setModalError('');
    try {
      await api.post(`/booking/prescription/${modalAppt.id}`, {
        medicines: validMeds,
      });
      setModalSuccess('Encrypted prescription saved to the patient’s Health Vault!');
      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Could not save prescription.');
    } finally {
      setSubmittingModal(false);
    }
  };

  const updateMedicineField = (index, field, value) => {
    setMedicines((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const displayedList = activeTab === 'active' ? activeQueue : completedList;

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="dashboard-page-container"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div>
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
              marginBottom: '14px',
            }}
          >
            <Sparkles size={12} />
            <span>SPECIALIST CLINICAL CONSOLE • {timezone}</span>
          </div>

          <h1 className="hero-display-title" style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.2rem)' }}>
            {user?.name ? `${user.name}’s Console.` : 'Clinical Console.'}
          </h1>
        </div>

        <Link to="/doctor/schedule" className="btn-cream-pill">
          <Sliders size={15} />
          <span>Configure Weekly Schedule</span>
          <span className="arrow-cycle-box">
            <span className="arrow-icon-primary">↗</span>
            <span className="arrow-icon-clone">↗</span>
          </span>
        </Link>
      </div>

      {/* 3 Clean Summary Stat Cards */}
      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
              Active / Upcoming Queue
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
              {activeQueue.length}
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '13px',
              background: 'rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cream)',
            }}
          >
            <Users size={20} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
              Completed Consultations
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
              {completedList.length}
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '13px',
              background: 'rgba(132, 181, 159, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d8f3e5',
            }}
          >
            <CheckCircle2 size={20} />
          </div>
        </div>

        <Link
          to="/doctor/analytics"
          className="dashboard-stat-card"
          style={{ textDecoration: 'none' }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>This Week’s Earnings</div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
              {formatRupees(weeklyEarnings)}
            </div>
            <div style={{ fontSize: '12px', color: '#d8f3e5', marginTop: '2px' }}>
              View Analytics & Ledger ↗
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '13px',
              background: 'rgba(132, 181, 159, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d8f3e5',
            }}
          >
            <IndianRupee size={20} />
          </div>
        </Link>
      </div>

      {/* Segmented Tabs: Active Queue vs Completed */}
      <div
        className="auth-segmented-track"
        style={{ gridTemplateColumns: '1fr 1fr', maxWidth: '340px', marginBottom: '24px' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`auth-segment-btn ${activeTab === 'active' ? 'active' : ''}`}
        >
          {activeTab === 'active' && (
            <motion.span
              layoutId="doctor-tab-pill"
              className="auth-segment-pill-cream"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span>Active Queue ({activeQueue.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`auth-segment-btn ${activeTab === 'completed' ? 'active' : ''}`}
        >
          {activeTab === 'completed' && (
            <motion.span
              layoutId="doctor-tab-pill"
              className="auth-segment-pill-cream"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span>Completed ({completedList.length})</span>
        </button>
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="glass-card" style={{ padding: '40px' }}>
          <div style={{ fontSize: '15px', color: 'var(--cream-soft)' }}>
            Loading your clinical queue...
          </div>
        </div>
      ) : displayedList.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {displayedList.map((appt) => {
            const isVideo = appt.mode === 'video';
            const pay = appt.payment || {};
            const isPaid = Boolean(pay.isPaid);

            return (
              <div key={appt.id} className="appointment-row-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: 'var(--cream)',
                      color: 'var(--ink-dark)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <User size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '17.5px', fontWeight: 500, color: '#ffffff' }}>
                        {appt.patientName}
                      </h3>

                      <span className="qualification-tag-pill">
                        {isVideo ? <Video size={11} /> : <Building2 size={11} />}
                        <span>{isVideo ? 'Video Consult' : 'In-Person Visit'}</span>
                      </span>

                      {/* Live Payment Badge */}
                      <span
                        className="qualification-tag-pill"
                        style={{
                          background: isPaid
                            ? 'rgba(132, 181, 159, 0.18)'
                            : 'rgba(243, 239, 230, 0.12)',
                          borderColor: isPaid
                            ? 'rgba(132, 181, 159, 0.4)'
                            : 'rgba(243, 239, 230, 0.25)',
                          color: isPaid ? '#d8f3e5' : 'var(--cream)',
                        }}
                      >
                        <CreditCard size={11} />
                        <span>
                          {formatRupees(pay.amount)} •{' '}
                          {pay.status === 'captured'
                            ? 'Paid'
                            : pay.status === 'waived'
                            ? 'Waived'
                            : 'Pending (Pay Later)'}
                        </span>
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--cream-soft)',
                        marginTop: '5px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} />
                        {formatDateShort(appt.startAt)} • {appt.slotTime}
                      </span>
                      {pay.method && (
                        <>
                          <span>•</span>
                          <span>Method: {pay.method}</span>
                        </>
                      )}
                      {pay.transactionId && (
                        <>
                          <span>•</span>
                          <span style={{ color: 'var(--cream-muted)' }}>
                            Ref: {pay.transactionId}
                          </span>
                        </>
                      )}
                    </div>

                    {appt.reason && (
                      <div style={{ fontSize: '12.5px', color: 'var(--cream)', marginTop: '6px' }}>
                        Note: {appt.reason}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {activeTab === 'active' ? (
                    <>
                      {isVideo && (
                        <button
                          type="button"
                          onClick={() => navigate(`/video/${appt.id}`)}
                          className="btn-cream-pill"
                          style={{ padding: '9px 18px', fontSize: '13px' }}
                        >
                          <Video size={14} />
                          <span>Join Video Room</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openCompleteModal(appt)}
                        className="nav-login-btn"
                        style={{ padding: '9px 16px', fontSize: '13px', gap: '6px' }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Mark Completed</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPrescriptionModal(appt)}
                      className="btn-cream-pill"
                      style={{ padding: '9px 18px', fontSize: '13px' }}
                    >
                      <FileText size={14} />
                      <span>Issue / Edit Prescription</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="glass-card"
          style={{ padding: '44px', textAlign: 'center', maxWidth: '540px', margin: '16px auto' }}
        >
          <h3 style={{ fontSize: '19px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>
            {activeTab === 'active'
              ? 'No patients in your active queue'
              : 'No completed consultations yet'}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--cream-soft)' }}>
            {activeTab === 'active'
              ? 'New confirmed bookings from patients will appear here automatically.'
              : 'Once you mark a visit completed, you can issue encrypted digital prescriptions here.'}
          </p>
        </div>
      )}

      {/* 2-STEP MODAL: STEP 1 (COMPLETE & PAYMENT) -> STEP 2 (DIGITAL PRESCRIPTION) */}
      <AnimatePresence>
        {modalAppt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(6, 11, 22, 0.74)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              zIndex: 200,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{
                width: '100%',
                maxWidth: '680px',
                padding: '32px',
                maxHeight: '88vh',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11.5px', letterSpacing: '0.07em', color: 'var(--cream-muted)' }}>
                    {modalStep === 'complete'
                      ? 'STEP 1 OF 2 • COMPLETE CONSULTATION'
                      : 'STEP 2 OF 2 • ENCRYPTED DIGITAL PRESCRIPTION'}
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 500, color: '#ffffff', marginTop: '4px' }}>
                    {modalStep === 'complete'
                      ? `Complete visit with ${modalAppt.patientName}`
                      : `Prescription for ${modalAppt.patientName}`}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="nav-login-btn"
                  style={{ padding: '8px' }}
                >
                  <X size={16} />
                </button>
              </div>

              {modalError && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(217, 107, 107, 0.16)',
                    border: '1px solid rgba(217, 107, 107, 0.38)',
                    color: '#ffd6d6',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(132, 181, 159, 0.18)',
                    border: '1px solid rgba(132, 181, 159, 0.42)',
                    color: '#d8f3e5',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {modalStep === 'complete' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="glass-widget-inner" style={{ padding: '16px 18px', fontSize: '13.5px' }}>
                    <div style={{ color: 'var(--cream-soft)' }}>
                      Scheduled Slot:{' '}
                      <strong style={{ color: '#ffffff' }}>
                        {formatDateShort(modalAppt.startAt)} • {modalAppt.slotTime}
                      </strong>
                    </div>
                    <div style={{ color: 'var(--cream-soft)', marginTop: '6px' }}>
                      Payment Status:{' '}
                      <strong style={{ color: modalAppt.payment?.isPaid ? '#d8f3e5' : 'var(--cream)' }}>
                        {formatRupees(modalAppt.payment?.amount)} •{' '}
                        {modalAppt.payment?.isPaid ? 'Already Paid' : 'Pending (Pay Later)'}
                      </strong>
                    </div>
                  </div>

                  {/* Optional Payment Collection for Pending Pay Later visits */}
                  {!modalAppt.payment?.isPaid && (modalAppt.payment?.amount || 0) > 0 && (
                    <div
                      className="glass-widget-inner"
                      style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>
                          Mark {formatRupees(modalAppt.payment?.amount)} payment as collected now
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={markPaidNow}
                          onClick={() => setMarkPaidNow((p) => !p)}
                          className={`glass-toggle-switch ${markPaidNow ? 'is-on' : ''}`}
                        >
                          <span className="glass-toggle-thumb" />
                        </button>
                      </div>

                      {markPaidNow && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {[
                            { id: 'clinic_upi', label: 'Clinic UPI' },
                            { id: 'cash', label: 'Cash' },
                            { id: 'card', label: 'Card' },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setCollectedMethod(m.id)}
                              className={`time-slot-btn ${
                                collectedMethod === m.id ? 'primary' : 'secondary'
                              }`}
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              {m.label}
                            </button>
                          ))}
                          <input
                            type="text"
                            placeholder="Optional UPI / Receipt Ref"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            className="auth-input-field"
                            style={{ flex: 1, minWidth: '180px', padding: '7px 12px', fontSize: '12.5px' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" onClick={closeModal} className="nav-login-btn">
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingModal}
                      onClick={handleConfirmComplete}
                      className="btn-cream-pill"
                      style={{ padding: '11px 22px' }}
                    >
                      <span>{submittingModal ? 'Completing...' : 'Complete Visit & Continue ↗'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: STRUCTURED ENCRYPTED PRESCRIPTION BUILDER */
                <form onSubmit={handleSavePrescription} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ fontSize: '13.5px', color: 'var(--cream-soft)' }}>
                    Add prescribed medicines below. They are encrypted at rest and immediately
                    accessible in the patient’s <strong>Health Vault</strong>.
                  </p>

                  {medicines.map((med, idx) => (
                    <div
                      key={idx}
                      className="glass-widget-inner"
                      style={{
                        padding: '14px',
                        display: 'grid',
                        gridTemplateColumns: '1.3fr 1fr 1fr 1fr auto',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Medicine Name"
                        value={med.name}
                        onChange={(e) => updateMedicineField(idx, 'name', e.target.value)}
                        className="auth-input-field"
                        style={{ padding: '8px 10px', fontSize: '12.5px' }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Dosage (500mg)"
                        value={med.dosage}
                        onChange={(e) => updateMedicineField(idx, 'dosage', e.target.value)}
                        className="auth-input-field"
                        style={{ padding: '8px 10px', fontSize: '12.5px' }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Freq (1-0-1)"
                        value={med.frequency}
                        onChange={(e) => updateMedicineField(idx, 'frequency', e.target.value)}
                        className="auth-input-field"
                        style={{ padding: '8px 10px', fontSize: '12.5px' }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Duration (5 days)"
                        value={med.duration}
                        onChange={(e) => updateMedicineField(idx, 'duration', e.target.value)}
                        className="auth-input-field"
                        style={{ padding: '8px 10px', fontSize: '12.5px' }}
                        required
                      />
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMedicines((prev) => prev.filter((_, i) => i !== idx))}
                          className="nav-login-btn"
                          style={{ padding: '7px' }}
                          title="Remove row"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}

                  {medicines.length < 30 && (
                    <button
                      type="button"
                      onClick={() => setMedicines((prev) => [...prev, createEmptyMedicineRow()])}
                      className="time-slot-btn secondary"
                      style={{ width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={13} />
                      <span>Add Another Medicine</span>
                    </button>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button type="button" onClick={closeModal} className="nav-login-btn">
                      Skip for Now
                    </button>
                    <button
                      type="submit"
                      disabled={submittingModal}
                      className="btn-cream-pill"
                      style={{ padding: '11px 22px' }}
                    >
                      <span>{submittingModal ? 'Saving...' : 'Save to Patient Health Vault'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
};

export default DoctorDashboard;