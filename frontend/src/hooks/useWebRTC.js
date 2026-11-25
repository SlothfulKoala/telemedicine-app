// frontend/src/hooks/useWebRTC.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const getBackendURL = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const queryBackend = urlParams.get('backend');
  if (queryBackend) return queryBackend.replace(/\/+$/, '');

  const savedBackend = localStorage.getItem('TELEMED_BACKEND_URL');
  if (savedBackend) return savedBackend.replace(/\/+$/, '');

  const envBackend = import.meta.env.VITE_BACKEND_URL;
  if (envBackend) return envBackend.replace(/\/+$/, '');

  return window.location.origin;
};

const ICE_SERVERS = {
  iceCandidatePoolSize: 4,
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
};

export const useWebRTC = ({ roomId, roomToken }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // 'idle' | 'connecting' | 'waiting' | 'connected' | 'error'
  const [socketError, setSocketError] = useState('');

  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  useEffect(() => {
    if (!roomId || !roomToken) return;

    let cancelled = false;
    setConnectionStatus('connecting');
    setSocketError('');

    const backendUrl = getBackendURL();
    const socket = io(backendUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      auth: { roomToken },
    });
    socketRef.current = socket;

    const flushPendingCandidates = async (pc) => {
      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error flushing ICE candidate:', err);
        }
      }
    };

    const createPeerConnection = (stream) => {
      if (pcRef.current) {
        pcRef.current.close();
      }
      pendingCandidatesRef.current = [];

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        setConnectionStatus('connected');
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('send-ice-candidate', { candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setRemoteStream(null);
          setConnectionStatus('waiting');
        }
      };

      return pc;
    };

    const initCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        createPeerConnection(stream);

        socket.on('connect_error', (err) => {
          setSocketError(err.message || 'Unable to authenticate video socket.');
          setConnectionStatus('error');
        });

        socket.on('room-error', ({ message }) => {
          setSocketError(message || 'Room access error.');
          setConnectionStatus('error');
        });

        socket.on('user-joined', async () => {
          const pc = createPeerConnection(stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('send-offer', { sdp: offer });
        });

        socket.on('receive-offer', async ({ sdp }) => {
          const pc = pcRef.current || createPeerConnection(stream);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushPendingCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('send-answer', { sdp: answer });
        });

        socket.on('receive-answer', async ({ sdp }) => {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushPendingCandidates(pcRef.current);
          }
        });

        socket.on('receive-ice-candidate', async ({ candidate }) => {
          try {
            const pc = pcRef.current;
            if (!pc || !pc.remoteDescription) {
              pendingCandidatesRef.current.push(candidate);
              return;
            }
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        });

        socket.on('peer-left', () => {
          setRemoteStream(null);
          setConnectionStatus('waiting');
          pendingCandidatesRef.current = [];
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
        });

        setConnectionStatus('waiting');
        socket.emit('join-room');
      } catch (err) {
        if (!cancelled) {
          setSocketError(
            err.name === 'NotAllowedError'
              ? 'Camera and microphone permissions are required to join the call.'
              : 'Could not access camera or microphone.'
          );
          setConnectionStatus('error');
        }
      }
    };

    initCall();

    return () => {
      cancelled = true;
      socket.disconnect();
      pendingCandidatesRef.current = [];
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      setRemoteStream(null);
    };
  }, [roomId, roomToken]);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return {
    localStream,
    remoteStream,
    toggleMic,
    toggleVideo,
    isMicMuted,
    isVideoOff,
    connectionStatus,
    socketError,
  };
};