/**
 * @swagger
 * tags:
 *   name: Product
 *   description: Product management endpoints
 */

import express from 'express';
import * as productController from '../controllers/productController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();


// Fine-grained RBAC: per-action and per-resource permissions
// Set req.resource for resource-level checks in controller
function setProductResource(req, res, next) {
  req.resource = 'product';
  next();
}

// Example permissions: create_product, update_product, delete_product, view_product

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Product]
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
 *               price:
 *                 type: number
 *               categoryId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created
 */
router.post(
  '/',
  authenticateToken,
  setProductResource,
  rbac('product:create'),
  auditLog('product:create', 'Product'),
  asyncHandler(productController.createProduct)
);


/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               categoryId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product updated
 */
router.put(
  '/:id',
  authenticateToken,
  setProductResource,
  rbac('product:edit'),
  auditLog('product:edit', 'Product', 'id'),
  asyncHandler(productController.updateProduct)
);


/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       204:
 *         description: Product deleted
 */
router.delete(
  '/:id',
  authenticateToken,
  setProductResource,
  rbac('product:delete'),
  auditLog('product:delete', 'Product', 'id'),
  asyncHandler(productController.deleteProduct)
);


/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 */
router.get(
  '/',
  authenticateToken,
  setProductResource,
  rbac('product:view'),
  auditLog('product:view', 'Product'),
  asyncHandler(productController.getProducts)
);


/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 */
router.get(
  '/:id',
  authenticateToken,
  setProductResource,
  rbac('product:view'),
  auditLog('product:view', 'Product', 'id'),
  asyncHandler(productController.getProductById)
);


/**
 * @swagger
 * /products/{id}/attachment:
 *   post:
 *     summary: Upload an attachment for a product (image, document, etc.)
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Attachment uploaded
 */
router.post(
  '/:id/attachment',
  authenticateToken,
  setProductResource,
  rbac('product:edit'),
  auditLog('product:edit', 'Product', 'id'),
  asyncHandler(productController.uploadProductAttachment)
);

export default router;
