const { Server } = require('socket.io');

const TELEMETRY_UPDATE  = 'telemetry:update';
const ALERT_NEW         = 'alert:new';
const EQUIPMENT_STATUS  = 'equipment:status';

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialised');
  return io;
};

module.exports = { initSocket, getIO, TELEMETRY_UPDATE, ALERT_NEW, EQUIPMENT_STATUS };
