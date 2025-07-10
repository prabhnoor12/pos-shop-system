// sales.validation.js
//
// GDPR Data Minimization & Purpose Limitation:
// - Only validates sales data necessary for transaction processing.
// - Does not log or expose sensitive user data (e.g., tokens, passwords).
// - All middleware is documented with its data processing purpose.
import { body, validationResult } from 'express-validator';

export const validateSale = [
  body('customerId').isInt({ min: 1 }).withMessage('customerId must be a positive integer'),
  body('storeId').isInt({ min: 1 }).withMessage('storeId is required and must be a positive integer'),
  body('registerId').isInt({ min: 1 }).withMessage('registerId is required and must be a positive integer'),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('productId must be a positive integer'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('price must be a non-negative number'),
  body('total').isFloat({ min: 0 }).withMessage('total must be a non-negative number'),
  body('paymentType').isString().notEmpty().withMessage('paymentType is required'),
  body('paid').isBoolean().withMessage('paid must be a boolean'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
