
/**
 * @swagger
 * tags:
 *   name: Store
 *   description: Store management endpoints
 */

import express from 'express';
import storeController from '../controllers/storeController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

function setStoreResource(req, res, next) {
  req.resource = 'store';
  next();
}

// Store CRUD

/**
 * @swagger
 * /stores:
 *   post:
 *     summary: Create a new store
 *     tags: [Store]
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
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Store created
 */
router.post(
  '/',
  authenticateToken,
  setStoreResource,
  rbac('store:create'),
  auditLog('store:create', 'Store'),
  asyncHandler(storeController.createStore)
);


/**
 * @swagger
 * /stores:
 *   get:
 *     summary: Get all stores
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of stores
 */
router.get(
  '/',
  authenticateToken,
  setStoreResource,
  rbac('store:view'),
  auditLog('store:view', 'Store'),
  asyncHandler(storeController.getStores)
);


/**
 * @swagger
 * /stores/{id}:
 *   get:
 *     summary: Get a store by ID
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store details
 */
router.get(
  '/:id',
  authenticateToken,
  setStoreResource,
  rbac('store:view'),
  auditLog('store:view', 'Store', 'id'),
  asyncHandler(storeController.getStoreById)
);


/**
 * @swagger
 * /stores/{id}:
 *   put:
 *     summary: Update a store
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Store updated
 */
router.put(
  '/:id',
  authenticateToken,
  setStoreResource,
  rbac('store:edit'),
  auditLog('store:edit', 'Store', 'id'),
  asyncHandler(storeController.updateStore)
);


/**
 * @swagger
 * /stores/{id}:
 *   delete:
 *     summary: Delete a store
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       204:
 *         description: Store deleted
 */
router.delete(
  '/:id',
  authenticateToken,
  setStoreResource,
  rbac('store:delete'),
  auditLog('store:delete', 'Store', 'id'),
  asyncHandler(storeController.deleteStore)
);

// Store user management

/**
 * @swagger
 * /stores/{id}/users:
 *   post:
 *     summary: Assign a user to a store
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User assigned to store
 */
router.post(
  '/:id/users',
  authenticateToken,
  setStoreResource,
  rbac('store:assignUser'),
  auditLog('store:assignUser', 'Store', 'id'),
  asyncHandler(storeController.assignUserToStore)
);


/**
 * @swagger
 * /stores/{id}/users:
 *   delete:
 *     summary: Remove a user from a store
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User removed from store
 */
router.delete(
  '/:id/users',
  authenticateToken,
  setStoreResource,
  rbac('store:removeUser'),
  auditLog('store:removeUser', 'Store', 'id'),
  asyncHandler(storeController.removeUserFromStore)
);


/**
 * @swagger
 * /stores/{id}/users:
 *   get:
 *     summary: Get all users assigned to a store
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: List of users assigned to the store
 */
router.get(
  '/:id/users',
  authenticateToken,
  setStoreResource,
  rbac('store:viewUsers'),
  auditLog('store:viewUsers', 'Store', 'id'),
  asyncHandler(storeController.getStoreUsers)
);

// Store analytics

/**
 * @swagger
 * /stores/{id}/analytics:
 *   get:
 *     summary: Get analytics for a store
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store analytics
 */
router.get(
  '/:id/analytics',
  authenticateToken,
  setStoreResource,
  rbac('store:analytics'),
  auditLog('store:analytics', 'Store', 'id'),
  asyncHandler(storeController.getStoreAnalytics)
);

export default router;
