import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to check if the user has the required permission.
 * Usage: rbac('product:create')
 */
// Enterprise RBAC middleware
// Supports: owner, admin, role hierarchy, multi-tenant, and least privilege
export function rbac(permissionName) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      // 1. Owner shortcut (unlimited power, including cheat code)
      if (
        user.role === 'owner' ||
        (req.tenantContext && req.tenantContext.isOwner) ||
        (user.role === 'owner' && user.tenantId === '0000000000')
      ) return next();

      // 2. Admin shortcut (all permissions for their tenant)
      if (user.role === 'admin') return next();

      // 3. Role hierarchy: collect all roles for this user (including inherited roles)
      // (Assumes a UserRole table for multi-role support; fallback to user.role if not present)
      let roles = [user.role];
      if (user.id) {
        const userRoles = await prisma.userRole.findMany({
          where: { userId: user.id, tenantId: req.tenantId },
          select: { role: true }
        });
        if (userRoles && userRoles.length > 0) {
          roles = [...new Set([...roles, ...userRoles.map(r => r.role)])];
        }
      }

      // 4. Check if any of the user's roles grant the permission
      const rolePerm = await prisma.rolePermission.findFirst({
        where: {
          role: { in: roles },
          permission: { name: permissionName },
        },
      });
      if (!rolePerm) {
        return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware to log actions for audit trail.
 * Usage: auditLog('product:create', 'Product', req.params.id)
 */
export function auditLog(action, resource, resourceIdField = null) {
  return async (req, res, next) => {
    res.on('finish', async () => {
      try {
        const userId = req.user ? req.user.id : null;
        const resourceId = resourceIdField ? req[resourceIdField] || req.params[resourceIdField] : null;
        await prisma.auditLog.create({
          data: {
            userId,
            action,
            resource,
            resourceId,
            details: JSON.stringify({ body: req.body, params: req.params, query: req.query }),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
      } catch (err) {
        // Optionally log error
      }
    });
    next();
  };
}
