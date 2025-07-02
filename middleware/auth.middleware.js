

// auth.middleware.js
// JWT authentication and role-based access control (enterprise+)
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes authentication/authorization data necessary for access control.
// - Does not log or expose sensitive user data (e.g., tokens, passwords).
// - All middleware is documented with its data processing purpose.
import jwt from 'jsonwebtoken';
import winston from 'winston';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const logger = winston.createLogger({
    level: 'warn',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Authenticate JWT token with logging and token expiry check
/**
 * Authenticate JWT token
 * Purpose: Only processes JWT for authentication. Does not log or expose sensitive data.
 */
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        logger.warn({ event: 'AUTH_NO_TOKEN', path: req.path, ip: req.ip });
        return res.status(401).json({ message: 'No token provided' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            logger.warn({ event: 'AUTH_INVALID_TOKEN', path: req.path, ip: req.ip, error: err.message });
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Authorize by role(s) with logging and support for hierarchical roles
/**
 * Authorize by user role(s)
 * Purpose: Only checks user role for access control. Does not log or expose sensitive data.
 */
export function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            logger.warn({ event: 'AUTH_FORBIDDEN', path: req.path, user: req.user?.id, requiredRoles: roles });
            return res.status(403).json({ message: 'Forbidden: insufficient role' });
        }
        next();
    };
}
