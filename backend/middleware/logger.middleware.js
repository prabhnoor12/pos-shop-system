// logger.middleware.js
//
// GDPR Data Minimization & Purpose Limitation:
// - Only logs request data necessary for monitoring and debugging.
// - Does not log sensitive user data (e.g., tokens, passwords, PII).
// - All middleware is documented with its data processing purpose.
import logger from '../config/logger.js';


/**
 * Logs incoming requests
 * Purpose: Only logs minimal request data for monitoring/debugging. Avoids sensitive data.
 */
function requestLogger(req, res, next) {
  logger.info(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    user: req.user ? req.user.id || req.user.username : undefined
  });
  next();
}

export default requestLogger;
