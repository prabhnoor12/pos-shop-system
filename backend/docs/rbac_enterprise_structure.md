# Enterprise RBAC Structure for Multi-Tenant Organizations

## 1. Role Hierarchy Example

- shareholder
- board_chairman
- board_director
- ceo
- c-suite (cfo, coo, cto, cmo, chro, clo, etc.)
- evp / svp
- vp
- director
- manager
- team_lead
- specialist / analyst
- associate / coordinator / staff
- frontline_employee

Roles can inherit permissions from roles below them.

## 2. Example Data Model (Prisma/SQL)

```prisma
model Role {
  id           Int      @id @default(autoincrement())
  name         String
  parentRoleId Int?     // For hierarchy
  tenantId     Int
  parentRole   Role?    @relation("RoleHierarchy", fields: [parentRoleId], references: [id])
  children     Role[]   @relation("RoleHierarchy")
  userRoles    UserRole[]
  rolePermissions RolePermission[]
}

model UserRole {
  id        Int   @id @default(autoincrement())
  userId    Int
  roleId    Int
  orgUnitId Int? // For org structure
  tenantId  Int
  validFrom DateTime?
  validTo   DateTime?
  user      User  @relation(fields: [userId], references: [id])
  role      Role  @relation(fields: [roleId], references: [id])
}

model Permission {
  id         Int    @id @default(autoincrement())
  name       String
  resource   String?
  action     String?
  tenantId   Int
  rolePermissions RolePermission[]
}

model RolePermission {
  id           Int   @id @default(autoincrement())
  roleId       Int
  permissionId Int
  tenantId     Int
  role         Role        @relation(fields: [roleId], references: [id])
  permission   Permission  @relation(fields: [permissionId], references: [id])
}

model OrgUnit {
  id             Int      @id @default(autoincrement())
  name           String
  parentOrgUnitId Int?
  tenantId       Int
  parentOrgUnit  OrgUnit? @relation("OrgUnitHierarchy", fields: [parentOrgUnitId], references: [id])
  children       OrgUnit[] @relation("OrgUnitHierarchy")
  userOrgUnits   UserOrgUnit[]
}

model UserOrgUnit {
  id        Int   @id @default(autoincrement())
  userId    Int
  orgUnitId Int
  tenantId  Int
  user      User  @relation(fields: [userId], references: [id])
  orgUnit   OrgUnit @relation(fields: [orgUnitId], references: [id])
}
```

## 3. Middleware/Logic Extension Points
- When checking permissions, traverse up the role and org unit hierarchies.
- Allow for temporary delegation (validFrom/validTo).
- All checks are tenant-specific.

## 4. Example Usage
- Assign a user as `vp_marketing` for EMEA org unit in tenant 1.
- That user inherits all permissions of `vp_marketing` and any roles below in the hierarchy, scoped to EMEA.

## 5. Matrix/Hybrid Support
- Users can have multiple UserRole and UserOrgUnit assignments.
- Middleware can aggregate permissions from all relevant roles/org units.

---

This structure supports Fortune 1000-style, deeply hierarchical, and multi-dimensional organizations for robust, flexible RBAC.
