
/**
 * @swagger
 * tags:
 *   name: Report
 *   description: Reporting endpoints
 */

import express from 'express';
import reportController from '../controllers/reportController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /reports/sales:
 *   get:
 *     summary: Generate sales report
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales report generated
 */
router.get(
  '/sales',
  authenticateToken,
  rbac('report:view'),
  auditLog('report:view', 'Report'),
  asyncHandler(reportController.generateSalesReport)
);

/**
 * @swagger
 * /reports/inventory:
 *   get:
 *     summary: Generate inventory report
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory report generated
 */
router.get(
  '/inventory',
  authenticateToken,
  rbac('report:view'),
  auditLog('report:view', 'Report'),
  asyncHandler(reportController.generateInventoryReport)
);

export default router;
