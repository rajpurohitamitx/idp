import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export type SocketEvent =
  | 'new_alert' | 'hazard_detected' | 'hazard_updated' | 'sensor_update' | 'camera_status' | 'device_status'
  | 'ppe_violation' | 'incident_created' | 'incident_resolved' | 'image_received' | 'image_analysis_complete'
  | 'access_event' | 'alert_updated';

let io: Server | null = null;

export function initSockets(server: HttpServer) {
  io = new Server(server, { cors: { origin: env.FRONTEND_URL, credentials: true } });
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('unauthorized'));
      socket.data.user = jwt.verify(token, env.JWT_SECRET);
      next();
    } catch { next(new Error('unauthorized')); }
  });
  io.on('connection', (s) => logger.debug({ id: s.id }, 'socket connected'));
  return io;
}

export function emit(event: SocketEvent, payload: unknown) {
  io?.emit(event, payload);
}
