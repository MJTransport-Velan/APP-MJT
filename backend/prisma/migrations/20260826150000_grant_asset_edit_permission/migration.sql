-- Fixed Asset editing was unreachable for every role.
--
-- 'asset.edit' guards PUT /accounts/assets/:id and is listed in the seed's
-- VEHICLE_ASSET_PERMISSIONS, which ADMIN is granted wholesale — but the
-- permission was added to that array after this database had already been
-- seeded, and role grants only run on a re-seed. The row existed with no
-- role holding it, so an ADMIN who could create and delete a fixed asset
-- got a 403 the moment they tried to edit one.
--
-- Granted to exactly the roles that already hold asset.create/asset.delete.

INSERT INTO "permissions" ("id", "name", "description")
SELECT gen_random_uuid(), 'asset.edit', 'Edit a Fixed Asset register entry'
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "name" = 'asset.edit');

INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('SUPER_ADMIN', 'ADMIN')
  AND p."name" = 'asset.edit'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
