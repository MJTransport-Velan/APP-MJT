-- Wire the Opening Balance & Migration permissions into the roles that need
-- them, so an already-seeded database picks up the new module without a full
-- re-seed. The seed does the same thing idempotently for fresh databases.
--
-- The permission rows themselves are inserted first: an existing database
-- has never heard of these names, and granting a permission that does not
-- exist yet silently does nothing.

INSERT INTO "permissions" ("id", "name", "description")
SELECT gen_random_uuid(), v."name", v."description"
FROM (VALUES
  ('opening_balance.view', 'View Opening Balance & Migration'),
  ('opening_balance.create', 'Record an opening balance brought over from the old system'),
  ('opening_balance.edit', 'Edit / reclassify an opening balance'),
  ('opening_balance.delete', 'Delete an opening balance'),
  ('opening_balance.finalize', 'Finalize or reopen the migration')
) AS v("name", "description")
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."name" = v."name");

-- SUPER_ADMIN holds every permission by definition; ADMIN and the finance
-- sign-off roles own the migration end to end.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING_MANAGER', 'FINANCE_MANAGER')
  AND p."name" IN ('opening_balance.view', 'opening_balance.create', 'opening_balance.edit', 'opening_balance.delete', 'opening_balance.finalize')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Everyone else who can see the books can read the opening position, but
-- cannot change what the business started from.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('ACCOUNTS_EXECUTIVE', 'AUDITOR', 'VIEWER', 'MANAGER', 'OPERATION_MANAGER')
  AND p."name" = 'opening_balance.view'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
