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
  const start = appt.slotId?.startTime || appt.startTime || appt.time;
  if (!start) return '09:00 AM';
  if (String(start).includes('T')) {
    const d = new Date(start);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  return String(start);
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'

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

      {/* Segmented Tab Switcher: Upcoming vs Past */}
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
          <button type="button" className="btn-cream-pill" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : displayedList.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {actionError && (
            <p role="alert" style={{ color: '#ffd6d6' }}>
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
                  {/* Left: Specialist & Time Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
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
                      }}
                    >
                      <Stethoscope size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

                      {appt.reason && (
                        <div
                          style={{
                            fontSize: '12.5px',
                            color: 'var(--cream-muted)',
                            marginTop: '6px',
                          }}
                        >
                          Note: “{appt.reason}”
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      <span
                        className="qualification-tag-pill"
                        style={{ padding: '6px 12px', color: '#d8f3e5' }}
                      >
                        <CheckCircle2 size={13} />
                        <span>{status === 'no_show' ? 'Missed' : 'Completed'}</span>
                      </span>
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
    </motion.main>
  );
};

export default PatientDashboard;