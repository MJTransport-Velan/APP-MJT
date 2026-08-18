-- DropForeignKey
ALTER TABLE "driver_earning_rules" DROP CONSTRAINT "driver_earning_rules_routeId_fkey";

-- DropForeignKey
ALTER TABLE "transport_routes" DROP CONSTRAINT "transport_routes_fromLocationId_fkey";

-- DropForeignKey
ALTER TABLE "transport_routes" DROP CONSTRAINT "transport_routes_toLocationId_fkey";

-- DropForeignKey
ALTER TABLE "trips" DROP CONSTRAINT "trips_routeId_fkey";

-- AlterTable
ALTER TABLE "driver_earning_rules" DROP COLUMN "routeId";

-- AlterTable
ALTER TABLE "trips" DROP COLUMN "routeId";

-- DropTable
DROP TABLE "transport_routes";

