
/**
 * @swagger
 * tags:
 *   name: Sale
 *   description: Sales endpoints
 */

import express from 'express';
import salesController from '../controllers/salesController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateSale } from '../middleware/sales.validation.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

function setSalesResource(req, res, next) {
  req.resource = 'sales';
  next();
}


/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Get all sales
 *     tags: [Sale]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sales
 */
router.get(
  '/',
  authenticateToken,
  setSalesResource,
  rbac('sale:view'),
  auditLog('sale:view', 'Sale'),
  asyncHandler(salesController.getSales)
);


/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     summary: Get a sale by ID
 *     tags: [Sale]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sale ID
 *     responses:
 *       200:
 *         description: Sale details
 */
router.get(
  '/:id',
  authenticateToken,
  setSalesResource,
  rbac('sale:view'),
  auditLog('sale:view', 'Sale', 'id'),
  asyncHandler(salesController.getSaleById)
);


/**
 * @swagger
 * /sales:
 *   post:
 *     summary: Process a sale
 *     tags: [Sale]
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
  '/',
  authenticateToken,
  setSalesResource,
  rbac('sale:create'),
  auditLog('sale:create', 'Sale'),
  validateSale,
  asyncHandler(salesController.processSale)
);


/**
 * @swagger
 * /sales/sync:
 *   post:
 *     summary: Sync sales from offline clients
 *     tags: [Sale]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 productId:
 *                   type: string
 *                 quantity:
 *                   type: number
 *                 payment:
 *                   type: object
 *                   properties:
 *                     method:
 *                       type: string
 *                     amount:
 *                       type: number
 *     responses:
 *       200:
 *         description: Sales synced
 */
router.post(
  '/sync',
  authenticateToken,
  setSalesResource,
  rbac('sale:sync'),
  auditLog('sale:sync', 'Sale'),
  asyncHandler(salesController.syncSales)
);

export default router;
