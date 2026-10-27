// frontend/src/pages/video/VideoRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';

export default function VideoRoom() {
  const roomId = 'evaluation-room-101'; // Static room for testing
  const { localStream, remoteStream, toggleMic, toggleVideo, isMicMuted, isVideoOff } = useWebRTC(roomId);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // ⚙️ STATE: Keep track of what the user is typing in the connection box
  const [backendInput, setBackendInput] = useState(localStorage.getItem('TELEMED_BACKEND_URL') || '');

  // ⚙️ ACTION: Save the custom backend tunnel URL to this specific browser's storage
  const saveBackend = () => {
    if (backendInput.trim() !== '') {
      // Ensure the URL has a protocol, if not add https://
      let formattedUrl = backendInput.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      localStorage.setItem('TELEMED_BACKEND_URL', formattedUrl);
      window.location.reload(); // Refresh the page to connect the socket to the new URL
    } else {
      localStorage.removeItem('TELEMED_BACKEND_URL');
      window.location.reload();
    }
  };

  // ⚙️ ACTION: Reset settings back to localhost fallback
  const clearBackend = () => {
    localStorage.removeItem('TELEMED_BACKEND_URL');
    setBackendInput('');
    window.location.reload();
  };

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

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>🩺 Telemedicine Video Consultation</h2>

      {/* ⚙️ Easy Test Panel for Teammates */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'inline-block', border: '1px solid #ddd' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>⚙️ Teammate Testing Panel</h4>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Paste your backend tunnel URL (e.g. xxx.trycloudflare.com)"
            value={backendInput}
            onChange={(e) => setBackendInput(e.target.value)}
            style={{ padding: '8px', width: '320px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button 
            onClick={saveBackend} 
            style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
          >
            Connect
          </button>
          {localStorage.getItem('TELEMED_BACKEND_URL') && (
            <button 
              onClick={clearBackend} 
              style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px' }}
            >
              Reset to Local
            </button>
          )}
        </div>
        {localStorage.getItem('TELEMED_BACKEND_URL') ? (
          <p style={{ fontSize: '12px', color: 'green', margin: '10px 0 0 0', fontWeight: '500' }}>
            🟢 Active Connection: <code>{localStorage.getItem('TELEMED_BACKEND_URL')}</code>
          </p>
        ) : (
          <p style={{ fontSize: '12px', color: '#666', margin: '10px 0 0 0' }}>
            ℹ️ Running in default mode (reads `.env` or defaults to <code>http://localhost:5000</code>)
          </p>
        )}
      </div>

      <p style={{ color: '#666' }}>Room ID: <strong>{roomId}</strong></p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Local Stream */}
        <div style={{ border: '2px solid #007bff', borderRadius: '8px', padding: '10px', background: '#fff' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>You (Local)</h4>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // Mutes local speaker to prevent feedback howling
            style={{ width: '360px', height: '240px', background: '#000', borderRadius: '4px' }}
          />
        </div>

        {/* Remote Stream */}
        <div style={{ border: '2px solid #28a745', borderRadius: '8px', padding: '10px', background: '#fff' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Consultant (Remote)</h4>
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '360px', height: '240px', background: '#000', borderRadius: '4px' }}
            />
          ) : (
            <div style={{ width: '360px', height: '240px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', color: '#555' }}>
              Waiting for other participant to join...
            </div>
          )}
        </div>
      </div>

      {/* Media Controls */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={toggleMic}
          style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer', backgroundColor: isMicMuted ? '#dc3545' : '#007bff', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '500' }}
        >
          {isMicMuted ? '🔇 Unmute Mic' : '🎙️ Mute Mic'}
        </button>
        <button
          onClick={toggleVideo}
          style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: isVideoOff ? '#dc3545' : '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '500' }}
        >
          {isVideoOff ? '📷 Turn On Camera' : '🛑 Stop Camera'}
        </button>
      </div>
    </div>
  );
}
