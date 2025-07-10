
/**
 * @swagger
 * tags:
 *   name: Weight
 *   description: Weighing scale hardware endpoints
 */


import express from 'express';
import weightController from '../controllers/weightController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

// POST /api/weight/listen

/**
 * @swagger
 * /weight/listen:
 *   post:
 *     summary: Start weight listener
 *     tags: [Weight]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weight listener started
 */
router.post(
  '/listen',
  authenticateToken,
  rbac('weight:listen'),
  auditLog('weight:listen', 'Weight'),
  asyncHandler(weightController.startWeightListener)
);

// GET /api/weight/last

/**
 * @swagger
 * /weight/last:
 *   get:
 *     summary: Get last weight measurement
 *     tags: [Weight]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Last weight measurement
 */
router.get(
  '/last',
  authenticateToken,
  rbac('weight:last'),
  auditLog('weight:last', 'Weight'),
  asyncHandler(weightController.getLastWeight)
);

export default router;
