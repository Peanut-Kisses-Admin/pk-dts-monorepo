ALTER TABLE "locations" ADD COLUMN "specific_id" BIGINT;

UPDATE "locations" AS location
SET "specific_id" = asset."specific_id"
FROM "asset_numbers" AS asset
WHERE location."asset_id" = asset."asset_id";

CREATE INDEX "locations_specific_id_idx" ON "locations"("specific_id");

ALTER TABLE "locations"
ADD CONSTRAINT "locations_specific_id_fkey"
FOREIGN KEY ("specific_id") REFERENCES "specifics"("specific_id")
ON DELETE SET NULL ON UPDATE CASCADE;
