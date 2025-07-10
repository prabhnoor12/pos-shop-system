
/**
 * @swagger
 * tags:
 *   name: Category
 *   description: Product category management
 */

import express from 'express';
import categoryController from '../controllers/categoryController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const categoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many category requests, please try again later.' }
});

const categorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().allow('').optional()
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    next();
  };
}

function setCategoryResource(req, res, next) {
  req.resource = 'category';
  next();
}


/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new product category
 *     tags: [Category]
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
 *                 description: Category name
 *               description:
 *                 type: string
 *                 description: Category description
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 */
router.post(
  '/',
  categoryLimiter,
  authenticateToken,
  setCategoryResource,
  rbac('category:create'),
  auditLog('category:create', 'Category'),
  validate(categorySchema),
  asyncHandler(categoryController.createCategory)
);


/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all product categories
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 */
router.get(
  '/',
  authenticateToken,
  setCategoryResource,
  rbac('category:view'),
  auditLog('category:view', 'Category'),
  asyncHandler(categoryController.getCategories)
);


/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update a product category
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put(
  '/:id',
  authenticateToken,
  setCategoryResource,
  rbac('category:edit'),
  auditLog('category:edit', 'Category', 'id'),
  asyncHandler(categoryController.updateCategory)
);


/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete a product category
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       204:
 *         description: Category deleted
 */
router.delete(
  '/:id',
  authenticateToken,
  setCategoryResource,
  rbac('category:delete'),
  auditLog('category:delete', 'Category', 'id'),
  asyncHandler(categoryController.deleteCategory)
);

export default router;
