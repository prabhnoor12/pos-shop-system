
/**
 * @swagger
 * tags:
 *   name: User
 *   description: GDPR user data access, erasure, and export endpoints
 */

import express from 'express';
import { getUserData, eraseUserData, exportUserData } from '../controllers/userController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

function setUserResource(req, res, next) {
  req.resource = 'user';
  next();
}

// GET /user/data - Access/Export user data

/**
 * @swagger
 * /user/data:
 *   get:
 *     summary: Access or export user data
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data
 */
router.get(
  '/data',
  authenticateToken,
  setUserResource,
  rbac('user:view'),
  auditLog('user:view', 'User'),
  asyncHandler(getUserData)
);

// DELETE /user/data - Erase user data

/**
 * @swagger
 * /user/data:
 *   delete:
 *     summary: Erase user data
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: User data erased
 */
router.delete(
  '/data',
  authenticateToken,
  setUserResource,
  rbac('user:delete'),
  auditLog('user:delete', 'User'),
  asyncHandler(eraseUserData)
);

// GET /user/data/export - Export user data as JSON

/**
 * @swagger
 * /user/data/export:
 *   get:
 *     summary: Export user data as JSON
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data exported
 */
router.get(
  '/data/export',
  authenticateToken,
  setUserResource,
  rbac('user:export'),
  auditLog('user:export', 'User'),
  asyncHandler(exportUserData)
);

export default router;
