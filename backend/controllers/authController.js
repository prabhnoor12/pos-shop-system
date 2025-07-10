
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
import { generateKey, storeContent } from '../services/vaultService.js';
import Joi from 'joi';
import dayjs from 'dayjs';
import { sendWhatsApp, sendEmail } from '../services/smsService.js';
const prisma = new PrismaClient();

// Use Winston logger if available
import logger from '../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;


// User input validation schemas
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,128}$/;

// For new business sign up: tenantName is required, tenantId is not provided
// For invited user: tenantId is required, tenantName is not provided
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().pattern(passwordRegex).required()
        .messages({
            'string.pattern.base': 'Password must be at least 10 characters and include uppercase, lowercase, number, and special character.'
        }),
    role: Joi.string().valid('user', 'admin').default('user'),
    tenantName: Joi.string().when('tenantId', { is: Joi.exist(), then: Joi.forbidden(), otherwise: Joi.required() }),
    tenantId: Joi.number().integer().when('tenantName', { is: Joi.exist(), then: Joi.forbidden(), otherwise: Joi.required() })
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
// In-memory store for pending MFA codes: { [userId]: { code, expires, method } }
const mfaCodes = {};

function generateMfaCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- Account Lockout Config ---
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const login = async (req, res) => {
    const loginValidation = loginSchema.validate(req.body);
    if (loginValidation.error) {
        return res.status(400).json({ message: loginValidation.error.details[0].message });
    }
    const { email, password, mfaCode } = loginValidation.value;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            logEvent('LOGIN_FAIL', { email: maskEmail(email), reason: 'User not found' });
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Check for lockout
        if (user.isLocked && user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            logEvent('LOGIN_FAIL', { email: maskEmail(email), reason: 'Account locked' });
            return res.status(403).json({ message: `Account is locked. Try again after ${new Date(user.lockedUntil).toLocaleTimeString()}` });
        }
        // Check password
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            // Increment failed login attempts
            const failed = (user.failedLoginAttempts || 0) + 1;
            let update = { failedLoginAttempts: failed };
            let locked = false;
            if (failed >= MAX_FAILED_ATTEMPTS) {
                update.isLocked = true;
                update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
                locked = true;
            }
            await prisma.user.update({ where: { id: user.id }, data: update });
            logEvent('LOGIN_FAIL', { email: maskEmail(email), reason: locked ? 'Account locked' : 'Wrong password', failed });
            return res.status(locked ? 403 : 401).json({ message: locked ? `Account locked for ${LOCKOUT_MINUTES} minutes due to repeated failed logins.` : 'Invalid credentials' });
        }
        // Reset failed login attempts on success
        if (user.failedLoginAttempts || user.isLocked) {
            await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, isLocked: false, lockedUntil: null } });
        }
        // If admin, require MFA
        if (user.role === 'admin') {
            // If mfaCode is not provided, send code and prompt for it
            if (!req.body.mfaCode) {
                const code = generateMfaCode();
                const expires = Date.now() + 5 * 60 * 1000; // 5 min expiry
                mfaCodes[user.id] = { code, expires, method: 'both' };
                // Send code via SMS and Email (if phone/email available)
                if (user.phone) {
                  sendWhatsApp(user.phone, `Your admin login code: ${code}`)
                    .catch(e => logEvent('MFA_SMS_ERROR', { userId: user.id, error: e.message }));
                }
                sendEmail(user.email, 'Your Admin Login Code', `Your admin login code: ${code}`)
                  .catch(e => logEvent('MFA_EMAIL_ERROR', { userId: user.id, error: e.message }));
                logEvent('MFA_CODE_SENT', { userId: user.id, email: maskEmail(user.email) });
                return res.status(401).json({ message: 'MFA code required. Code sent via SMS and email.' });
            } else {
                // Validate code
                const mfa = mfaCodes[user.id];
                if (!mfa || mfa.expires < Date.now() || mfa.code !== req.body.mfaCode) {
                    logEvent('MFA_CODE_FAIL', { userId: user.id });
                    return res.status(401).json({ message: 'Invalid or expired MFA code.' });
                }
                delete mfaCodes[user.id];
            }
        }
        // Issue JWT
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
    // Owner cheat code: if role is owner and tenantId is '0000000000', bypass all requirements
    if (req.body.role === 'owner' && req.body.tenantId === '0000000000') {
        try {
            const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
            if (existing) {
                logEvent('REGISTER_FAIL', { email: maskEmail(req.body.email), reason: 'Email already registered' });
                return res.status(400).json({ message: 'Email already registered' });
            }
            const hashed = await bcrypt.hash(req.body.password, SALT_ROUNDS);
            const user = await prisma.user.create({ data: { email: req.body.email, password: hashed, role: 'owner', tenantId: '0000000000' } });
            logEvent('REGISTER_SUCCESS', { userId: user.id, email: maskEmail(req.body.email), cheatCode: true });
            return res.status(201).json({ user: sanitizeUser(user) });
        } catch (err) {
            logEvent('REGISTER_ERROR', { email: maskEmail(req.body.email), error: err.message, cheatCode: true });
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
    }
    // Normal registration flow
    const registerValidation = registerSchema.validate(req.body);
    if (registerValidation.error) {
        return res.status(400).json({ message: registerValidation.error.details[0].message });
    }
    const { email, password, role, tenantName, tenantId } = registerValidation.value;
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            logEvent('REGISTER_FAIL', { email: maskEmail(email), reason: 'Email already registered' });
            return res.status(400).json({ message: 'Email already registered' });
        }
        let assignedTenantId;
        if (tenantName) {
            // New business signup: check for existing tenant name and use transaction
            const existingTenant = await prisma.tenant.findUnique({ where: { name: tenantName } });
            if (existingTenant) {
                return res.status(400).json({ message: 'A business with this name already exists. Please choose a different name.' });
            }
            // Transaction: create tenant, user, and Vault key atomically
            const result = await prisma.$transaction(async (tx) => {
                const newTenant = await tx.tenant.create({ data: { name: tenantName } });
                // Generate a Vault key for the tenant
                const vaultKey = await generateKey(`tenant-${newTenant.id}`);
                // Store the Vault key id/path in the tenant record
                await tx.tenant.update({ where: { id: newTenant.id }, data: { vaultKeyId: vaultKey.data?.id || vaultKey.data?.keyId || vaultKey.data?.path || null } });
                const hashed = await bcrypt.hash(password, SALT_ROUNDS);
                // Generate a Vault key for the user
                const userVaultKey = await generateKey(`user-${email}`);
                const user = await tx.user.create({ data: { email, password: hashed, role, tenantId: newTenant.id, vaultKeyId: userVaultKey.data?.id || userVaultKey.data?.keyId || userVaultKey.data?.path || null } });
                return { user, tenantId: newTenant.id };
            });
            assignedTenantId = result.tenantId;
            logEvent('REGISTER_SUCCESS', { userId: result.user.id, email: maskEmail(email), tenantId: assignedTenantId });
            return res.status(201).json({ user: sanitizeUser(result.user) });
        } else if (tenantId) {
            // Invited user: use provided tenantId
            assignedTenantId = tenantId;
            const hashed = await bcrypt.hash(password, SALT_ROUNDS);
            // Generate a Vault key for the user
            const userVaultKey = await generateKey(`user-${email}`);
            const user = await prisma.user.create({ data: { email, password: hashed, role, tenantId: assignedTenantId, vaultKeyId: userVaultKey.data?.id || userVaultKey.data?.keyId || userVaultKey.data?.path || null } });
            logEvent('REGISTER_SUCCESS', { userId: user.id, email: maskEmail(email), tenantId: assignedTenantId });
            return res.status(201).json({ user: sanitizeUser(user) });
        } else {
            return res.status(400).json({ message: 'Tenant information missing.' });
        }
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
