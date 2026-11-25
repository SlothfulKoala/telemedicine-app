// frontend/src/pages/video/VideoRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  User,
  Loader2,
  X,
} from 'lucide-react';
import { api, useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../hooks/useWebRTC';

const ERROR_META = {
  TOO_EARLY: {
    badge: 'SCHEDULE WINDOW',
    title: 'Consultation Room Opens Soon',
    hint: 'Rooms unlock 15 minutes before your scheduled appointment start time.',
    Icon: Clock,
  },
  WINDOW_EXPIRED: {
    badge: 'SESSION ENDED',
    title: 'Consultation Window Has Closed',
    hint: 'This scheduled session has passed its grace window. Return to your dashboard to book a follow-up.',
    Icon: Clock,
  },
  FORBIDDEN: {
    badge: 'ACCESS RESTRICTED',
    title: 'Unable to Enter Consultation Room',
    hint: 'Only the assigned patient and specialist for this appointment can join this encrypted room.',
    Icon: ShieldAlert,
  },
};

export default function VideoRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessionInfo, setSessionInfo] = useState(null); // { roomToken, roomId, role, appointment }
  const [authorizing, setAuthorizing] = useState(true);
  const [authError, setAuthError] = useState(null); // { code, message, earliestJoinAt }
  const [retryTick, setRetryTick] = useState(0);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const {
    localStream,
    remoteStream,
    toggleMic,
    toggleVideo,
    isMicMuted,
    isVideoOff,
    connectionStatus,
    socketError,
  } = useWebRTC({
    roomId: sessionInfo?.roomId,
    roomToken: sessionInfo?.roomToken,
  });

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const dashboardPath =
    user?.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';

  useEffect(() => {
    let active = true;

    const requestRoomAccess = async () => {
      try {
        setAuthorizing(true);
        setAuthError(null);
        setDismissedBanner(false);
        const res = await api.post(`/video/consults/${appointmentId}/token`);
        if (active && res.data?.success) {
          setSessionInfo(res.data);
        }
      } catch (err) {
        if (!active) return;
        const data = err.response?.data || {};
        setAuthError({
          code: data.code || 'FORBIDDEN',
          message:
            data.message ||
            'You are not authorized to join this video consultation.',
          earliestJoinAt: data.earliestJoinAt || null,
        });
      } finally {
        if (active) setAuthorizing(false);
      }
    };

    if (appointmentId) {
      requestRoomAccess();
    }

    return () => {
      active = false;
    };
  }, [appointmentId, retryTick]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (socketError) {
      setDismissedBanner(false);
    }
  }, [socketError]);

  /* 1. Verifying Access State */
  if (authorizing) {
    return (
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{
            maxWidth: '460px',
            width: '100%',
            padding: '40px 36px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'rgba(243, 239, 230, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              color: 'var(--cream)',
            }}
          >
            <Loader2 size={24} className="animate-spin" />
          </div>
          <h2 style={{ fontSize: '21px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>
            Preparing Encrypted Room
          </h2>
          <p style={{ fontSize: '14.5px', color: 'var(--cream-soft)', lineHeight: 1.6 }}>
            Verifying your appointment schedule and issuing single-use session credentials...
          </p>
        </motion.div>
      </main>
    );
  }

  /* 2. Authorization / Schedule Window Error State */
  if (authError) {
    const meta = ERROR_META[authError.code] || ERROR_META.FORBIDDEN;
    const StatusIcon = meta.Icon;

    return (
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          className="glass-card"
          style={{
            maxWidth: '520px',
            width: '100%',
            padding: '40px 36px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '5px 13px',
              borderRadius: '999px',
              background:
                authError.code === 'TOO_EARLY'
                  ? 'rgba(132, 181, 159, 0.16)'
                  : 'rgba(217, 107, 107, 0.18)',
              border:
                authError.code === 'TOO_EARLY'
                  ? '1px solid rgba(132, 181, 159, 0.38)'
                  : '1px solid rgba(217, 107, 107, 0.4)',
              color: authError.code === 'TOO_EARLY' ? '#d8f3e5' : '#ffd6d6',
              fontSize: '11.5px',
              fontWeight: 500,
              letterSpacing: '0.06em',
              marginBottom: '18px',
            }}
          >
            <StatusIcon size={13} />
            <span>{meta.badge}</span>
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 500,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginBottom: '10px',
            }}
          >
            {meta.title}
          </h2>

          <p
            style={{
              fontSize: '15px',
              color: 'var(--cream-soft)',
              lineHeight: 1.6,
              marginBottom: '18px',
            }}
          >
            {authError.message}
          </p>

          {authError.earliestJoinAt ? (
            <div
              className="glass-widget-inner"
              style={{
                padding: '14px 18px',
                marginBottom: '24px',
                fontSize: '13.5px',
                color: '#d8f3e5',
              }}
            >
              Room unlocks at{' '}
              <strong style={{ color: '#ffffff' }}>
                {new Date(authError.earliestJoinAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
            </div>
          ) : (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--cream-muted)',
                lineHeight: 1.55,
                marginBottom: '26px',
              }}
            >
              {meta.hint}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setRetryTick((n) => n + 1)}
              className="btn-cream-pill"
              style={{ padding: '11px 22px', fontSize: '14px' }}
            >
              <RefreshCw size={15} />
              <span>{authError.code === 'TOO_EARLY' ? 'Check Again' : 'Retry Access'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(dashboardPath)}
              className="btn-glass-pill"
              style={{ padding: '11px 22px', fontSize: '14px' }}
            >
              <ArrowLeft size={15} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  /* 3. Active Video Consultation Room */
  const peerName =
    sessionInfo?.role === 'doctor'
      ? sessionInfo?.appointment?.patientName || 'Patient'
      : sessionInfo?.appointment?.doctorName || 'Doctor';

  const peerRoleTag = sessionInfo?.role === 'doctor' ? 'Patient' : 'Specialist';

  const statusMeta =
    connectionStatus === 'connected'
      ? { label: 'Live • Encrypted P2P', className: 'is-connected' }
      : connectionStatus === 'error'
      ? { label: 'Connection Interrupted', className: 'is-error' }
      : connectionStatus === 'waiting'
      ? { label: `Waiting for ${peerRoleTag}`, className: 'is-waiting' }
      : { label: 'Initializing Media...', className: 'is-waiting' };

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
      className="video-consult-shell"
    >
      {/* Compact Session Header Bar */}
      <div className="video-consult-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className="qualification-tag-pill">
            <ShieldCheck size={12} color="#84b59f" />
            <span>End-to-End Encrypted</span>
          </span>
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff' }}>
            {peerName}
          </span>
          {sessionInfo?.appointment?.startAt && (
            <span style={{ fontSize: '13px', color: 'var(--cream-muted)' }}>
              •{' '}
              {new Date(sessionInfo.appointment.startAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        <div className={`video-status-pill ${statusMeta.className}`}>
          <span className="video-status-dot" />
          <span>{statusMeta.label}</span>
        </div>
      </div>

      {/* Styled In-Call Error Banner */}
      <AnimatePresence>
        {socketError && !dismissedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="video-error-banner"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '11px',
                  background: 'rgba(217, 107, 107, 0.25)',
                  border: '1px solid rgba(255, 214, 214, 0.32)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffd6d6',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={18} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#ffffff' }}>
                  Consultation Media / Connection Notice
                </div>
                <div style={{ fontSize: '13px', color: '#ffd6d6', marginTop: '2px' }}>
                  {socketError}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setRetryTick((n) => n + 1)}
                className="btn-cream-pill"
                style={{ padding: '7px 14px', fontSize: '12.5px' }}
              >
                <RefreshCw size={13} />
                <span>Reconnect</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissedBanner(true)}
                className="nav-login-btn"
                style={{ padding: '7px' }}
                aria-label="Dismiss error"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Stage: Maximized Remote Participant + Minimized Self-View PiP */}
      <div className="video-stage-viewport">
        {/* Maximized Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="video-remote-feed"
          style={{ opacity: remoteStream ? 1 : 0 }}
        />

        {/* Remote Participant Nameplate */}
        <div className="video-peer-badge">
          <User size={13} color="var(--cream)" />
          <span>{peerName}</span>
          <span style={{ color: 'var(--cream-muted)', fontSize: '12px' }}>
            ({peerRoleTag})
          </span>
        </div>

        {/* Frosted Waiting / Connecting Overlay when Remote Stream hasn't arrived yet */}
        {!remoteStream && (
          <div className="video-waiting-overlay">
            <div className="video-waiting-avatar">
              <User size={34} />
            </div>
            <h3
              style={{
                fontSize: '21px',
                fontWeight: 500,
                color: '#ffffff',
                marginBottom: '8px',
              }}
            >
              {connectionStatus === 'error'
                ? 'Unable to Establish Video Stream'
                : `Waiting for ${peerName} to join...`}
            </h3>
            <p
              style={{
                maxWidth: '420px',
                fontSize: '14px',
                color: 'var(--cream-soft)',
                lineHeight: 1.6,
              }}
            >
              {connectionStatus === 'error'
                ? 'Check your browser camera/microphone permissions above and click Reconnect.'
                : 'Your audio and video are ready. The full-screen view will connect automatically as soon as they enter the room.'}
            </p>
          </div>
        )}

        {/* Minimized Picture-in-Picture Self-View */}
        <div className="video-pip-card">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-local-feed"
            style={{ opacity: localStream && !isVideoOff ? 1 : 0 }}
          />

          {(!localStream || isVideoOff) && (
            <div className="video-pip-muted-cover">
              <VideoOff size={18} />
              <span>{isVideoOff ? 'Camera Off' : 'Starting...'}</span>
            </div>
          )}

          <div className="video-pip-label">
            <span className="video-pip-tag">
              You ({sessionInfo?.role === 'doctor' ? 'Doctor' : 'Patient'})
            </span>
            {isMicMuted && (
              <span
                className="video-pip-tag"
                style={{ background: 'rgba(198, 83, 83, 0.85)', color: '#fff' }}
              >
                Muted
              </span>
            )}
          </div>
        </div>

        {/* Floating Glass Control Dock */}
        <div className="video-controls-dock">
          <button
            type="button"
            onClick={toggleMic}
            className={`video-dock-btn ${isMicMuted ? 'is-toggled-off' : ''}`}
          >
            {isMicMuted ? <MicOff size={17} /> : <Mic size={17} />}
            <span>{isMicMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            type="button"
            onClick={toggleVideo}
            className={`video-dock-btn ${isVideoOff ? 'is-toggled-off' : ''}`}
          >
            {isVideoOff ? <VideoOff size={17} /> : <Video size={17} />}
            <span>{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(dashboardPath)}
            className="video-dock-btn is-end-call"
          >
            <PhoneOff size={17} />
            <span>Leave Call</span>
          </button>
        </div>
      </div>
    </motion.main>
  );
}