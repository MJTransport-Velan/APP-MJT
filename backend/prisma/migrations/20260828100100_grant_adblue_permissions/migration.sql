-- Wire the AdBlue permissions into the roles that need them, so an
-- already-seeded database picks up the new module without a full re-seed.
-- The seed does the same thing idempotently for fresh databases.
--
-- The permission rows themselves are inserted first: an existing database
-- has never heard of these names, and granting a permission that does not
-- exist yet silently does nothing.
--
-- Two prefixes on purpose. adblue_entry.* is recording a top-up, which is
-- an operator's job; adblue_stock.* is buying and valuing the yard store,
-- which moves money — the same split the diesel card account has between
-- fuel_entry.* and fuel_card_account.*.

INSERT INTO "permissions" ("id", "name", "description")
SELECT gen_random_uuid(), v."name", v."description"
FROM (VALUES
  ('adblue_entry.view', 'View AdBlue Entries'),
  ('adblue_entry.create', 'Create AdBlue Entries'),
  ('adblue_entry.edit', 'Edit AdBlue Entries'),
  ('adblue_entry.delete', 'Delete AdBlue Entries'),
  ('adblue_stock.view', 'View the AdBlue store & its movements'),
  ('adblue_stock.edit', 'Purchase AdBlue stock / Return to supplier / Adjust / Edit a movement'),
  ('adblue_stock.delete', 'Delete an AdBlue stock movement')
) AS v("name", "description")
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."name" = v."name");

-- The roles that already run diesel and the FASTag wallet end to end run
-- AdBlue the same way.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER')
  AND p."name" IN (
    'adblue_entry.view', 'adblue_entry.create', 'adblue_entry.edit', 'adblue_entry.delete',
    'adblue_stock.view', 'adblue_stock.edit', 'adblue_stock.delete'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Fleet operators record top-ups the same way they record fills, but do not
-- buy or value stock.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('OWN_FLEET_OPERATOR', 'MARKET_FLEET_OPERATOR')
  AND p."name" IN ('adblue_entry.view', 'adblue_entry.create')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Everyone else who can already see fleet costs can read the top-ups and
-- what is on the shelf, but cannot move stock or money.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('ACCOUNTING_MANAGER', 'FINANCE_MANAGER', 'ACCOUNTS_EXECUTIVE', 'AUDITOR', 'VIEWER', 'MANAGER', 'OPERATION_MANAGER')
  AND p."name" IN ('adblue_entry.view', 'adblue_stock.view')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
