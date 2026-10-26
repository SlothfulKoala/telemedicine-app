// frontend/src/hooks/useWebRTC.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Public Google STUN servers (free, reliable for college evaluations)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = (roomId) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // 1. Connect to Socket.io backend
    socketRef.current = io('http://localhost:5000');
    const socket = socketRef.current;

    const initCall = async () => {
      // 2. Capture local camera & microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);

      // 3. Create WebRTC Peer Connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local audio/video tracks to peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle receiving the remote video track
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      // Send local ICE candidates to peer via socket
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('send-ice-candidate', { roomId, candidate: event.candidate });
        }
      };

      // 4. Socket event listeners for signaling
      // Caller: When a second person joins, create & send Offer
      socket.on('user-joined', async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('send-offer', { roomId, sdp: offer });
      });

      // Callee: Receive Offer, set remote description, send Answer
      socket.on('receive-offer', async ({ sdp }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('send-answer', { roomId, sdp: answer });
      });

      // Caller: Receive Answer and set remote description
      socket.on('receive-answer', async ({ sdp }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      });

      // Both: Add ICE candidates sent from the peer
      socket.on('receive-ice-candidate', async ({ candidate }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      });

      // Join the specified consultation room
      socket.emit('join-room', roomId);
    };

    initCall();

    // Cleanup on unmount or call exit
    return () => {
      socket.disconnect();
      if (pcRef.current) pcRef.current.close();
      if (localStream) localStream.getTracks().forEach((track) => track.stop());
    };
  }, [roomId]);

  // Toggle Mute Audio
  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return { localStream, remoteStream, toggleMic, toggleVideo, isMicMuted, isVideoOff };
};
