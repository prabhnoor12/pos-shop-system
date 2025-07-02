// --- PRODUCTION READINESS PATCH ---
import './config/loadEnv.js';

// 1. CORS Middleware

import express from 'express';
import corsMiddleware from './config/cors.js';

const app = express();
// Allow large payloads and urlencoded data for production APIs
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(corsMiddleware);

// 2. Sentry Integration (error monitoring)
import sentryRequestHandler from './middleware/sentry.middleware.js';
app.use(sentryRequestHandler);

// 3. Environment Variable Checks
import './config/envCheck.js';

// 4. HTTPS Warning (for awareness)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.protocol !== 'https') {
      console.warn('WARNING: In production, HTTPS should be enforced!');
    }
    next();
  });
}

// 5. API Versioning & Documentation (comment for next steps)
// TODO: Add OpenAPI/Swagger docs and use /api/v1/ for versioning

// Security middlewares
import { helmetMiddleware, authLimiter, csrfConditional } from './middleware/security.middleware.js';
app.use(helmetMiddleware);
app.use('/auth', authLimiter);
// Exclude CSRF for /api/verify and /api/auth
app.use(['/api', '/admin'], (req, res, next) => {
  if (req.path.startsWith('/verify') || req.path.startsWith('/auth')) {
    return next();
  }
  return csrfConditional(req, res, next);
});

// Load plugins (for extensibility: payment, analytics, etc.)
import { loadPlugins } from './plugins/index.js';
loadPlugins(app);
// Health check endpoint
import healthRoutes from './routes/healthRoutes.js';
app.use('/', healthRoutes);
// Winston logger
import logger from './config/logger.js';
// Attach logger to app.locals for global access (e.g., in middleware)
app.locals.logger = logger;
// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    user: req.user ? req.user.id || req.user.username : undefined
  });
  next();
});
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import posRoutes from './routes/posRoutes.js';
import productRoutes from './routes/productRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import barcodeRoutes from './routes/barcodeRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import userRoutes from './routes/userRoutes.js';
import consentRoutes from './routes/consentRoutes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { authenticateToken } from './middleware/auth.middleware.js';
import { validateBody, validateQuery, validateParams } from './middleware/validation.middleware.js';
import verifyEmailRoutes from './routes/verifyEmailRoutes.js';

// Example: Secure all /api routes with JWT (uncomment to enable globally)
// app.use('/api', authenticateToken);

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/verify', verifyEmailRoutes);
// GDPR User Data Access/Erasure/Export Endpoints
app.use('/api/user', userRoutes);
// GDPR Consent Management Endpoints
app.use('/api/consent', consentRoutes);
// Centralized error handler (should be last)
app.use(errorHandler);

app.get('/', (req, res) => res.json({ message: 'POS Shop System API' }));

import { initWebSocket } from './plugins/websocket.js';

// HTTPS support for production
import fs from 'fs';
import https from 'https';
const PORT = process.env.PORT || 3000;
let server;
if (process.env.NODE_ENV === 'production' && process.env.SSL_KEY && process.env.SSL_CERT) {
  const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY),
    cert: fs.readFileSync(process.env.SSL_CERT)
  };
  server = https.createServer(sslOptions, app);
  console.log('HTTPS enabled');
} else {
  const http = await import('http');
  server = http.createServer(app);
}

// Initialize WebSocket (Socket.io) server
initWebSocket(server, {
  requireAuth: false, // Set to true to require JWT auth for sockets
  corsOrigin: process.env.WS_CORS_ORIGIN || '*',
  path: '/ws/'
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
