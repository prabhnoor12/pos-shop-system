import express from 'express';
import inventoryController from '../controllers/inventoryController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

// Multi-Store & Multi-Register
router.get('/registers', inventoryController.listRegisters); // List all registers for a store/tenant
router.post('/registers', inventoryController.createRegister); // Create a new register

// Offline Mode Sync
router.post('/sync/sales', inventoryController.syncSales); // Sync sales from offline clients
router.post('/sync/inventory', inventoryController.syncInventory); // Sync inventory changes from offline clients

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Inventory management endpoints
 */

function setInventoryResource(req, res, next) {
  req.resource = 'inventory';
  next();
}

// Inventory CRUD

/**
 * @swagger
 * /inventory:
 *   post:
 *     summary: Add inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inventory item added
 */
router.post(
  '/',
  authenticateToken,
  setInventoryResource,
  rbac('inventory:add'),
  auditLog('inventory:add', 'Inventory'),
  asyncHandler(inventoryController.addInventory)
);


/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: Get all inventory items
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of inventory items
 */
router.get(
  '/',
  authenticateToken,
  setInventoryResource,
  rbac('inventory:view'),
  auditLog('inventory:view', 'Inventory'),
  asyncHandler(inventoryController.getInventory)
);


/**
 * @swagger
 * /inventory/{id}:
 *   put:
 *     summary: Update inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inventory item updated
 */
router.put(
  '/:id',
  authenticateToken,
  setInventoryResource,
  rbac('inventory:edit'),
  auditLog('inventory:edit', 'Inventory', 'id'),
  asyncHandler(inventoryController.updateInventory)
);


/**
 * @swagger
 * /inventory/batch:
 *   post:
 *     summary: Batch update inventory
 *     tags: [Inventory]
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
 *     responses:
 *       200:
 *         description: Batch update successful
 */
router.post(
  '/batch',
  authenticateToken,
  setInventoryResource,
  rbac('inventory:batch'),
  auditLog('inventory:batch', 'Inventory'),
  asyncHandler(inventoryController.batchUpdateInventory)
);

// Warehouses

/**
 * @swagger
 * /inventory/warehouses:
 *   get:
 *     summary: List all warehouses
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of warehouses
 */
router.get(
  '/warehouses',
  authenticateToken,
  setInventoryResource,
  rbac('warehouse:view'),
  auditLog('warehouse:view', 'Warehouse'),
  asyncHandler(inventoryController.listWarehouses)
);

// Stock transfer

/**
 * @swagger
 * /inventory/stock/transfer:
 *   post:
 *     summary: Transfer stock between locations
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromLocation:
 *                 type: string
 *               toLocation:
 *                 type: string
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Stock transferred
 */
router.post(
  '/stock/transfer',
  authenticateToken,
  setInventoryResource,
  rbac('inventory:transfer'),
  auditLog('inventory:transfer', 'Inventory'),
  asyncHandler(inventoryController.transferStock)
);

// Batches and serial numbers

/**
 * @swagger
 * /inventory/batch-serial:
 *   post:
 *     summary: Add batch or serial numbers to inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               batchNumber:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batch/serial added
 */
router.post(
  '/batch-serial',
  authenticateToken,
  setInventoryResource,
  rbac('inventory:batchSerial'),
  auditLog('inventory:batchSerial', 'Inventory'),
  asyncHandler(inventoryController.addBatchOrSerial)
);

// Stock movement history

/**
 * @swagger
 * /inventory/stock/history:
 *   get:
 *     summary: Get stock movement history
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock movement history
 */
router.get('/stock/history', asyncHandler(inventoryController.getStockMovementHistory));

// Low-stock and expiry alerts

/**
 * @swagger
 * /inventory/stock/low:
 *   get:
 *     summary: Get low stock alerts
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock alerts
 */
router.get('/stock/low', asyncHandler(inventoryController.getLowStockAlerts));

/**
 * @swagger
 * /inventory/stock/expiring:
 *   get:
 *     summary: Get expiring product alerts
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expiring product alerts
 */
router.get('/stock/expiring', asyncHandler(inventoryController.getExpiringProducts));

export default router;
