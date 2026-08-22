-- One vehicle, and one driver, can be on only one live trip at a time.
--
-- trip.service.ts already refused a double-booking, but it checked and then
-- wrote as two separate steps: two allocations arriving at the same instant
-- both saw the asset as free and both succeeded. These partial unique indexes
-- make the rule the database's, so the second writer fails no matter how the
-- application is ordered.
--
-- The predicate mirrors RELEASED_TRIP_STATUSES in trip.repository.ts: a trip
-- that is COMPLETED, CANCELLED, still DRAFT, or already UNLOADING has let go
-- of its vehicle and driver.
CREATE UNIQUE INDEX "trips_active_vehicle_unique"
  ON "trips" ("vehicleId")
  WHERE "vehicleId" IS NOT NULL
    AND "deletedAt" IS NULL
    AND "status" NOT IN ('COMPLETED', 'CANCELLED', 'DRAFT', 'UNLOADING');

CREATE UNIQUE INDEX "trips_active_driver_unique"
  ON "trips" ("driverId")
  WHERE "driverId" IS NOT NULL
    AND "deletedAt" IS NULL
    AND "status" NOT IN ('COMPLETED', 'CANCELLED', 'DRAFT', 'UNLOADING');
