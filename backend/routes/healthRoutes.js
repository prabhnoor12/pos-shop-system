
/**
 * @swagger
 * tags:
 *   name: Health
 *   description: System health check endpoint
 */

import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

// GET /api/health

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 timestamp:
 *                   type: number
 *                 message:
 *                   type: string
 */
router.get(
  '/health',
  authenticateToken,
  rbac('system:health'),
  auditLog('system:health', 'System'),
  asyncHandler(async (req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      message: 'POS Shop System is healthy',
    });
  })
);

export default router;
