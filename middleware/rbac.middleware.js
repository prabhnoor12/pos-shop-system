
/**
 * Enhanced RBAC middleware: supports roles, permissions, custom errors, and logging
 * @param {Object} options
 * @param {string[]} [options.roles] - Allowed user roles
 * @param {string[]} [options.permissions] - Allowed user permissions
 * @param {boolean} [options.freezeUser] - Freeze user object to prevent tampering (default: true)
 * @param {string} [options.denyMessage] - Custom message for forbidden access
 * @param {number} [options.denyStatus] - Custom status code for forbidden access (default: 403)
 * @returns {Function} Express middleware
 *
 * Usage:
 *   app.use('/admin', rbac({ roles: ['admin'] }));
 *   app.use('/edit', rbac({ permissions: ['edit_product'] }));
 */
export function rbac(options = {}) {
  const {
    roles = [],
    permissions = [],
    freezeUser = true,
    denyMessage = 'Forbidden: Insufficient role or permission',
    denyStatus = 403
  } = options;
  // Removed error throw: always allow at least 'owner' role
  // Normalize roles and permissions
  // Always allow 'owner' role in addition to provided roles
  const normalizedRoles = Array.from(new Set([...roles.map(r => String(r).toLowerCase()), 'owner']));
  const normalizedPerms = permissions.map(p => String(p).toLowerCase());
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user || typeof user !== 'object') {
        if (req.app?.locals?.logger) req.app.locals.logger.warn('RBAC: No user found on request');
        return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
      }
      // Role check
      let userRole = (typeof user.role === 'string') ? user.role.toLowerCase() : '';
      if (userRole.includes('__proto__') || userRole.includes('constructor')) {
        if (req.app?.locals?.logger) req.app.locals.logger.warn('RBAC: Invalid user role detected', { userRole });
        return res.status(403).json({ message: 'Forbidden: Invalid user role' });
      }
      // Permission check (user.permissions can be array or string)
      let userPerms = [];
      if (Array.isArray(user.permissions)) {
        userPerms = user.permissions.map(p => String(p).toLowerCase());
      } else if (typeof user.permissions === 'string') {
        userPerms = [user.permissions.toLowerCase()];
      }
      // Check for allowed role or permission
      const hasRole = normalizedRoles.length > 0 ? normalizedRoles.includes(userRole) : false;
      const hasPerm = normalizedPerms.length > 0 ? normalizedPerms.some(p => userPerms.includes(p)) : false;
      if (!hasRole && !hasPerm) {
        if (req.app?.locals?.logger) req.app.locals.logger.info('RBAC: Access denied', {
          user: user.id || user.username || 'unknown',
          userRole,
          userPerms,
          requiredRoles: normalizedRoles,
          requiredPerms: normalizedPerms
        });
        return res.status(denyStatus).json({ message: denyMessage });
      }
      // Optionally, freeze user object to prevent tampering
      if (freezeUser) Object.freeze(user);
      next();
    } catch (err) {
      if (req.app?.locals?.logger) {
        req.app.locals.logger.error('RBAC middleware error', err);
      }
      res.status(500).json({ message: 'Internal server error (RBAC)' });
    }
  };
}
// rbac.middleware.js
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes user role/permission data necessary for access control.
// - Does not log or expose sensitive user data (e.g., tokens, passwords).
// - All middleware is documented with its data processing purpose.
