-- Booking detail becomes optional so staff can save a partial booking and
-- fill it in as the information arrives. Widening only — every existing row
-- keeps its value, and nothing here can fail on existing data.
--
-- The public website intake still requires these fields at the validator; the
-- constraint is dropped at the database so the authenticated counter form can
-- leave them unset, not so the open endpoint can.
-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "customerName" DROP NOT NULL,
ALTER COLUMN "mobile" DROP NOT NULL,
ALTER COLUMN "pickupAddress" DROP NOT NULL,
ALTER COLUMN "deliveryAddress" DROP NOT NULL,
ALTER COLUMN "fromPlace" DROP NOT NULL,
ALTER COLUMN "toPlace" DROP NOT NULL,
ALTER COLUMN "parcelType" DROP NOT NULL,
ALTER COLUMN "packages" DROP NOT NULL,
ALTER COLUMN "weight" DROP NOT NULL,
ALTER COLUMN "vehicleTypeRequested" DROP NOT NULL,
ALTER COLUMN "pickupDate" DROP NOT NULL;
