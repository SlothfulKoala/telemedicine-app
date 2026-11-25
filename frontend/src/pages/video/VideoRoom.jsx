// frontend/src/pages/video/VideoRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../hooks/useWebRTC';

export default function VideoRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessionInfo, setSessionInfo] = useState(null); // { roomToken, roomId, role, appointment }
  const [authorizing, setAuthorizing] = useState(true);
  const [authError, setAuthError] = useState(null); // { code, message, earliestJoinAt }
  const [retryTick, setRetryTick] = useState(0);

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

  const [backendInput, setBackendInput] = useState(
    localStorage.getItem('TELEMED_BACKEND_URL') || ''
  );

  const dashboardPath =
    user?.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';

  useEffect(() => {
    let active = true;

    const requestRoomAccess = async () => {
      try {
        setAuthorizing(true);
        setAuthError(null);
        const res = await api.post(`/video/consults/${appointmentId}/token`);
        if (active && res.data?.success) {
          setSessionInfo(res.data);
        }
      } catch (err) {
        if (!active) return;
        const data = err.response?.data || {};
        setAuthError({
          code: data.code || 'FORBIDDEN',
          message: data.message || 'You are not authorized to join this video consultation.',
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

  const saveBackend = () => {
    if (backendInput.trim() !== '') {
      let formattedUrl = backendInput.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      localStorage.setItem('TELEMED_BACKEND_URL', formattedUrl);
    } else {
      localStorage.removeItem('TELEMED_BACKEND_URL');
    }
    window.location.reload();
  };

  const clearBackend = () => {
    localStorage.removeItem('TELEMED_BACKEND_URL');
    setBackendInput('');
    window.location.reload();
  };

  if (authorizing) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--cream)' }}>
        <h2>Verifying Consultation Access...</h2>
        <p style={{ color: 'var(--cream-soft)' }}>
          Checking appointment schedule and issuing encrypted room credentials.
        </p>
      </div>
    );
  }

  if (authError) {
    return (
      <div
        className="glass-card"
        style={{
          maxWidth: '520px',
          margin: '48px auto',
          padding: '36px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: '#ffffff', marginBottom: '12px' }}>
          {authError.code === 'TOO_EARLY'
            ? 'Consultation Room Not Open Yet'
            : 'Unable to Join Consultation'}
        </h2>
        <p style={{ color: 'var(--cream-soft)', marginBottom: '16px' }}>
          {authError.message}
        </p>
        {authError.earliestJoinAt && (
          <p style={{ color: '#d8f3e5', fontSize: '14px', marginBottom: '20px' }}>
            Room opens at:{' '}
            <strong>
              {new Date(authError.earliestJoinAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </strong>
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {authError.code === 'TOO_EARLY' && (
            <button
              type="button"
              onClick={() => setRetryTick((n) => n + 1)}
              className="btn-cream-pill"
            >
              Check Again
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(dashboardPath)}
            className="nav-login-btn"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const peerLabel =
    sessionInfo?.role === 'doctor'
      ? `Patient: ${sessionInfo?.appointment?.patientName || 'Patient'}`
      : `Doctor: ${sessionInfo?.appointment?.doctorName || 'Doctor'}`;

  return (
    <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#ffffff' }}>🩺 Telemedicine Video Consultation</h2>
      <p style={{ color: 'var(--cream-soft)', marginBottom: '16px' }}>
        {peerLabel} •{' '}
        {sessionInfo?.appointment?.startAt &&
          new Date(sessionInfo.appointment.startAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
      </p>

      {import.meta.env.DEV && (
        <div
          style={{
            background: 'rgba(255,255,255,0.08)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'inline-block',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <input
              type="text"
              placeholder="Custom backend tunnel URL (optional)"
              value={backendInput}
              onChange={(e) => setBackendInput(e.target.value)}
              style={{ padding: '6px 10px', width: '280px', borderRadius: '4px' }}
            />
            <button onClick={saveBackend} className="btn-cream-pill" style={{ padding: '6px 12px' }}>
              Connect
            </button>
            {localStorage.getItem('TELEMED_BACKEND_URL') && (
              <button onClick={clearBackend} className="nav-login-btn" style={{ padding: '6px 12px' }}>
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {socketError && (
        <div style={{ color: '#ffd6d6', marginBottom: '16px' }}>
          {socketError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ border: '2px solid #84b59f', borderRadius: '12px', padding: '12px', background: 'rgba(0,0,0,0.35)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#ffffff' }}>You ({sessionInfo?.role})</h4>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '380px', height: '260px', background: '#000', borderRadius: '8px', objectFit: 'cover' }}
          />
        </div>

        <div style={{ border: '2px solid rgba(255,255,255,0.25)', borderRadius: '12px', padding: '12px', background: 'rgba(0,0,0,0.35)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#ffffff' }}>{peerLabel}</h4>
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '380px', height: '260px', background: '#000', borderRadius: '8px', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '380px',
                height: '260px',
                background: '#111827',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                color: 'var(--cream-soft)',
              }}
            >
              {connectionStatus === 'waiting'
                ? 'Waiting for the other participant to join...'
                : 'Initializing video stream...'}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={toggleMic}
          className="btn-cream-pill"
          style={{ background: isMicMuted ? '#d96b6b' : undefined, color: isMicMuted ? '#fff' : undefined }}
        >
          {isMicMuted ? '🔇 Unmute Mic' : '🎙️ Mute Mic'}
        </button>
        <button
          type="button"
          onClick={toggleVideo}
          className="btn-cream-pill"
          style={{ background: isVideoOff ? '#d96b6b' : undefined, color: isVideoOff ? '#fff' : undefined }}
        >
          {isVideoOff ? '📷 Turn On Camera' : '🛑 Stop Camera'}
        </button>
        <button
          type="button"
          onClick={() => navigate(dashboardPath)}
          className="nav-login-btn"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}