import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Video,
  Building2,
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Sparkles,
  MapPin,
  ExternalLink,
  X,
  Pill,
} from 'lucide-react';
import { api, useAuth } from '../../context/AuthContext';

const formatReadableDate = (raw) => {
  if (!raw) return 'Scheduled Session';
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return String(raw);
};

const formatReadableTime = (appt) => {
  if (appt.slotTime) return appt.slotTime;
  const start = appt.startAt || appt.slotId?.startTime || appt.startTime || appt.time;
  if (!start) return '09:00 AM';
  const d = new Date(start);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return String(start);
};

const buildMapsUrl = (addressText) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'

  // Inline Note Editing State
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Patient Prescription Viewer Modal State
  const [activePrescription, setActivePrescription] = useState(null);
  const [loadingRxId, setLoadingRxId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMyAppointments = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const res = await api.get('/booking/patient/appointments');
        const list = res.data?.data || res.data?.appointments;
        if (isMounted) {
          if (!Array.isArray(list)) {
            throw new Error('The appointments response was invalid.');
          }
          setAppointments(list);
        }
      } catch (error) {
        if (isMounted) {
          setAppointments([]);
          setLoadError(error.response?.data?.message || 'Unable to load your appointments.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMyAppointments();
    return () => {
      isMounted = false;
    };
  }, [reloadCount]);

  const handleCancelAppointment = async (apptId) => {
    try {
      setActionError('');
      await api.post(`/booking/patient/appointments/${apptId}/cancel`);
      setAppointments((prev) =>
        prev.map((a) => ((a._id || a.id) === apptId ? { ...a, status: 'cancelled' } : a))
      );
    } catch (error) {
      setActionError(error.response?.data?.message || 'Unable to cancel this appointment.');
    }
  };

  const handleSaveNote = async (apptId) => {
    try {
      setSavingNote(true);
      setActionError('');
      const res = await api.patch(`/booking/patient/appointments/${apptId}/note`, {
        reason: noteDraft.trim(),
      });
      const updatedReason = res.data?.data?.reason || '';
      setAppointments((prev) =>
        prev.map((a) =>
          (a._id || a.id) === apptId ? { ...a, reason: updatedReason || undefined } : a
        )
      );
      setEditingNoteId(null);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not update note.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleViewPrescription = async (apptId) => {
    try {
      setLoadingRxId(apptId);
      setActionError('');
      const res = await api.get(`/booking/patient/appointments/${apptId}/prescription`);
      if (res.data?.data) {
        setActivePrescription(res.data.data);
      }
    } catch (error) {
      setActionError(
        error.response?.data?.message || 'No prescription is available for this consultation yet.'
      );
    } finally {
      setLoadingRxId(null);
    }
  };

  const upcomingList = appointments.filter((a) => {
    const st = String(a.status || 'confirmed').toLowerCase();
    return st !== 'completed' && st !== 'cancelled' && st !== 'no_show';
  });

  const pastList = appointments.filter((a) => {
    const st = String(a.status || '').toLowerCase();
    return st === 'completed' || st === 'cancelled' || st === 'no_show';
  });

  const displayedList = activeTab === 'upcoming' ? upcomingList : pastList;

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="dashboard-page-container"
    >
      {/* Top Header */}
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
            <span>PATIENT HEALTH PORTAL</span>
          </div>

          <h1
            className="hero-display-title"
            style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.2rem)' }}
          >
            Welcome{user?.name ? `, ${user.name}` : ''}.
          </h1>
        </div>

        <Link to="/search" className="btn-cream-pill">
          <Plus size={16} />
          <span>Book New Consultation</span>
          <span className="arrow-cycle-box">
            <span className="arrow-icon-primary">↗</span>
            <span className="arrow-icon-clone">↗</span>
          </span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
              Upcoming Consultations
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
              {upcomingList.length}
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
            <Calendar size={20} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
              Past Visits & Prescriptions
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
              {pastList.length}
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
            <FileText size={20} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
              Camera & Audio Readiness
            </div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: '#d8f3e5', marginTop: '8px' }}>
              Browser Video Ready
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
            <Video size={20} />
          </div>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div
        className="auth-segmented-track"
        style={{
          gridTemplateColumns: '1fr 1fr',
          maxWidth: '360px',
          marginBottom: '24px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`auth-segment-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
        >
          {activeTab === 'upcoming' && (
            <motion.span
              layoutId="patient-tab-pill"
              className="auth-segment-pill-cream"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span>Upcoming ({upcomingList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`auth-segment-btn ${activeTab === 'past' ? 'active' : ''}`}
        >
          {activeTab === 'past' && (
            <motion.span
              layoutId="patient-tab-pill"
              className="auth-segment-pill-cream"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span>Past & Prescriptions ({pastList.length})</span>
        </button>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="glass-card" style={{ padding: '40px' }}>
          <div style={{ fontSize: '15px', color: 'var(--cream-soft)' }}>
            Loading your appointments...
          </div>
        </div>
      ) : loadError ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <p role="alert" style={{ color: 'var(--cream-soft)', marginBottom: '18px' }}>
            {loadError}
          </p>
          <button
            type="button"
            className="btn-cream-pill"
            onClick={() => setReloadCount((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      ) : displayedList.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {actionError && (
            <p role="alert" style={{ color: '#ffd6d6', fontSize: '13.5px' }}>
              {actionError}
            </p>
          )}
          <AnimatePresence mode="popLayout">
            {displayedList.map((appt, idx) => {
              const apptId = appt._id || appt.id || idx;
              const docObj = appt.doctorId || appt.doctor || {};
              const docName =
                docObj.userId?.name || docObj.name || appt.doctorName || 'Verified Specialist';
              const docSpec =
                docObj.specialisations?.[0]?.name ||
                docObj.specialisation ||
                appt.specialisation ||
                'Specialist Consultation';
              const fullAddress = [docObj.clinicAddress, docObj.city].filter(Boolean).join(', ');
              const mode = String(appt.mode || appt.slotId?.mode || 'video').toLowerCase();
              const isVideo = !mode.includes('person') && !mode.includes('clinic');
              const status = String(appt.status || 'confirmed').toLowerCase();

              return (
                <motion.div
                  key={apptId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="appointment-row-card"
                >
                  {/* Left: Specialist, Address & Editable Note */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
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
                      <Stethoscope size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#ffffff' }}>
                          {docName}
                        </h3>
                        <span
                          className="qualification-tag-pill"
                          style={{
                            background: isVideo
                              ? 'rgba(132, 181, 159, 0.18)'
                              : 'rgba(243, 239, 230, 0.14)',
                            color: isVideo ? '#d8f3e5' : 'var(--cream)',
                          }}
                        >
                          {isVideo ? <Video size={11} /> : <Building2 size={11} />}
                          <span>{isVideo ? 'Video Consult' : 'In-Person Clinic'}</span>
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
                        <span>{docSpec}</span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} />
                          {formatReadableDate(
                            appt.date || appt.startAt || appt.slotId?.startTime || appt.createdAt
                          )}
                        </span>
                        <span>•</span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: '#ffffff',
                            fontWeight: 500,
                          }}
                        >
                          <Clock size={13} />
                          {formatReadableTime(appt)}
                        </span>
                      </div>

                      {/* Clinic Address Guardrail: Only show Directions when street clinicAddress exists */}
                      {!isVideo && (docObj.clinicAddress || docObj.city) && (
                        <div
                          style={{
                            fontSize: '12.5px',
                            color: 'var(--cream)',
                            marginTop: '7px',
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <MapPin size={13} />
                            <span>
                              {docObj.clinicAddress
                                ? `${docObj.clinicAddress}${docObj.city ? `, ${docObj.city}` : ''}`
                                : `${docObj.city} (Full clinic address not added yet)`}
                            </span>
                          </span>
                          {docObj.clinicAddress && (
                            <a
                              href={buildMapsUrl(fullAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#d8f3e5',
                                textDecoration: 'underline',
                                fontSize: '12px',
                              }}
                            >
                              <span>Directions</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Editable Patient Note */}
                      {editingNoteId === apptId ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <input
                            type="text"
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Add symptoms or a note for the doctor..."
                            className="auth-input-field"
                            style={{ padding: '6px 12px', fontSize: '12.5px', minWidth: '260px' }}
                          />
                          <button
                            type="button"
                            disabled={savingNote}
                            onClick={() => handleSaveNote(apptId)}
                            className="time-slot-btn primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            {savingNote ? 'Saving...' : 'Save Note'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="time-slot-btn secondary"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: '6px',
                            fontSize: '12.5px',
                            color: 'var(--cream-muted)',
                            flexWrap: 'wrap',
                          }}
                        >
                          {appt.reason && <span>Note: {appt.reason}</span>}
                          {activeTab === 'upcoming' && status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(apptId);
                                setNoteDraft(appt.reason || '');
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--cream)',
                                textDecoration: 'underline',
                                fontSize: '12px',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              {appt.reason ? 'Edit note' : '+ Add note for doctor'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {status === 'cancelled' ? (
                      <span
                        className="qualification-tag-pill"
                        style={{
                          background: 'rgba(217, 107, 107, 0.16)',
                          borderColor: 'rgba(217, 107, 107, 0.35)',
                          color: '#ffd6d6',
                          padding: '6px 12px',
                        }}
                      >
                        <XCircle size={13} />
                        <span>Cancelled</span>
                      </span>
                    ) : activeTab === 'upcoming' ? (
                      <>
                        {isVideo && (
                          <button
                            type="button"
                            onClick={() => navigate(`/video/${apptId}`)}
                            className="btn-cream-pill"
                            style={{ padding: '10px 20px', fontSize: '13.5px' }}
                          >
                            <Video size={15} />
                            <span>Join Video Room</span>
                            <span>↗</span>
                          </button>
                        )}

                        {status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleCancelAppointment(apptId)}
                            className="nav-login-btn"
                            style={{ fontSize: '13px', padding: '9px 15px' }}
                          >
                            Cancel
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {status === 'completed' && appt.hasPrescription && (
                          <button
                            type="button"
                            disabled={loadingRxId === apptId}
                            onClick={() => handleViewPrescription(apptId)}
                            className="btn-cream-pill"
                            style={{ padding: '9px 18px', fontSize: '13px' }}
                          >
                            <FileText size={14} />
                            <span>
                              {loadingRxId === apptId ? 'Loading...' : 'View Prescription'}
                            </span>
                          </button>
                        )}
                        <span
                          className="qualification-tag-pill"
                          style={{ padding: '6px 12px', color: '#d8f3e5' }}
                        >
                          <CheckCircle2 size={13} />
                          <span>{status === 'no_show' ? 'Missed' : 'Completed'}</span>
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div
          className="glass-card"
          style={{
            padding: '48px',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '16px auto',
          }}
        >
          <h3 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>
            {activeTab === 'upcoming'
              ? 'No upcoming consultations scheduled'
              : 'No past consultations yet'}
          </h3>
          <p style={{ fontSize: '14.5px', color: 'var(--cream-soft)', marginBottom: '24px' }}>
            Browse our specialist directory to book a video or in-person consultation in seconds.
          </p>
          <Link to="/search" className="btn-cream-pill">
            <span>Find a Specialist</span>
            <span className="arrow-cycle-box">
              <span className="arrow-icon-primary">↗</span>
              <span className="arrow-icon-clone">↗</span>
            </span>
          </Link>
        </div>
      )}

      {/* Patient Digital Prescription Modal */}
      <AnimatePresence>
        {activePrescription && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePrescription(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(6, 11, 22, 0.72)',
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
                maxWidth: '640px',
                padding: '32px',
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      letterSpacing: '0.07em',
                      color: 'var(--cream-muted)',
                      marginBottom: '6px',
                    }}
                  >
                    DIGITAL PRESCRIPTION • V{activePrescription.version}
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 500, color: '#ffffff' }}>
                    {activePrescription.doctorName}
                  </h2>
                  <div style={{ fontSize: '13.5px', color: 'var(--cream-soft)', marginTop: '2px' }}>
                    {activePrescription.specialisation} • Issued{' '}
                    {formatReadableDate(activePrescription.issuedAt)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePrescription(null)}
                  className="nav-login-btn"
                  style={{ padding: '8px' }}
                  aria-label="Close prescription"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(activePrescription.medicines || []).map((med, i) => (
                  <div
                    key={`${med.name}-${i}`}
                    className="glass-widget-inner"
                    style={{
                      padding: '15px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          background: 'rgba(132, 181, 159, 0.18)',
                          color: '#d8f3e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Pill size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '15.5px', fontWeight: 500, color: '#ffffff' }}>
                          {med.name}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--cream-soft)' }}>
                          Dosage: {med.dosage}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="qualification-tag-pill">Freq: {med.frequency}</span>
                      <span className="qualification-tag-pill">Duration: {med.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
};

export default PatientDashboard;