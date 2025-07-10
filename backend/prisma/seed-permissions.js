

import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env from project root
config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();


// Expanded, normalized permissions for enterprise RBAC
const permissions = [
  // Product
  { name: 'product:create', description: 'Create products', resource: 'product', action: 'create' },
  { name: 'product:edit', description: 'Edit products', resource: 'product', action: 'edit' },
  { name: 'product:delete', description: 'Delete products', resource: 'product', action: 'delete' },
  { name: 'product:view', description: 'View products', resource: 'product', action: 'view' },
  // Sale
  { name: 'sale:create', description: 'Create sales', resource: 'sale', action: 'create' },
  { name: 'sale:refund', description: 'Refund sales', resource: 'sale', action: 'refund' },
  { name: 'sale:view', description: 'View sales', resource: 'sale', action: 'view' },
  // User
  { name: 'user:manage', description: 'Manage users', resource: 'user', action: 'manage' },
  { name: 'user:view', description: 'View users', resource: 'user', action: 'view' },
  // Report
  { name: 'report:view', description: 'View reports', resource: 'report', action: 'view' },
  { name: 'report:export', description: 'Export reports', resource: 'report', action: 'export' },
  // Inventory
  { name: 'inventory:manage', description: 'Manage inventory', resource: 'inventory', action: 'manage' },
  { name: 'inventory:view', description: 'View inventory', resource: 'inventory', action: 'view' },
  // Support
  { name: 'support:respond', description: 'Respond to support tickets', resource: 'support', action: 'respond' },
  // System
  { name: 'system:admin', description: 'System administration', resource: 'system', action: 'admin' },
  { name: 'system:access', description: 'Basic system access', resource: 'system', action: 'access' },
];


// Example role-permission mappings for a normalized RBAC
const rolePermissions = [
  // Owner: all permissions
  { role: 'owner', permissions: permissions.map(p => p.name) },
  // Admin: all except system:admin
  { role: 'admin', permissions: permissions.filter(p => p.name !== 'system:admin').map(p => p.name) },
  // Manager: manage/view product, sale, inventory, report, user:view
  { role: 'manager', permissions: permissions.filter(p => [
    'product:create','product:edit','product:view','sale:create','sale:refund','sale:view','inventory:manage','inventory:view','report:view','user:view','support:respond'
  ].includes(p.name)).map(p => p.name) },
  // Supervisor: view product, sale, inventory, report
  { role: 'supervisor', permissions: permissions.filter(p => [
    'product:view','sale:view','inventory:view','report:view','support:respond'
  ].includes(p.name)).map(p => p.name) },
  // Employee: view product, sale, inventory
  { role: 'employee', permissions: permissions.filter(p => [
    'product:view','sale:view','inventory:view'
  ].includes(p.name)).map(p => p.name) },
  // Cashier: create sale, view product
  { role: 'cashier', permissions: ['sale:create', 'product:view'] },
  // Intern: system:access only
  { role: 'intern', permissions: ['system:access'] },
];


async function main() {
  // Upsert permissions (with resource/action fields)
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description, resource: perm.resource, action: perm.action },
      create: perm,
    });
  }

  // Upsert roles (if not present)
  for (const rp of rolePermissions) {
    await prisma.role.upsert({
      where: { name: rp.role },
      update: {},
      create: { name: rp.role, tenantId: 1 }, // Default tenantId, adjust as needed
    });
  }

  // Upsert role-permission mappings
  for (const rp of rolePermissions) {
    const role = await prisma.role.findUnique({ where: { name: rp.role } });
    for (const permName of rp.permissions) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (perm && role) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id, tenantId: role.tenantId },
        });
      }
    }
  }

  console.log('Seeded permissions, roles, and role-permissions.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
