
/**
 * @swagger
 * tags:
 *   name: Supplier
 *   description: Supplier management endpoints
 */

import express from 'express';
import supplierController from '../controllers/supplierController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

function setSupplierResource(req, res, next) {
  req.resource = 'supplier';
  next();
}


/**
 * @swagger
 * /suppliers:
 *   post:
 *     summary: Create a new supplier
 *     tags: [Supplier]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *     responses:
 *       201:
 *         description: Supplier created
 */
router.post(
  '/',
  authenticateToken,
  setSupplierResource,
  rbac('supplier:create'),
  auditLog('supplier:create', 'Supplier'),
  asyncHandler(supplierController.createSupplier)
);


/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: Get all suppliers
 *     tags: [Supplier]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of suppliers
 */
router.get(
  '/',
  authenticateToken,
  setSupplierResource,
  rbac('supplier:view'),
  auditLog('supplier:view', 'Supplier'),
  asyncHandler(supplierController.getSuppliers)
);


/**
 * @swagger
 * /suppliers/{id}:
 *   put:
 *     summary: Update a supplier
 *     tags: [Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Supplier ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *     responses:
 *       200:
 *         description: Supplier updated
 */
router.put(
  '/:id',
  authenticateToken,
  setSupplierResource,
  rbac('supplier:edit'),
  auditLog('supplier:edit', 'Supplier', 'id'),
  asyncHandler(supplierController.updateSupplier)
);


/**
 * @swagger
 * /suppliers/{id}:
 *   delete:
 *     summary: Delete a supplier
 *     tags: [Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Supplier ID
 *     responses:
 *       204:
 *         description: Supplier deleted
 */
router.delete(
  '/:id',
  authenticateToken,
  setSupplierResource,
  rbac('supplier:delete'),
  auditLog('supplier:delete', 'Supplier', 'id'),
  asyncHandler(supplierController.deleteSupplier)
);

export default router;
