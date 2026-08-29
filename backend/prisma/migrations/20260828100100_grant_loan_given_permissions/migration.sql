-- Wire the Loans & Advances Given permissions into the roles that need them,
-- so an already-seeded database picks up the new module without a full
-- re-seed. The seed does the same thing idempotently for fresh databases.
--
-- The permission rows themselves are inserted first: an existing database
-- has never heard of these names, and granting a permission that does not
-- exist yet silently does nothing.

INSERT INTO "permissions" ("id", "name", "description")
SELECT gen_random_uuid(), v."name", v."description"
FROM (VALUES
  ('loan_given.view', 'View Loans & Advances Given'),
  ('loan_given.create', 'Record money lent out'),
  ('loan_given.edit', 'Edit a loan given / record a repayment / write one off'),
  ('loan_given.delete', 'Delete a loan given')
) AS v("name", "description")
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."name" = v."name");

-- Lending business money out is a finance decision, so it follows the same
-- roles that already run Loans & EMI end to end.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING_MANAGER', 'FINANCE_MANAGER')
  AND p."name" IN ('loan_given.view', 'loan_given.create', 'loan_given.edit', 'loan_given.delete')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Everyone else who can see the books can see what is owed back, but cannot
-- lend money out or write it off.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('ACCOUNTS_EXECUTIVE', 'AUDITOR', 'VIEWER', 'MANAGER', 'OPERATION_MANAGER')
  AND p."name" = 'loan_given.view'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
