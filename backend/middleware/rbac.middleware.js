
// --- Enterprise-Grade RBAC Middleware (Hierarchical, Multi-Tenant, Org Unit Aware) ---
// Usage: app.use('/api/secure', rbac({ permissions: ['product:edit'] }))
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Enterprise RBAC middleware: fetches roles/permissions from DB, supports multi-tenant, org units, role inheritance, and advanced permission checks.
 * @param {Object} options
 * @param {string[]} [options.roles] - Allowed user roles (by name)
 * @param {string[]} [options.permissions] - Allowed user permissions (by name, e.g. 'product:edit')
 * @param {Object} [options.resourcePermissions] - Per-resource permissions, e.g. { product: ['edit', 'delete'] }
 * @param {Object} [options.actionPermissions] - Per-action permissions, e.g. { 'POST:/api/products': ['product:create'] }
 * @param {boolean} [options.freezeUser] - Freeze user object to prevent tampering (default: true)
 * @param {string} [options.denyMessage] - Custom message for forbidden access
 * @param {number} [options.denyStatus] - Custom status code for forbidden access (default: 403)
 * @returns {Function} Express middleware
 */
export function rbac(options = {}) {
  const {
    roles = [],
    permissions = [],
    resourcePermissions = {},
    actionPermissions = {},
    freezeUser = true,
    denyMessage = 'Forbidden: Insufficient role or permission',
    denyStatus = 403
  } = options;

  // Normalize roles/permissions for comparison
  const normalizedRoles = Array.from(new Set([...roles.map(r => String(r).toLowerCase()), 'owner']));
  const normalizedPerms = permissions.map(p => String(p).toLowerCase());
  const normalizedResourcePerms = {};
  for (const [resource, perms] of Object.entries(resourcePermissions || {})) {
    normalizedResourcePerms[String(resource).toLowerCase()] = perms.map(p => String(p).toLowerCase());
  }
  const normalizedActionPerms = {};
  for (const [action, perms] of Object.entries(actionPermissions || {})) {
    normalizedActionPerms[String(action).toUpperCase()] = perms.map(p => String(p).toLowerCase());
  }

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user || typeof user !== 'object') {
        req.app?.locals?.logger?.warn('RBAC: No user found on request');
        return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
      }

      // --- Tenant & Org Unit Context ---
      const tenantId = req.tenantId || user.tenantId;
      const orgUnitId = req.orgUnitId || user.orgUnitId || null;
      if (!tenantId) {
        req.app?.locals?.logger?.warn('RBAC: No tenantId found');
        return res.status(400).json({ message: 'Bad request: tenantId required' });
      }

      // --- Fetch All User Roles (including org units, inheritance) ---
      // 1. Get all direct roles for user in this tenant (and org unit, if set)
      // 2. Traverse up org unit hierarchy (if needed)
      // 3. Traverse up role hierarchy (role.parentId) for inheritance
      // 4. Aggregate all unique roles
      // 5. Owner/admin shortcut: always allow

      // Step 1: Get all direct UserRole assignments for this user/tenant/orgUnit
      let userRoles = await prisma.userRole.findMany({
        where: {
          userId: user.id,
          tenantId,
          ...(orgUnitId ? { orgUnitId } : {}),
        },
        include: { role: true },
      });

      // Step 2: Optionally, fetch roles from parent org units (not implemented here, but can be added)
      // Step 3: Traverse up role hierarchy for inheritance
      const allRoles = new Map();
      async function collectRoleAndParents(role) {
        if (!role || allRoles.has(role.id)) return;
        allRoles.set(role.id, role);
        if (role.parentId) {
          const parent = await prisma.role.findUnique({ where: { id: role.parentId } });
          await collectRoleAndParents(parent);
        }
      }
      for (const ur of userRoles) {
        await collectRoleAndParents(ur.role);
      }
      const userRoleNames = Array.from(allRoles.values()).map(r => r.name.toLowerCase());

      // Step 4: Owner/admin shortcut
      if (userRoleNames.includes('owner') || userRoleNames.includes('admin')) return next();

      // Step 5: Aggregate all permissions for these roles (direct + inherited)
      const allRoleIds = Array.from(allRoles.keys());
      const rolePerms = await prisma.rolePermission.findMany({
        where: {
          roleId: { in: allRoleIds },
          tenantId,
        },
        include: { permission: true },
      });
      const userPerms = Array.from(new Set(rolePerms.map(rp => rp.permission.name.toLowerCase())));

      // --- Standard Checks (roles, permissions, resource/action) ---
      const hasRole = normalizedRoles.length > 0 ? userRoleNames.some(r => normalizedRoles.includes(r)) : false;
      const hasPerm = normalizedPerms.length > 0 ? normalizedPerms.some(p => userPerms.includes(p)) : false;
      let hasResourcePerm = false;
      if (Object.keys(normalizedResourcePerms).length > 0 && req.resource) {
        const resourceKey = String(req.resource).toLowerCase();
        if (normalizedResourcePerms[resourceKey]) {
          hasResourcePerm = normalizedResourcePerms[resourceKey].some(p => userPerms.includes(p));
        }
      }
      let hasActionPerm = false;
      if (Object.keys(normalizedActionPerms).length > 0) {
        const actionKey = `${req.method.toUpperCase()}:${req.baseUrl}${req.path}`;
        if (normalizedActionPerms[actionKey]) {
          hasActionPerm = normalizedActionPerms[actionKey].some(p => userPerms.includes(p));
        } else {
          const baseActionKey = `${req.method.toUpperCase()}:${req.baseUrl}`;
          if (normalizedActionPerms[baseActionKey]) {
            hasActionPerm = normalizedActionPerms[baseActionKey].some(p => userPerms.includes(p));
          }
        }
      }

      if (!hasRole && !hasPerm && !hasResourcePerm && !hasActionPerm) {
        req.app?.locals?.logger?.info('RBAC: Access denied', {
          user: user.id || user.username || 'unknown',
          userRoleNames,
          userPerms,
          requiredRoles: normalizedRoles,
          requiredPerms: normalizedPerms,
          requiredResourcePerms: normalizedResourcePerms,
          requiredActionPerms: normalizedActionPerms
        });
        return res.status(denyStatus).json({ message: denyMessage });
      }
      if (freezeUser) Object.freeze(user);
      next();
    } catch (err) {
      req.app?.locals?.logger?.error('RBAC middleware error', err);
      res.status(500).json({ message: 'Internal server error (RBAC)' });
    }
  };
}

// --- GDPR Data Minimization & Purpose Limitation ---
// - Only processes user role/permission data necessary for access control.
// - Does not log or expose sensitive user data (e.g., tokens, passwords).
// - All middleware is documented with its data processing purpose.

// --- Per-action and per-resource RBAC ---
// - Use resourcePermissions: { resource: ['edit', 'delete'] } for resource-level control.
// - Use actionPermissions: { 'POST:/api/products': ['product:create'] } for action-level control.
// - Set req.resource in your route/controller to enable resource-level checks.
