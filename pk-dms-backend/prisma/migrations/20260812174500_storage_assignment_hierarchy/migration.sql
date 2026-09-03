ALTER TABLE "asset_numbers" ADD COLUMN "specific_id" BIGINT;
ALTER TABLE "locations" ADD COLUMN "asset_id" BIGINT;

UPDATE "asset_numbers" a
SET "specific_id" = source."specific_id"
FROM (
  SELECT "asset_id", MIN("specific_id") AS "specific_id"
  FROM "hardcopy_documents"
  WHERE "asset_id" IS NOT NULL AND "specific_id" IS NOT NULL
  GROUP BY "asset_id"
) source
WHERE a."asset_id" = source."asset_id";

UPDATE "locations" l
SET "asset_id" = source."asset_id"
FROM (
  SELECT "location_id", MIN("asset_id") AS "asset_id"
  FROM "hardcopy_documents"
  WHERE "location_id" IS NOT NULL AND "asset_id" IS NOT NULL
  GROUP BY "location_id"
) source
WHERE l."location_id" = source."location_id";

CREATE INDEX "asset_numbers_specific_id_idx" ON "asset_numbers"("specific_id");
CREATE INDEX "locations_asset_id_idx" ON "locations"("asset_id");
ALTER TABLE "asset_numbers" ADD CONSTRAINT "asset_numbers_specific_id_fkey" FOREIGN KEY ("specific_id") REFERENCES "specifics"("specific_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "locations" ADD CONSTRAINT "locations_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset_numbers"("asset_id") ON DELETE SET NULL ON UPDATE CASCADE;
