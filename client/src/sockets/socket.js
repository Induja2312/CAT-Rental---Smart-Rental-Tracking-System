import { io } from 'socket.io-client';

export const TELEMETRY_UPDATE = 'telemetry:update';
export const ALERT_NEW        = 'alert:new';
export const EQUIPMENT_STATUS = 'equipment:status';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
  autoConnect: true,
});

socket.on('connect',    () => console.log('connected', socket.id));
socket.on('disconnect', () => console.log('disconnected'));

export default socket;
