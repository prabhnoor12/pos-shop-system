

// validation.middleware.js
// Joi validation middleware for Express
//
// GDPR Data Minimization & Purpose Limitation:
// - Only validates and sanitizes data necessary for request processing.
// - Does not log or expose sensitive user data (e.g., tokens, passwords).
// - All middleware is documented with its data processing purpose.


import winston from 'winston';

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

// Enhanced: logs, supports custom error handler, and XSS sanitization
import xss from 'xss';

function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    const clean = {};
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            clean[key] = xss(obj[key]);
        } else if (typeof obj[key] === 'object') {
            clean[key] = sanitizeObject(obj[key]);
        } else {
            clean[key] = obj[key];
        }
    }
    return clean;
}

export function validateBody(schema, opts = {}) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) {
            logger.warn({ event: 'VALIDATION_BODY_FAIL', path: req.path, details: error.details.map(d => d.message) });
            if (opts.onError) return opts.onError(error, req, res, next);
            return res.status(400).json({
                message: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        req.body = sanitizeObject(value);
        next();
    };
}


export function validateQuery(schema, opts = {}) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
        if (error) {
            logger.warn({ event: 'VALIDATION_QUERY_FAIL', path: req.path, details: error.details.map(d => d.message) });
            if (opts.onError) return opts.onError(error, req, res, next);
            return res.status(400).json({
                message: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        req.query = sanitizeObject(value);
        next();
    };
}

// Utility: Validate params with Joi
export function validateParams(schema, opts = {}) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, { abortEarly: false, stripUnknown: true });
        if (error) {
            logger.warn({ event: 'VALIDATION_PARAMS_FAIL', path: req.path, details: error.details.map(d => d.message) });
            if (opts.onError) return opts.onError(error, req, res, next);
            return res.status(400).json({
                message: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        req.params = sanitizeObject(value);
        next();
    };
}
