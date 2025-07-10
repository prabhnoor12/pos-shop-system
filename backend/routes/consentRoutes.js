
/**
 * @swagger
 * tags:
 *   name: Consent
 *   description: GDPR consent management endpoints
 */
import express from 'express';
import { setConsent, getConsent } from '../controllers/consentController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /consent - Get current consent status
import { rbac, auditLog } from '../middleware/permission.middleware.js';


/**
 * @swagger
 * /consent:
 *   get:
 *     summary: Get current consent status for the authenticated user
 *     tags: [Consent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Consent status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 consent:
 *                   type: boolean
 */
router.get(
  '/',
  authenticateToken,
  rbac('consent:view'),
  auditLog('consent:view', 'Consent'),
  asyncHandler(getConsent)
);

// POST /consent - Give or withdraw consent

/**
 * @swagger
 * /consent:
 *   post:
 *     summary: Give or withdraw consent
 *     tags: [Consent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               consent:
 *                 type: boolean
 *                 description: Give (true) or withdraw (false) consent
 *     responses:
 *       200:
 *         description: Consent updated
 */
router.post(
  '/',
  authenticateToken,
  rbac('consent:set'),
  auditLog('consent:set', 'Consent'),
  asyncHandler(setConsent)
);

export default router;
