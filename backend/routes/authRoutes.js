// authRoutes.js
import express from 'express';
import authController from '../controllers/authController.js';
import asyncHandler from '../utils/asyncHandler.js';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';


const router = express.Router();

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { message: 'Too many auth requests, please try again later.' }
});

// Joi schemas (should match those in controller)
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(10).required(),
  role: Joi.string().valid('user', 'admin').default('user')
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    next();
  };
}

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));

export default router;
