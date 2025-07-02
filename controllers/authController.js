
// authController.js
// Handles authentication logic (login, register, etc.)
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns user data necessary for authentication and authorization.
// - Never returns or logs passwords or sensitive fields.
// - All endpoints are documented with their data processing purpose.

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import dayjs from 'dayjs';
const prisma = new PrismaClient();

// Use Winston logger if available
import logger from '../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;


// User input validation schemas
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,128}$/;
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().pattern(passwordRegex).required()
        .messages({
            'string.pattern.base': 'Password must be at least 10 characters and include uppercase, lowercase, number, and special character.'
        }),
    role: Joi.string().valid('user', 'admin').default('user')
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});


/**
 * Removes sensitive fields before sending user object to client.
 * Only returns fields required for authentication/session.
 * Purpose: Data minimization for GDPR compliance.
 */
function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...rest } = user;
    return rest;
}

function maskEmail(email) {
    // Mask email for logs: j***@d***.com
    if (!email) return '';
    const [user, domain] = email.split('@');
    return user[0] + '***@' + domain[0] + '***.' + domain.split('.').pop();
}

function logEvent(event, details) {
    // Never log sensitive data (like passwords)
    if (details && details.password) delete details.password;
    if (logger) {
        logger.info(`[${event}]`, details);
    } else {
        console.log(`[${dayjs().format()}] [${event}]`, details);
    }
}



/**
 * User login endpoint
 * Purpose: Authenticate user and issue JWT. Only returns JWT and minimal user info.
 */
const login = async (req, res) => {
    const loginValidation = loginSchema.validate(req.body);
    if (loginValidation.error) {
        return res.status(400).json({ message: loginValidation.error.details[0].message });
    }
    const { email, password } = loginValidation.value;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            logEvent('LOGIN_FAIL', { email: maskEmail(email), reason: 'User not found' });
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (user.isLocked) {
            logEvent('LOGIN_FAIL', { email: maskEmail(email), reason: 'Account locked' });
            return res.status(403).json({ message: 'Account is locked. Please contact support.' });
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            // Optionally, increment failed login attempts here
            logEvent('LOGIN_FAIL', { email: maskEmail(email), reason: 'Wrong password' });
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Optionally, reset failed login attempts here
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        logEvent('LOGIN_SUCCESS', { userId: user.id, email: maskEmail(email) });
        res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
        logEvent('LOGIN_ERROR', { email: maskEmail(email), error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}


/**
 * User registration endpoint
 * Purpose: Register new user. Only returns minimal user info, never password.
 */
const register = async (req, res) => {
    const registerValidation = registerSchema.validate(req.body);
    if (registerValidation.error) {
        return res.status(400).json({ message: registerValidation.error.details[0].message });
    }
    const { email, password, role } = registerValidation.value;
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            logEvent('REGISTER_FAIL', { email: maskEmail(email), reason: 'Email already registered' });
            return res.status(400).json({ message: 'Email already registered' });
        }
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        // Never log or expose the hashed password
        const user = await prisma.user.create({ data: { email, password: hashed, role } });
        logEvent('REGISTER_SUCCESS', { userId: user.id, email: maskEmail(email) });
        res.status(201).json({ user: sanitizeUser(user) });
    } catch (err) {
        logEvent('REGISTER_ERROR', { email: maskEmail(email), error: err.message });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}



// Only export minimal endpoints for authentication
export { login, register };

// Default export for compatibility with import authController from ...
export default {
  login,
  register,
  verifyToken,
  requireAdmin
};

/**
 * Token verification middleware
 * Purpose: Authenticate requests using JWT. Does not process or return user data.
 */
export function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            logEvent('TOKEN_FAIL', { error: err.message });
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
}

/**
 * Only allow admin users
 * Purpose: Restrict access to admin-only endpoints. Does not process or return user data.
 */
export function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    logEvent('ADMIN_ACCESS_DENIED', { userId: req.user?.userId, role: req.user?.role });
    return res.status(403).json({ message: 'Admin access required.' });
}
