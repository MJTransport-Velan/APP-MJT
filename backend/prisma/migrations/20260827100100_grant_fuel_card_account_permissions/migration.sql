-- Wire the Diesel Card account permissions into the roles that need them,
-- so an already-seeded database picks up the new module without a full
-- re-seed. The seed does the same thing idempotently for fresh databases.
--
-- The permission rows themselves are inserted first: an existing database
-- has never heard of these names, and granting a permission that does not
-- exist yet silently does nothing.

INSERT INTO "permissions" ("id", "name", "description")
SELECT gen_random_uuid(), v."name", v."description"
FROM (VALUES
  ('fuel_card_account.view', 'View the Diesel Card account & its transactions'),
  ('fuel_card_account.edit', 'Recharge the Diesel Card account / Refund / Adjust / Edit a transaction'),
  ('fuel_card_account.delete', 'Delete a Diesel Card transaction')
) AS v("name", "description")
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."name" = v."name");

-- The roles that already run the FASTag wallet end to end run this account
-- the same way — it is the same kind of shared prepaid balance.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER')
  AND p."name" IN ('fuel_card_account.view', 'fuel_card_account.edit', 'fuel_card_account.delete')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );

-- Everyone else who can already see fleet costs can read the balance, but
-- cannot move money on or off the card account.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('ACCOUNTING_MANAGER', 'FINANCE_MANAGER', 'ACCOUNTS_EXECUTIVE', 'AUDITOR', 'VIEWER', 'MANAGER', 'OPERATION_MANAGER')
  AND p."name" = 'fuel_card_account.view'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
