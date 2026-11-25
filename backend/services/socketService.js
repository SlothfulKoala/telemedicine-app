// backend/services/socketService.js
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/auth');
const { Appointment, ConsultSession } = require('../models');

module.exports = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.roomToken;
      if (!token) return next(new Error('Room authorization token required.'));

      const payload = jwt.verify(token, getJwtSecret());
      if (payload.purpose !== 'webrtc_room' || !payload.roomId) {
        return next(new Error('Invalid room token.'));
      }

      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      socket.data.appointmentId = payload.appointmentId;
      socket.data.roomId = payload.roomId;
      return next();
    } catch {
      return next(new Error('Unauthorized or expired room token.'));
    }
  });

  io.on('connection', (socket) => {
    const { roomId, userId, role, appointmentId } = socket.data;

    socket.on('join-room', async () => {
      const existingSockets = await io.in(roomId).fetchSockets();
      // Disconnect duplicate tab from same user or reject 3rd party
      for (const s of existingSockets) {
        if (s.data.userId === userId && s.id !== socket.id) {
          s.emit('room-error', { message: 'Opened in another tab.' });
          s.disconnect(true);
        }
      }

      const activeAfterCleanup = await io.in(roomId).fetchSockets();
      if (activeAfterCleanup.length >= 2) {
        socket.emit('room-error', { message: 'Consultation room is already full.' });
        return socket.disconnect(true);
      }

      await socket.join(roomId);

      // Update appointment status & ConsultSession participant log
      await Appointment.updateOne(
        { _id: appointmentId, status: 'confirmed' },
        { $set: { status: 'in_progress' } }
      );

      await ConsultSession.updateOne(
        { appointmentId },
        {
          $setOnInsert: { startedAt: new Date() },
          $push: {
            participants: {
              userId,
              role,
              joinedAt: new Date(),
              ip: socket.handshake.address,
              deviceInfo: socket.handshake.headers['user-agent'],
            },
          },
        }
      );

      socket.to(roomId).emit('user-joined', { userId, role });
    });

    // Always route to verified socket.data.roomId — never trust client roomId
    socket.on('send-offer', ({ sdp }) => {
      socket.to(roomId).emit('receive-offer', { sdp });
    });

    socket.on('send-answer', ({ sdp }) => {
      socket.to(roomId).emit('receive-answer', { sdp });
    });

    socket.on('send-ice-candidate', ({ candidate }) => {
      socket.to(roomId).emit('receive-ice-candidate', { candidate });
    });

    socket.on('disconnect', async () => {
      socket.to(roomId).emit('peer-left', { userId, role });
      await ConsultSession.updateOne(
        { appointmentId, 'participants.userId': userId, 'participants.leftAt': { $exists: false } },
        { $set: { 'participants.$.leftAt': new Date() } }
      );
    });
  });
};