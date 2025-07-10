
/**
 * @swagger
 * tags:
 *   name: Customer
 *   description: Customer management endpoints
 */

import express from 'express';
import customerController from '../controllers/customerController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

function setCustomerResource(req, res, next) {
  req.resource = 'customer';
  next();
}


/**
 * @swagger
 * /customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customer]
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
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created
 */
router.post(
  '/',
  authenticateToken,
  setCustomerResource,
  rbac('customer:create'),
  auditLog('customer:create', 'Customer'),
  asyncHandler(customerController.createCustomer)
);


/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get(
  '/',
  authenticateToken,
  setCustomerResource,
  rbac('customer:view'),
  auditLog('customer:view', 'Customer'),
  asyncHandler(customerController.getCustomers)
);


/**
 * @swagger
 * /customers/{id}:
 *   put:
 *     summary: Update a customer
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Customer updated
 */
router.put(
  '/:id',
  authenticateToken,
  setCustomerResource,
  rbac('customer:edit'),
  auditLog('customer:edit', 'Customer', 'id'),
  asyncHandler(customerController.updateCustomer)
);


/**
 * @swagger
 * /customers/{id}:
 *   delete:
 *     summary: Delete a customer
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       204:
 *         description: Customer deleted
 */
router.delete(
  '/:id',
  authenticateToken,
  setCustomerResource,
  rbac('customer:delete'),
  auditLog('customer:delete', 'Customer', 'id'),
  asyncHandler(customerController.deleteCustomer)
);

export default router;
