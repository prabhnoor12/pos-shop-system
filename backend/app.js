// Global handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
// --- Swagger/OpenAPI Documentation ---

// --- PRODUCTION READINESS PATCH ---
import './config/loadEnv.js';

// 1. CORS Middleware

import express from 'express';
import corsMiddleware from './config/cors.js';
// --- Add session middleware for lusca and CSRF ---
import sessionMiddleware from './middleware/session.middleware.js';

const app = express();
// Debug: Check corsMiddleware type
console.log('CORS middleware type:', typeof corsMiddleware);
// Allow large payloads and urlencoded data for production APIs
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(corsMiddleware);
// --- Insert session middleware before any security/auth middlewares ---
app.use(sessionMiddleware);

// 2. Sentry Integration (error monitoring)

// --- Sentry Monitoring ---
import { sentryRequestHandler, sentryErrorHandler } from './middleware/sentry.middleware.js';
// Debug: Check sentryRequestHandler type
console.log('Sentry request handler type:', typeof sentryRequestHandler);
// Attach Sentry request handler as early as possible
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


// 5. API Versioning & Documentation
// Swagger UI available at /api/docs
import { setupSwagger } from './swagger.js';
setupSwagger(app);


// 5. API Versioning & Documentation
// Swagger UI available at /api/docs
// OpenAPI JSON available at /api/docs.json
// TODO: Use /api/v1/ for versioning in the future

// Security middlewares
import { helmetMiddleware, authLimiter, sensitiveApiLimiter, csrfConditional } from './middleware/security.middleware.js';
app.use(helmetMiddleware);
app.use('/auth', authLimiter);
// Apply general rate limiting to all API endpoints for overall security
app.use(['/api', '/api/*'], sensitiveApiLimiter);
// Only apply CSRF to non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  return csrfConditional(req, res, next);
});

// Load plugins using the new PluginManager
import PluginManager from './plugins/pluginManager.js';
const pluginManager = new PluginManager(app);
pluginManager.loadPlugins();
// Optionally, expose pluginManager for use elsewhere
app.locals.pluginManager = pluginManager;
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
import displayRoutes from './routes/displayRoutes.js';
import weightRoutes from './routes/weightRoutes.js';
import productRoutes from './routes/productRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import barcodeRoutes from './routes/barcodeRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import userRoutes from './routes/userRoutes.js';
import consentRoutes from './routes/consentRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { authenticateToken } from './middleware/auth.middleware.js';
import { tenantMiddleware } from './middleware/tenant.middleware.js';
import { validateBody, validateQuery, validateParams } from './middleware/validation.middleware.js';
import verifyEmailRoutes from './routes/verifyEmailRoutes.js';
import vaultRoutes from './routes/vaultRoutes.js';

// --- Multi-Tenancy: Enforce tenant context on all protected API routes ---
// All /api routes except /auth and /health require tenant context
app.use(['/api', '/api/*'], (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path.startsWith('/health')) return next();
  return tenantMiddleware()(req, res, next);
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/display', displayRoutes);
app.use('/api/weight', weightRoutes);
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
// PayPal & payment endpoints
app.use('/api/payment', paymentRoutes);
// Register audit log API (admin only)
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/vault', vaultRoutes);
// Centralized error handler (should be last)

// Attach Sentry error handler before your own error handler
app.use(sentryErrorHandler);
app.use(errorHandler);
// --- Sentry Initialization Guidance ---
// Ensure you have set SENTRY_DSN in your environment variables (e.g., in .env file):
// SENTRY_DSN=https://<your-key>@o<org-id>.ingest.sentry.io/<project-id>
//
// Use the Sentry dashboard (https://sentry.io/) to monitor errors, set up alerting, and analyze issues in real time.
//
// You can further customize Sentry in sentry.middleware.js (e.g., add performance monitoring, custom tags, or user context).

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
