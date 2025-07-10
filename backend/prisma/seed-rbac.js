// Advanced multi-tenant, hierarchical RBAC seed script for Prisma
// Run with: npx prisma db seed --preview-feature

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Example tenants
  const tenantA = await prisma.tenant.create({ data: { name: 'Acme Corp' } });
  const tenantB = await prisma.tenant.create({ data: { name: 'Globex Inc' } });

  // Org Units (expanded hierarchy)
  const acmeHQ = await prisma.orgUnit.create({ data: { name: 'Headquarters', tenantId: tenantA.id } });
  const acmeDiv1 = await prisma.orgUnit.create({ data: { name: 'Division 1', tenantId: tenantA.id, parentOrgUnitId: acmeHQ.id } });
  const acmeDiv2 = await prisma.orgUnit.create({ data: { name: 'Division 2', tenantId: tenantA.id, parentOrgUnitId: acmeHQ.id } });
  const acmeDiv3 = await prisma.orgUnit.create({ data: { name: 'Division 3', tenantId: tenantA.id, parentOrgUnitId: acmeHQ.id } });
  const acmeDeptA = await prisma.orgUnit.create({ data: { name: 'Dept A', tenantId: tenantA.id, parentOrgUnitId: acmeDiv1.id } });
  const acmeDeptB = await prisma.orgUnit.create({ data: { name: 'Dept B', tenantId: tenantA.id, parentOrgUnitId: acmeDiv1.id } });
  const acmeDeptC = await prisma.orgUnit.create({ data: { name: 'Dept C', tenantId: tenantA.id, parentOrgUnitId: acmeDiv2.id } });
  const acmeDeptD = await prisma.orgUnit.create({ data: { name: 'Dept D', tenantId: tenantA.id, parentOrgUnitId: acmeDiv2.id } });
  const acmeTeam1 = await prisma.orgUnit.create({ data: { name: 'Team 1', tenantId: tenantA.id, parentOrgUnitId: acmeDeptA.id } });
  const acmeTeam2 = await prisma.orgUnit.create({ data: { name: 'Team 2', tenantId: tenantA.id, parentOrgUnitId: acmeDeptA.id } });
  const acmeTeam3 = await prisma.orgUnit.create({ data: { name: 'Team 3', tenantId: tenantA.id, parentOrgUnitId: acmeDeptB.id } });
  const acmeTeam4 = await prisma.orgUnit.create({ data: { name: 'Team 4', tenantId: tenantA.id, parentOrgUnitId: acmeDeptC.id } });
  const acmeTeam5 = await prisma.orgUnit.create({ data: { name: 'Team 5', tenantId: tenantA.id, parentOrgUnitId: acmeDeptD.id } });
  const acmeTeam6 = await prisma.orgUnit.create({ data: { name: 'Team 6', tenantId: tenantA.id, parentOrgUnitId: acmeDeptD.id } });
  const globexHQ = await prisma.orgUnit.create({ data: { name: 'HQ', tenantId: tenantB.id } });

  // Roles (expanded hierarchy)
  // Top-down: CEO > President > VP > Director > Senior Manager > Manager > Supervisor > Lead > Senior > Employee > Intern
  const acmeCEO = await prisma.role.create({ data: { name: 'CEO', tenantId: tenantA.id } });
  const acmePresident = await prisma.role.create({ data: { name: 'President', tenantId: tenantA.id, parentRoleId: acmeCEO.id } });
  const acmeVP = await prisma.role.create({ data: { name: 'VP', tenantId: tenantA.id, parentRoleId: acmePresident.id } });
  const acmeDirector = await prisma.role.create({ data: { name: 'Director', tenantId: tenantA.id, parentRoleId: acmeVP.id } });
  const acmeSrManager = await prisma.role.create({ data: { name: 'Senior Manager', tenantId: tenantA.id, parentRoleId: acmeDirector.id } });
  const acmeManager = await prisma.role.create({ data: { name: 'Manager', tenantId: tenantA.id, parentRoleId: acmeSrManager.id } });
  const acmeSupervisor = await prisma.role.create({ data: { name: 'Supervisor', tenantId: tenantA.id, parentRoleId: acmeManager.id } });
  const acmeLead = await prisma.role.create({ data: { name: 'Lead', tenantId: tenantA.id, parentRoleId: acmeSupervisor.id } });
  const acmeSenior = await prisma.role.create({ data: { name: 'Senior', tenantId: tenantA.id, parentRoleId: acmeLead.id } });
  const acmeEmployee = await prisma.role.create({ data: { name: 'Employee', tenantId: tenantA.id, parentRoleId: acmeSenior.id } });
  const acmeIntern = await prisma.role.create({ data: { name: 'Intern', tenantId: tenantA.id, parentRoleId: acmeEmployee.id } });

  // Permissions (fine-grained)
  const perms = [
    { name: 'system_admin', resource: 'system', action: 'admin', tenantId: tenantA.id },
    { name: 'manage_users', resource: 'user', action: 'manage', tenantId: tenantA.id },
    { name: 'manage_roles', resource: 'role', action: 'manage', tenantId: tenantA.id },
    { name: 'view_audit_logs', resource: 'audit', action: 'view', tenantId: tenantA.id },
    { name: 'view_reports', resource: 'report', action: 'view', tenantId: tenantA.id },
    { name: 'edit_sales', resource: 'sales', action: 'edit', tenantId: tenantA.id },
    { name: 'view_sales', resource: 'sales', action: 'view', tenantId: tenantA.id },
    { name: 'manage_inventory', resource: 'inventory', action: 'manage', tenantId: tenantA.id },
    { name: 'view_inventory', resource: 'inventory', action: 'view', tenantId: tenantA.id },
    { name: 'support_ticket', resource: 'support', action: 'respond', tenantId: tenantA.id },
    { name: 'basic_access', resource: 'system', action: 'access', tenantId: tenantA.id },
  ];
  await prisma.permission.createMany({ data: perms });
  const allPerms = await prisma.permission.findMany({ where: { tenantId: tenantA.id } });

  // Assign permissions to roles (higher roles inherit all below)
  // CEO: all permissions
  for (const perm of allPerms) {
    await prisma.rolePermission.create({ data: { roleId: acmeCEO.id, permissionId: perm.id, tenantId: tenantA.id } });
  }
  // VP: all except system_admin
  for (const perm of allPerms.filter(p => p.name !== 'system_admin')) {
    await prisma.rolePermission.create({ data: { roleId: acmeVP.id, permissionId: perm.id, tenantId: tenantA.id } });
  }
  // Director: manage_users, manage_roles, view_audit_logs, view_reports, edit_sales, view_sales, manage_inventory, view_inventory
  for (const perm of allPerms.filter(p => ['manage_users','manage_roles','view_audit_logs','view_reports','edit_sales','view_sales','manage_inventory','view_inventory'].includes(p.name))) {
    await prisma.rolePermission.create({ data: { roleId: acmeDirector.id, permissionId: perm.id, tenantId: tenantA.id } });
  }
  // Manager: view_reports, edit_sales, view_sales, manage_inventory, view_inventory
  for (const perm of allPerms.filter(p => ['view_reports','edit_sales','view_sales','manage_inventory','view_inventory'].includes(p.name))) {
    await prisma.rolePermission.create({ data: { roleId: acmeManager.id, permissionId: perm.id, tenantId: tenantA.id } });
  }
  // Supervisor: view_sales, view_inventory, support_ticket
  for (const perm of allPerms.filter(p => ['view_sales','view_inventory','support_ticket'].includes(p.name))) {
    await prisma.rolePermission.create({ data: { roleId: acmeSupervisor.id, permissionId: perm.id, tenantId: tenantA.id } });
  }
  // Lead: view_sales, view_inventory
  for (const perm of allPerms.filter(p => ['view_sales','view_inventory'].includes(p.name))) {
    await prisma.rolePermission.create({ data: { roleId: acmeLead.id, permissionId: perm.id, tenantId: tenantA.id } });
  }
  // Senior: view_sales
  for (const perm of allPerms.filter(p => p.name === 'view_sales')) {
    await prisma.rolePermission.create({ data: { roleId: acmeSenior.id, permissionId: perm.id, tenantId: tenantA.id } });
  }
  // Employee: view_inventory
  for (const perm of allPerms.filter(p => p.name === 'view_inventory')) {
    await prisma.rolePermission.create({ data: { roleId: acmeEmployee.id, permissionId: perm.id, tenantId: tenantA.id } });
  }
  // Intern: basic_access
  for (const perm of allPerms.filter(p => p.name === 'basic_access')) {
    await prisma.rolePermission.create({ data: { roleId: acmeIntern.id, permissionId: perm.id, tenantId: tenantA.id } });
  }

  // Example users (expanded)
  const ceo = await prisma.user.create({ data: { email: 'ceo@acme.com', password: 'hashed', name: 'Acme CEO', tenantId: tenantA.id } });
  const president = await prisma.user.create({ data: { email: 'president@acme.com', password: 'hashed', name: 'Acme President', tenantId: tenantA.id } });
  const vp = await prisma.user.create({ data: { email: 'vp@acme.com', password: 'hashed', name: 'Acme VP', tenantId: tenantA.id } });
  const director = await prisma.user.create({ data: { email: 'director@acme.com', password: 'hashed', name: 'Acme Director', tenantId: tenantA.id } });
  const srManager = await prisma.user.create({ data: { email: 'srmanager@acme.com', password: 'hashed', name: 'Acme Senior Manager', tenantId: tenantA.id } });
  const manager = await prisma.user.create({ data: { email: 'manager@acme.com', password: 'hashed', name: 'Acme Manager', tenantId: tenantA.id } });
  const supervisor = await prisma.user.create({ data: { email: 'supervisor@acme.com', password: 'hashed', name: 'Acme Supervisor', tenantId: tenantA.id } });
  const lead = await prisma.user.create({ data: { email: 'lead@acme.com', password: 'hashed', name: 'Acme Lead', tenantId: tenantA.id } });
  const senior = await prisma.user.create({ data: { email: 'senior@acme.com', password: 'hashed', name: 'Acme Senior', tenantId: tenantA.id } });
  const employee = await prisma.user.create({ data: { email: 'employee@acme.com', password: 'hashed', name: 'Acme Employee', tenantId: tenantA.id } });
  const intern = await prisma.user.create({ data: { email: 'intern@acme.com', password: 'hashed', name: 'Acme Intern', tenantId: tenantA.id } });

  // Assign roles to users (optionally scoped to org units)
  await prisma.userRole.create({ data: { userId: ceo.id, roleId: acmeCEO.id, tenantId: tenantA.id, orgUnitId: acmeHQ.id } });
  await prisma.userRole.create({ data: { userId: president.id, roleId: acmePresident.id, tenantId: tenantA.id, orgUnitId: acmeHQ.id } });
  await prisma.userRole.create({ data: { userId: vp.id, roleId: acmeVP.id, tenantId: tenantA.id, orgUnitId: acmeDiv1.id } });
  await prisma.userRole.create({ data: { userId: director.id, roleId: acmeDirector.id, tenantId: tenantA.id, orgUnitId: acmeDiv1.id } });
  await prisma.userRole.create({ data: { userId: srManager.id, roleId: acmeSrManager.id, tenantId: tenantA.id, orgUnitId: acmeDiv2.id } });
  await prisma.userRole.create({ data: { userId: manager.id, roleId: acmeManager.id, tenantId: tenantA.id, orgUnitId: acmeDeptA.id } });
  await prisma.userRole.create({ data: { userId: supervisor.id, roleId: acmeSupervisor.id, tenantId: tenantA.id, orgUnitId: acmeDeptB.id } });
  await prisma.userRole.create({ data: { userId: lead.id, roleId: acmeLead.id, tenantId: tenantA.id, orgUnitId: acmeTeam1.id } });
  await prisma.userRole.create({ data: { userId: senior.id, roleId: acmeSenior.id, tenantId: tenantA.id, orgUnitId: acmeTeam3.id } });
  await prisma.userRole.create({ data: { userId: employee.id, roleId: acmeEmployee.id, tenantId: tenantA.id, orgUnitId: acmeTeam4.id } });
  await prisma.userRole.create({ data: { userId: intern.id, roleId: acmeIntern.id, tenantId: tenantA.id, orgUnitId: acmeTeam5.id } });

  // Repeat for Globex Inc (tenantB) as needed...
}


main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
