// auditLogRoutes.js
// API endpoints for querying audit logs (admin only)

import express from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac } from '../middleware/permission.middleware.js';

const router = express.Router();
const AUDIT_LOG_PATH = path.resolve('logs/audit.log');

// GET /api/audit-logs?limit=100&offset=0
router.get('/', authenticateToken, rbac({ roles: ['admin'] }), (req, res) => {
  const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit) || 100));
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  if (!fs.existsSync(AUDIT_LOG_PATH)) return res.json({ data: [], total: 0 });
  const lines = fs.readFileSync(AUDIT_LOG_PATH, 'utf-8').trim().split('\n');
  const total = lines.length;
  const page = lines.slice(total - offset - limit, total - offset).reverse();
  const data = page.map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  res.json({ data, total });
});

export default router;
