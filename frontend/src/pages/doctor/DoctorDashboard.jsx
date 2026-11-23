import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Video,
  Building2,
  Users,
  FileCheck2,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  User,
  Plus,
  Trash2,
} from 'lucide-react';
import { api, useAuth } from '../../context/AuthContext';

const formatSlotDisplay = (appt) => {
  if (appt.slotTime) return appt.slotTime;
  const raw = appt.slotId?.startTime || appt.startTime || appt.date;
  if (!raw) return 'Scheduled Slot';
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return `${d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return String(raw);
};

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed'
  const [upcomingAppts, setUpcomingAppts] = useState([]);
  const [completedAppts, setCompletedAppts] = useState([]);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  // Prescription Drawer State (Only for Completed Appointments per Backend Rule)
  const [activeRxPatient, setActiveRxPatient] = useState(null);
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: '', duration: '' },
  ]);
  const [rxStatus, setRxStatus] = useState(null);
  const [submittingRx, setSubmittingRx] = useState(false);

  const loadDoctorAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setActionError('');

      const [activeRes, completedRes] = await Promise.allSettled([
        api.get('/booking/doctor/appointments'),
        api.get('/booking/doctor/appointments/completed'),
      ]);

      if (activeRes.status === 'fulfilled') {
        const data = activeRes.value.data;
        if (data?.timezone) setTimezone(data.timezone);
        setUpcomingAppts(Array.isArray(data?.appointments) ? data.appointments : []);
      }

      if (completedRes.status === 'fulfilled') {
        const data = completedRes.value.data;
        setCompletedAppts(Array.isArray(data?.appointments) ? data.appointments : []);
      }
    } catch (err) {
      setActionError('Unable to load appointments. Please ensure your backend server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctorAppointments();
  }, [loadDoctorAppointments]);

  // PATCH /api/booking/doctor/appointments/:appointmentId/complete
  const handleMarkComplete = async (appt) => {
    const apptId = appt._id || appt.id;
    setActionError('');
    try {
      await api.patch(`/booking/doctor/appointments/${apptId}/complete`);
      const updatedAppt = { ...appt, status: 'completed' };
      setUpcomingAppts((prev) => prev.filter((a) => (a._id || a.id) !== apptId));
      setCompletedAppts((prev) => [updatedAppt, ...prev]);
      setActiveTab('completed');
      // Automatically open the prescription drawer for the newly completed appointment
      const patientName =
        appt.patientId?.name || appt.patient?.name || appt.patientName || 'Patient';
      setActiveRxPatient({ ...updatedAppt, patientName });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Appointment can only be marked complete after its scheduled end time.';
      setActionError(msg);
    }
  };

  const handleAddMedicine = () => {
    if (medicines.length >= 30) return;
    setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleRemoveMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  // POST /api/booking/prescription/:appointmentId
  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (!activeRxPatient) return;

    const validMedicines = medicines
      .map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
      }))
      .filter((m) => m.name !== '');

    if (validMedicines.length === 0) {
      setRxStatus({ type: 'error', text: 'Please add at least one medication.' });
      return;
    }

    setSubmittingRx(true);
    setRxStatus(null);

    const apptId = activeRxPatient._id || activeRxPatient.id;
    try {
      const res = await api.post(`/booking/prescription/${apptId}`, {
        medicines: validMedicines,
      });
      const version = res.data?.data?.version || 1;
      setRxStatus({
        type: 'success',
        text: `Prescription (v${version}) encrypted and saved for ${activeRxPatient.patientName}.`,
      });
      setTimeout(() => {
        setRxStatus(null);
        setActiveRxPatient(null);
        setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }]);
      }, 1800);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save prescription. Ensure all medicine fields are filled and the appointment is marked completed.';
      setRxStatus({ type: 'error', text: msg });
    } finally {
      setSubmittingRx(false);
    }
  };

  const displayedList = activeTab === 'upcoming' ? upcomingAppts : completedAppts;

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
          justifyContent: 'space-between',
          alignItems: 'flex-end',
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

          <h1
            className="hero-display-title"
            style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.2rem)' }}
          >
            {user?.name ? `${user.name}’s Console` : 'Clinical Console'}.
          </h1>
        </div>

        <Link to="/doctor/schedule" className="btn-cream-pill">
          <Sliders size={16} />
          <span>Configure Weekly Schedule</span>
          <span className="arrow-cycle-box">
            <span className="arrow-icon-primary">↗</span>
            <span className="arrow-icon-clone">↗</span>
          </span>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
              Active / Upcoming Queue
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
              {upcomingAppts.length}
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
              {completedAppts.length}
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

        <div className="dashboard-stat-card">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
              Weekly Slot Rules
            </div>
            <Link
              to="/doctor/schedule"
              style={{
                display: 'inline-block',
                fontSize: '14.5px',
                fontWeight: 500,
                color: 'var(--cream)',
                marginTop: '8px',
                textDecoration: 'underline',
              }}
            >
              Manage hours & modes ↗
            </Link>
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
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {/* Tab Switcher: Active Queue vs Completed Consultations */}
      <div
        className="auth-segmented-track"
        style={{
          gridTemplateColumns: '1fr 1fr',
          maxWidth: '400px',
          marginBottom: '22px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`auth-segment-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
        >
          {activeTab === 'upcoming' && (
            <motion.span
              layoutId="doc-tab-pill"
              className="auth-segment-pill-cream"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span>Active Queue ({upcomingAppts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`auth-segment-btn ${activeTab === 'completed' ? 'active' : ''}`}
        >
          {activeTab === 'completed' && (
            <motion.span
              layoutId="doc-tab-pill"
              className="auth-segment-pill-cream"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span>Completed ({completedAppts.length})</span>
        </button>
      </div>

      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(217, 107, 107, 0.16)',
              border: '1px solid rgba(217, 107, 107, 0.38)',
              color: '#ffd6d6',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '18px',
            }}
          >
            <AlertCircle size={16} />
            <span>{actionError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="glass-card" style={{ padding: '40px' }}>
          <div style={{ fontSize: '15px', color: 'var(--cream-soft)' }}>
            Loading your patient appointments...
          </div>
        </div>
      ) : displayedList.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {displayedList.map((appt, idx) => {
            const apptId = appt._id || appt.id || idx;
            const patientName =
              appt.patientId?.name || appt.patient?.name || appt.patientName || 'Verified Patient';
            const mode = String(appt.mode || appt.slotId?.mode || 'video').toLowerCase();
            const isVideo = !mode.includes('person') && !mode.includes('clinic');

            return (
              <div key={apptId} className="appointment-row-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                    }}
                  >
                    <User size={21} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '17.5px', fontWeight: 500, color: '#ffffff' }}>
                        {patientName}
                      </span>
                      <span className="qualification-tag-pill">
                        {isVideo ? <Video size={11} /> : <Building2 size={11} />}
                        <span>{isVideo ? 'Video Consult' : 'In-Person Visit'}</span>
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--cream-soft)',
                        marginTop: '4px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} />
                        {formatSlotDisplay(appt)}
                      </span>
                      {(appt.reason || appt.notes) && (
                        <span>• Note: “{appt.reason || appt.notes}”</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Active Queue vs Completed */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {activeTab === 'upcoming' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMarkComplete(appt)}
                        className="nav-login-btn"
                        style={{ gap: '6px' }}
                        title="Mark elapsed appointment as completed to issue prescription"
                      >
                        <CheckCircle2 size={15} />
                        <span>Mark Completed</span>
                      </button>

                      {isVideo && (
                        <button
                          type="button"
                          onClick={() => navigate(`/video/${apptId}`)}
                          className="btn-cream-pill"
                          style={{ padding: '10px 20px', fontSize: '13.5px' }}
                        >
                          <Video size={15} />
                          <span>Launch Call</span>
                          <span>↗</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRxStatus(null);
                        setActiveRxPatient({ ...appt, patientName });
                      }}
                      className="btn-cream-pill"
                      style={{ padding: '10px 20px', fontSize: '13.5px' }}
                    >
                      <FileCheck2 size={15} />
                      <span>Write / Revise Prescription</span>
                      <span>↗</span>
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
          style={{
            padding: '48px',
            textAlign: 'center',
            maxWidth: '580px',
            margin: '16px auto',
          }}
        >
          <h3 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>
            {activeTab === 'upcoming'
              ? 'No active appointments in your queue'
              : 'No completed appointments yet'}
          </h3>
          <p style={{ fontSize: '14.5px', color: 'var(--cream-soft)', marginBottom: '24px' }}>
            {activeTab === 'upcoming'
              ? 'Publish your weekly availability in the Schedule Builder so patients can reserve slots.'
              : 'Mark an active consultation as completed after it ends to issue an encrypted prescription.'}
          </p>
          {activeTab === 'upcoming' && (
            <Link to="/doctor/schedule" className="btn-cream-pill">
              <span>Open Schedule Builder</span>
              <span className="arrow-cycle-box">
                <span className="arrow-icon-primary">↗</span>
                <span className="arrow-icon-clone">↗</span>
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Structured Digital Prescription Drawer (POST /api/booking/prescription/:appointmentId) */}
      <AnimatePresence>
        {activeRxPatient && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="glass-card"
            style={{ marginTop: '28px', padding: '28px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#ffffff' }}>
                  Structured Prescription for {activeRxPatient.patientName}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--cream-muted)', marginTop: '2px' }}>
                  Add 1–30 medication rows. Data is encrypted by the backend upon submission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveRxPatient(null)}
                className="nav-login-btn"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Close
              </button>
            </div>

            {rxStatus && (
              <div
                style={{
                  padding: '13px 16px',
                  borderRadius: '12px',
                  background:
                    rxStatus.type === 'error'
                      ? 'rgba(217, 107, 107, 0.16)'
                      : 'rgba(132, 181, 159, 0.18)',
                  color: rxStatus.type === 'error' ? '#ffd6d6' : '#d8f3e5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontSize: '13.5px',
                }}
              >
                {rxStatus.type === 'error' ? (
                  <AlertCircle size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>{rxStatus.text}</span>
              </div>
            )}

            <form
              onSubmit={handleSavePrescription}
              style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className="auth-input-label">Prescribed Medications</label>
                {medicines.map((med, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                      gap: '10px',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Medicine Name (e.g. Paracetamol)"
                      value={med.name}
                      onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                      className="auth-input-field"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                      className="auth-input-field"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Frequency (e.g. 1-0-1)"
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                      className="auth-input-field"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Duration (e.g. 5 days)"
                      value={med.duration}
                      onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                      className="auth-input-field"
                      required
                    />
                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(index)}
                        className="nav-login-btn"
                        style={{
                          padding: '10px',
                          color: 'rgba(217, 107, 107, 0.9)',
                          borderColor: 'rgba(217, 107, 107, 0.3)',
                        }}
                        title="Remove row"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddMedicine}
                  className="time-slot-btn secondary"
                  style={{
                    width: 'fit-content',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '4px',
                  }}
                >
                  <Plus size={14} />
                  <span>Add another medicine</span>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={submittingRx}
                  className="btn-cream-pill"
                >
                  <span>
                    {submittingRx ? 'Saving Prescription...' : 'Save Encrypted Prescription'}
                  </span>
                  <span>↗</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
};

export default DoctorDashboard;