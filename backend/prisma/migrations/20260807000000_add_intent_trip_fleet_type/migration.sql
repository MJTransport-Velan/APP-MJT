-- AlterTable
ALTER TABLE "intents" ADD COLUMN     "fleetType" "VehicleOwnership";

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "fleetType" "VehicleOwnership";
