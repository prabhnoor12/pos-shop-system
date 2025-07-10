
/**
 * @swagger
 * tags:
 *   name: Display
 *   description: Customer display hardware endpoints
 */


import express from 'express';
import displayController from '../controllers/displayController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

// POST /api/display/show

/**
 * @swagger
 * /display/show:
 *   post:
 *     summary: Show text on the customer display
 *     tags: [Display]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to display
 *     responses:
 *       200:
 *         description: Text displayed
 */
router.post(
  '/show',
  authenticateToken,
  rbac('display:show'),
  auditLog('display:show', 'Display'),
  asyncHandler(displayController.showText)
);

// POST /api/display/clear

/**
 * @swagger
 * /display/clear:
 *   post:
 *     summary: Clear the customer display
 *     tags: [Display]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Display cleared
 */
router.post(
  '/clear',
  authenticateToken,
  rbac('display:clear'),
  auditLog('display:clear', 'Display'),
  asyncHandler(displayController.clear)
);

export default router;
