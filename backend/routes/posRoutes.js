
/**
 * @swagger
 * tags:
 *   name: POS
 *   description: Point of Sale endpoints
 */

import express from 'express';
import posController from '../controllers/posController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /pos/process:
 *   post:
 *     summary: Process a POS sale
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               payment:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                   amount:
 *                     type: number
 *     responses:
 *       200:
 *         description: Sale processed
 */
router.post(
  '/process',
  authenticateToken,
  rbac('pos:process'),
  auditLog('pos:process', 'POS'),
  asyncHandler(posController.processSale)
);

export default router;
