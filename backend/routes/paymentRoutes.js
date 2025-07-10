import asyncHandler from '../utils/asyncHandler.js';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';

/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment processing endpoints (PayPal, Square)
 */
import express from 'express';

import { createPayPalOrder, capturePayPalOrder } from '../payment/paypalIntegration.js';
import { createSquarePayment } from '../payment/squareIntegration.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

const router = express.Router();

// Rate limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { message: 'Too many payment requests, please try again later.' }
});

// Joi schemas
const squarePaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  sourceId: Joi.string().required(),
  note: Joi.string().allow('').optional()
});
const paypalOrderSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  description: Joi.string().allow('').optional()
});
const paypalCaptureSchema = Joi.object({
  orderId: Joi.string().required()
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    next();
  };
}


// Create a Square payment

/**
 * @swagger
 * /payment/square/create:
 *   post:
 *     summary: Create a Square payment
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               sourceId:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Square payment created
 */
router.post(
  '/square/create',
  paymentLimiter,
  authenticateToken,
  rbac('payment:create'),
  auditLog('payment:create', 'Payment'),
  validate(squarePaymentSchema),
  asyncHandler(async (req, res) => {
    const { amount, currency, sourceId, note } = req.body;
    const result = await createSquarePayment({ amount, currency, sourceId, note });
    res.json(result);
  })
);

// Create a PayPal order

/**
 * @swagger
 * /payment/paypal/create:
 *   post:
 *     summary: Create a PayPal order
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: PayPal order created
 */
router.post(
  '/paypal/create',
  paymentLimiter,
  authenticateToken,
  rbac('payment:create'),
  auditLog('payment:create', 'Payment'),
  validate(paypalOrderSchema),
  asyncHandler(async (req, res) => {
    const { amount, currency, description } = req.body;
    const order = await createPayPalOrder({ amount, currency, description });
    // Find approval link for client
    const approveUrl = order.links?.find(l => l.rel === 'approve')?.href;
    res.json({ orderId: order.id, approveUrl });
  })
);

// Capture a PayPal order after approval

/**
 * @swagger
 * /payment/paypal/capture:
 *   post:
 *     summary: Capture a PayPal order after approval
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: PayPal order captured
 */
router.post(
  '/paypal/capture',
  paymentLimiter,
  authenticateToken,
  rbac('payment:capture'),
  auditLog('payment:capture', 'Payment'),
  validate(paypalCaptureSchema),
  asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const result = await capturePayPalOrder(orderId);
    res.json(result);
  })
);

export default router;
