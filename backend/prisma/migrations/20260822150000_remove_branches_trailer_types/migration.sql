-- Remove the Branches and Trailer Types master modules.
--
-- Both tables were leaves: `branches` was referenced only by its own
-- `companyId` FK into `companies`, and `trailer_types` was referenced by
-- nothing at all. No other table carries a branchId or trailerTypeId, so
-- dropping them takes no FK with it.
--
-- Destructive: every row in both tables is lost.
DROP TABLE IF EXISTS "branches";
DROP TABLE IF EXISTS "trailer_types";

-- The permissions these modules registered (branch.view/create/edit/delete
-- and trailer_type.*) go with them; role_permissions cascades.
DELETE FROM "permissions" WHERE "name" LIKE 'branch.%' OR "name" LIKE 'trailer\_type.%';
