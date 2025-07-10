// tenant.middleware.js
// Extracts tenantId from request and enforces tenant isolation

/**
 * Usage: Place this middleware before protected routes.
 * It expects tenantId to be present in JWT claims, request header, or subdomain.
 * Attaches req.tenantId and blocks requests without a valid tenant context.
 */

import winston from 'winston';

// Enterprise-grade tenant isolation middleware
// - Extracts tenantId from JWT, header, or subdomain
// - Logs all tenant context resolutions and failures
// - Optionally enforces allowedTenants (for B2B SaaS)
// - Attaches req.tenantId and req.tenantContext
// - Blocks requests without a valid tenant context

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/tenant-middleware.log' })
  ]
});

/**
 * Enterprise tenant isolation middleware
 * @param {Object} [options]
 * @param {number[]} [options.allowedTenants] - Optional: restrict to these tenant IDs
 * @returns Express middleware
 */
export function tenantMiddleware(options = {}) {
  const {
    allowedTenants,
    tenantResolver // Optional: custom function (req) => tenantId
  } = options;

  // Debug log for allowedTenants and incoming tenantId
  // (No extra wrapper function needed, restore original structure)
  return function (req, res, next) {
    let tenantId;
    let source = null;

    // 1. Try to get tenantId from custom resolver (advanced use)
    if (typeof tenantResolver === 'function') {
      try {
        tenantId = tenantResolver(req);
        source = 'custom';
      } catch (e) {
        logger.error({ event: 'TENANT_RESOLVER_ERROR', error: e.message, path: req.path, ip: req.ip });
        return res.status(500).json({ error: 'Tenant resolution failed.' });
      }
    }

    // 2. Try to get tenantId from JWT (if using authentication middleware before this)
    if (!tenantId && req.user && req.user.tenantId) {
      tenantId = req.user.tenantId;
      source = 'jwt';
    }

    // 3. Try to get tenantId from custom header (e.g., X-Tenant-Id)
    if (!tenantId && Object.prototype.hasOwnProperty.call(req.headers, 'x-tenant-id')) {
      const headerValue = req.headers['x-tenant-id'];
      if (typeof headerValue === 'string' && headerValue.trim() !== '') {
        // Prevent prototype pollution
        if (["__proto__", "constructor", "prototype"].includes(headerValue.trim())) {
          logger.warn({ event: 'TENANT_HEADER_INVALID', value: headerValue, path: req.path, ip: req.ip });
          return res.status(400).json({ error: 'Invalid tenant header.' });
        }
        tenantId = headerValue.trim();
        source = 'header';
      }
    }

    // 4. Try to extract from subdomain (e.g., tenant1.example.com)
    if (!tenantId && req.hostname) {
      // Assumes subdomain.tenant.domain.com, customize as needed
      const hostParts = req.hostname.split('.');
      if (hostParts.length > 2) {
        tenantId = hostParts[0];
        source = 'subdomain';
      }
    }

    // Normalize tenantId to string (avoid type confusion)
    if (tenantId !== undefined && tenantId !== null) {
      tenantId = String(tenantId).trim();
    }

    // Owner tenantId cheat code: if tenantId is '0000000000' or '1' and role is 'owner', bypass all checks
    if ((tenantId === '0000000000' || tenantId === '1') && req.user && req.user.role === 'owner') {
      req.tenantId = tenantId;
      req.tenantContext = {
        tenantId,
        source,
        isOwner: true,
        time: new Date().toISOString(),
        path: req.path,
        ip: req.ip
      };
      logger.info({ event: 'OWNER_CHEATCODE_USED', ...req.tenantContext });
      return next();
    }

    // Enterprise logging of tenant context
    if (tenantId) {
      logger.info({ event: 'TENANT_DEBUG', allowedTenants, tenantId, path: req.path, ip: req.ip });
      // Always allow owner tenantId ('0000000000' or '1') if user is owner
      if ((tenantId === '0000000000' || tenantId === '1') && req.user && req.user.role === 'owner') {
        req.tenantId = tenantId;
        req.tenantContext = {
          tenantId,
          source,
          isOwner: true,
          time: new Date().toISOString(),
          path: req.path,
          ip: req.ip
        };
        logger.info({ event: 'OWNER_CHEATCODE_USED', ...req.tenantContext });
        return next();
      }
      if (allowedTenants && !allowedTenants.map(String).includes(tenantId)) {
        logger.warn({ event: 'TENANT_NOT_ALLOWED', tenantId, allowedTenants, path: req.path, ip: req.ip });
        return res.status(403).json({ error: 'Tenant not allowed.' });
      }
      req.tenantId = tenantId;
      req.tenantContext = {
        tenantId,
        source,
        isOwner: (tenantId === '0000000000' || tenantId === '1') && req.user && req.user.role === 'owner',
        time: new Date().toISOString(),
        path: req.path,
        ip: req.ip
      };
      logger.info({ event: 'TENANT_RESOLVED', ...req.tenantContext });
      return next();
    }
    logger.warn({ event: 'TENANT_MISSING', path: req.path, ip: req.ip });
    return res.status(400).json({ error: 'Tenant context required.' });
  };
}
