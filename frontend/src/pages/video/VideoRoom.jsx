// frontend/src/pages/video/VideoRoom.jsx
import React, { useEffect, useRef } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';

export default function VideoRoom() {
  const roomId = 'evaluation-room-101'; // Static room for testing
  const { localStream, remoteStream, toggleMic, toggleVideo, isMicMuted, isVideoOff } = useWebRTC(roomId);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
      <p style={{ color: '#666' }}>Room ID: <strong>{roomId}</strong></p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Local Stream */}
        <div style={{ border: '2px solid #007bff', borderRadius: '8px', padding: '10px' }}>
          <h4>You (Local)</h4>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // Mute own audio to prevent feedback loop
            style={{ width: '360px', height: '240px', background: '#000', borderRadius: '4px' }}
          />
        </div>

        {/* Remote Stream */}
        <div style={{ border: '2px solid #28a745', borderRadius: '8px', padding: '10px' }}>
          <h4>Consultant (Remote)</h4>
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '360px', height: '240px', background: '#000', borderRadius: '4px' }}
            />
          ) : (
            <div style={{ width: '360px', height: '240px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
              Waiting for other participant to join...
            </div>
          )}
        </div>
      </div>

      {/* Media Controls */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={toggleMic}
          style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer', backgroundColor: isMicMuted ? '#dc3545' : '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          {isMicMuted ? '🔇 Unmute Mic' : '🎙️ Mute Mic'}
        </button>
        <button
          onClick={toggleVideo}
          style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: isVideoOff ? '#dc3545' : '#28a745', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          {isVideoOff ? '📷 Turn On Camera' : '🛑 Stop Camera'}
        </button>
      </div>
    </div>
  );
}
