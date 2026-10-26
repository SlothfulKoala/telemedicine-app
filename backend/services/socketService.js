// backend/services/socketService.js
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // User joins a consultation room
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      // Notify the other user in the room that a peer arrived
      socket.to(roomId).emit('user-joined', { socketId: socket.id });
    });

    // Relay Offer from caller to receiver
    socket.on('send-offer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('receive-offer', { sdp });
    });

    // Relay Answer from receiver to caller
    socket.on('send-answer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('receive-answer', { sdp });
    });

    // Relay ICE Candidate (network path)
    socket.on('send-ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('receive-ice-candidate', { candidate });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};
