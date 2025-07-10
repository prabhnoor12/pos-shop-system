// WebSocket plugin for real-time inventory and sales updates using Socket.io
// Usage: require and call `initWebSocket(server)` in your backend/app.js

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';

let io;

export function initWebSocket(httpServer, options = {}) {
  io = new Server(httpServer, {
    cors: {
      origin: options.corsOrigin || '*',
      methods: ['GET', 'POST']
    },
    path: options.path || '/ws/'
  });

  io.use((socket, next) => {
    // Optional: JWT authentication for sockets
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (options.requireAuth) {
      if (!token) return next(new Error('Authentication required'));
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Invalid token'));
        socket.user = decoded;
        next();
      });
    } else {
      next();
    }
  });

  io.on('connection', socket => {
    logger.info(`WebSocket connected: ${socket.id}${socket.user ? ' user=' + socket.user.id : ''}`);
    socket.on('disconnect', reason => {
      logger.info(`WebSocket disconnected: ${socket.id} (${reason})`);
    });
    // Optionally: handle custom events from clients
  });

  logger.info('WebSocket server initialized');
}

// Emit inventory update to all clients
export function broadcastInventoryUpdate(data) {
  if (io) io.emit('inventoryUpdate', data);
}

// Emit sales update to all clients
export function broadcastSalesUpdate(data) {
  if (io) io.emit('salesUpdate', data);
}

// Emit a custom event to a specific user (by user id)
export function emitToUser(userId, event, payload) {
  if (!io) return;
  for (const [id, socket] of io.of('/').sockets) {
    if (socket.user && socket.user.id === userId) {
      socket.emit(event, payload);
    }
  }
}

// --- HARDWARE: Real-time scale and display events ---
// Broadcast weight updates to all clients
export function broadcastWeightUpdate(weight) {
  if (io) io.emit('weightUpdate', { weight });
}

// Broadcast customer display text to all clients (for monitoring or remote control)
export function broadcastDisplayUpdate(line1, line2) {
  if (io) io.emit('displayUpdate', { line1, line2 });
}
