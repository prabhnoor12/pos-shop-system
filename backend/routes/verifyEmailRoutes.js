
/**
 * @swagger
 * tags:
 *   name: VerifyEmail
 *   description: Email verification and authentication endpoints
 */


import express from 'express';
import { signup, login } from '../controllers/verifyEmailController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

// POST /api/verify-email/signup

/**
 * @swagger
 * /verify/signup:
 *   post:
 *     summary: Signup and verify email
 *     tags: [VerifyEmail]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User signed up and verification email sent
 */
router.post(
  '/signup',
  // Public signup: do not require RBAC or authentication
  asyncHandler(signup)
);

// POST /api/verify-email/login

/**
 * @swagger
 * /verify/login:
 *   post:
 *     summary: Login with verified email
 *     tags: [VerifyEmail]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in
 */
router.post(
  '/login',
  authenticateToken,
  rbac('user:login'),
  auditLog('user:login', 'User'),
  asyncHandler(login)
);

export default router;
