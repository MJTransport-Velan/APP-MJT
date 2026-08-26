-- Wire the Loans & EMI permissions into the roles that need them, so an
-- already-seeded database picks up the new module without a full re-seed.
-- The seed does the same thing idempotently for fresh databases.

-- SUPER_ADMIN holds every permission by definition.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" = 'SUPER_ADMIN'
  AND p."name" IN ('loan.view', 'loan.create', 'loan.edit', 'loan.delete', 'loan_emi.pay', 'loan_emi.reverse')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Finance sign-off roles get the full module.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('ACCOUNTING_MANAGER', 'FINANCE_MANAGER')
  AND p."name" IN ('loan.view', 'loan.create', 'loan.edit', 'loan.delete', 'loan_emi.pay', 'loan_emi.reverse')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Day-to-day operators record EMI payments but do not create or delete loans.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" = 'ACCOUNTS_EXECUTIVE'
  AND p."name" IN ('loan.view', 'loan_emi.pay')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Read-only oversight roles.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('AUDITOR', 'VIEWER', 'MANAGER', 'OPERATION_MANAGER')
  AND p."name" = 'loan.view'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
