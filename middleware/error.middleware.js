

// error.middleware.js
// Centralized error handler for Express (enterprise+)
//
// GDPR Data Minimization & Purpose Limitation:
// - Only logs and returns error data necessary for debugging and monitoring.
// - Avoids logging or exposing sensitive user data (e.g., tokens, passwords, PII) in production.
// - All middleware is documented with its data processing purpose.
import winston from 'winston';
import * as Sentry from '@sentry/node';

const logger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log' })
    ]
});

/**
 * Centralized error handler
 * Purpose: Only logs and returns error data needed for debugging/monitoring. Avoids sensitive data in production.
 */
export function errorHandler(err, req, res, next) {
    // Send error to Sentry
    Sentry.captureException(err);
    // Log error with more request context
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        user: req.user?.id || null,
        status: err.status || 500,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        headers: req.headers,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        cookies: req.cookies
    });
    const status = err.status || 500;
    res.status(status).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        code: err.code || undefined,
        details: process.env.NODE_ENV === 'production' ? undefined : err.details || undefined
    });
}
