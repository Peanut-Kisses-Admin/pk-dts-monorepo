ALTER TABLE "hardcopy_transfer_requests"
  ADD COLUMN IF NOT EXISTS "from_area_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "from_specific_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "from_asset_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "from_location_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "from_sequence_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "destination_area_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "destination_specific_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "destination_asset_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "destination_location_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "destination_sequence_id" BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hardcopy_transfer_requests_from_area_id_fkey') THEN
    ALTER TABLE "hardcopy_transfer_requests" ADD CONSTRAINT "hardcopy_transfer_requests_from_area_id_fkey"
      FOREIGN KEY ("from_area_id") REFERENCES "areas"("area_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hardcopy_transfer_requests_from_specific_id_fkey') THEN
    ALTER TABLE "hardcopy_transfer_requests" ADD CONSTRAINT "hardcopy_transfer_requests_from_specific_id_fkey"
      FOREIGN KEY ("from_specific_id") REFERENCES "specifics"("specific_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hardcopy_transfer_requests_from_asset_id_fkey') THEN
    ALTER TABLE "hardcopy_transfer_requests" ADD CONSTRAINT "hardcopy_transfer_requests_from_asset_id_fkey"
      FOREIGN KEY ("from_asset_id") REFERENCES "asset_numbers"("asset_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hardcopy_transfer_requests_from_location_id_fkey') THEN
    ALTER TABLE "hardcopy_transfer_requests" ADD CONSTRAINT "hardcopy_transfer_requests_from_location_id_fkey"
      FOREIGN KEY ("from_location_id") REFERENCES "locations"("location_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hardcopy_transfer_requests_from_sequence_id_fkey') THEN
    ALTER TABLE "hardcopy_transfer_requests" ADD CONSTRAINT "hardcopy_transfer_requests_from_sequence_id_fkey"
      FOREIGN KEY ("from_sequence_id") REFERENCES "sequences"("sequence_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hardcopy_transfer_requests_destination_area_id_fkey') THEN
    ALTER TABLE "hardcopy_transfer_requests" ADD CONSTRAINT "hardcopy_transfer_requests_destination_area_id_fkey"
      FOREIGN KEY ("destination_area_id") REFERENCES "areas"("area_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hardcopy_transfer_requests_destination_specific_id_fkey') THEN
    ALTER TABLE "hardcopy_transfer_requests" ADD CONSTRAINT "hardcopy_transfer_requests_destination_specific_id_fkey"
      FOREIGN KEY ("destination_specific_id") REFERENCES "specifics"("specific_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hardcopy_transfer_requests_destination_asset_id_fkey') THEN
    ALTER TABLE "hardcopy_transfer_requests" ADD CONSTRAINT "hardcopy_transfer_requests_destination_asset_id_fkey"
      FOREIGN KEY ("destination_asset_id") REFERENCES "asset_numbers"("asset_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hardcopy_transfer_requests_destination_location_id_fkey') THEN
    ALTER TABLE "hardcopy_transfer_requests" ADD CONSTRAINT "hardcopy_transfer_requests_destination_location_id_fkey"
      FOREIGN KEY ("destination_location_id") REFERENCES "locations"("location_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hardcopy_transfer_requests_destination_sequence_id_fkey') THEN
    ALTER TABLE "hardcopy_transfer_requests" ADD CONSTRAINT "hardcopy_transfer_requests_destination_sequence_id_fkey"
      FOREIGN KEY ("destination_sequence_id") REFERENCES "sequences"("sequence_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "hardcopy_transfer_requests_destination_location_id_idx"
  ON "hardcopy_transfer_requests"("destination_location_id");
