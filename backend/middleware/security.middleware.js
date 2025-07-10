// security.middleware.js
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes security-related data necessary for protecting the application.
// - Does not log or expose sensitive user data (e.g., tokens, passwords).
// - All middleware is documented with its data processing purpose.

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import lusca from 'lusca';
import sanitizeHtml from 'sanitize-html';
import { body, validationResult, param, query } from 'express-validator';

// Use helmet to set secure HTTP headers (with recommended options)
const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Set to true and configure if you want CSP
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});


// Rate limiting for authentication routes (e.g., /auth)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      ip: req.ip,
      time: new Date().toISOString()
    });
  }
});

// General rate limiting for all API endpoints (stricter for overall security)
const sensitiveApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // limit each IP to 60 requests per windowMs for all API endpoints
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests from this IP, please try again later.',
      ip: req.ip,
      time: new Date().toISOString()
    });
  }
});

// CSRF protection using lusca (applies to all POST/PUT/PATCH/DELETE by default)
const csrfConditional = lusca.csrf();


// XSS protection middleware using sanitize-html
function xssMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeHtml(req.body[key], {
          allowedTags: [],
          allowedAttributes: {},
        });
      }
    }
  }
  next();
}

// Input validation and sanitization helpers
const validateUserSignup = [
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isString().escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export { helmetMiddleware, authLimiter, sensitiveApiLimiter, csrfConditional, xssMiddleware, validateUserSignup, validateLogin };
