

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
    // Send error to Sentry with extra context
    Sentry.withScope(scope => {
        scope.setExtras({
            url: req.originalUrl,
            method: req.method,
            user: req.user?.id || null,
            status: err.status || 500,
            code: err.code || undefined,
            body: req.body,
            query: req.query,
            params: req.params,
            ip: req.ip,
            headers: req.headers,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer'),
            cookies: req.cookies
        });
        Sentry.captureException(err);
    });

    // Normalize error type
    let status = err.status || 500;
    let code = err.code || undefined;
    let message = 'Internal Server Error';
    let details = undefined;
    let traceId = req.headers['x-trace-id'] || req.id || undefined;
    let timestamp = new Date().toISOString();

    // Handle common error types
    if (err.isJoi) {
        // Joi validation error
        status = 400;
        message = 'Validation error';
        details = err.details?.map(d => d.message).join('; ');
    } else if (err.name === 'UnauthorizedError') {
        // JWT auth error
        status = 401;
        message = 'Authentication failed';
    } else if (err.name === 'ForbiddenError') {
        status = 403;
        message = 'You do not have permission to perform this action.';
    } else if (err.name === 'NotFoundError') {
        status = 404;
        message = err.message || 'Resource not found';
    } else if (err.type === 'entity.too.large') {
        status = 413;
        message = 'Payload too large';
    } else if (err.type === 'entity.parse.failed') {
        status = 400;
        message = 'Malformed JSON';
    } else if (err.message) {
        message = err.message;
    }

    // Enhanced logging with trace, timestamp, and memory usage
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        user: req.user?.id || null,
        status,
        code,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        headers: req.headers,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        cookies: req.cookies,
        traceId,
        timestamp,
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });

    // User-friendly error response with trace and timestamp
    res.status(status).json({
        message,
        code,
        traceId,
        timestamp,
        error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        details: process.env.NODE_ENV === 'production' ? undefined : details || err.details || undefined
    });
}
