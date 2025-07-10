// barcodeRoutes.js

/**
 * @swagger
 * tags:
 *   name: Barcode
 *   description: Barcode generation and scanning endpoints
 */
import express from 'express';
import multer from 'multer';
import * as barcodeController from '../controllers/barcodeController.js';
import asyncHandler from '../utils/asyncHandler.js';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const upload = multer();

const barcodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: 'Too many barcode requests, please try again later.' }
});

const generateSchema = Joi.object({
  data: Joi.string().required(),
  format: Joi.string().valid('png', 'svg').optional(),
  // Add more barcode options as needed
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    next();
  };
}


import { authenticateToken } from '../middleware/auth.middleware.js';
import { rbac, auditLog } from '../middleware/permission.middleware.js';

/**
 * @swagger
 * /barcode/generate:
 *   post:
 *     summary: Generate a barcode image
 *     tags: [Barcode]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: string
 *                 description: Data to encode in the barcode
 *               format:
 *                 type: string
 *                 enum: [png, svg]
 *                 description: Output format
 *     responses:
 *       200:
 *         description: Barcode image generated
 *         content:
 *           image/png: {}
 *           image/svg+xml: {}
 */
router.post(
  '/generate',
  barcodeLimiter,
  authenticateToken,
  rbac('barcode:generate'),
  auditLog('barcode:generate', 'Barcode'),
  validate(generateSchema),
  asyncHandler(barcodeController.generate)
);

/**
 * @swagger
 * /barcode/scan:
 *   post:
 *     summary: Scan a barcode from an uploaded image
 *     tags: [Barcode]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file containing the barcode
 *     responses:
 *       200:
 *         description: Barcode data extracted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
 */
router.post(
  '/scan',
  authenticateToken,
  upload.single('image'),
  rbac('barcode:scan'),
  auditLog('barcode:scan', 'Barcode'),
  asyncHandler(barcodeController.scan)
);

/**
 * @swagger
 * /barcode/validate-format:
 *   get:
 *     summary: Validate if a barcode format is supported
 *     tags: [Barcode]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *         required: true
 *         description: Barcode format to validate (e.g., code128)
 *     responses:
 *       200:
 *         description: Format is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 */
router.get(
  '/validate-format',
  authenticateToken,
  rbac('barcode:validate'),
  auditLog('barcode:validate', 'Barcode'),
  asyncHandler(barcodeController.validateFormat)
);

export default router;
