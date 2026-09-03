-- Document numbers may identify a family of controlled documents and are therefore reusable.
DROP INDEX IF EXISTS "softcopy_documents_document_number_key";

ALTER TABLE "softcopy_documents" ADD COLUMN IF NOT EXISTS "series_number" VARCHAR(50);

-- Derive the stored series for existing records without changing any revision history.
UPDATE "softcopy_documents" softcopy
SET "series_number" = COALESCE(
  (SELECT revision."series_number"
   FROM "document_revisions" revision
   WHERE revision."revision_id" = softcopy."current_revision_id"),
  (SELECT revision."series_number"
   FROM "document_revisions" revision
   WHERE revision."softcopy_id" = softcopy."softcopy_id"
     AND revision."series_number" IS NOT NULL
   ORDER BY revision."created_at" DESC
   LIMIT 1)
)
WHERE softcopy."series_number" IS NULL;

-- Existing legacy rows are preserved. New writes are validated by the API and the trigger below.
CREATE INDEX IF NOT EXISTS "softcopy_documents_document_number_idx"
  ON "softcopy_documents" (LOWER(BTRIM("document_number")));

CREATE INDEX IF NOT EXISTS "softcopy_documents_document_series_idx"
  ON "softcopy_documents" (LOWER(BTRIM("document_number")), LOWER(BTRIM("series_number")));

CREATE OR REPLACE FUNCTION prevent_duplicate_document_series()
RETURNS TRIGGER AS $$
DECLARE
  target_document_number TEXT;
BEGIN
  IF NEW."series_number" IS NULL OR BTRIM(NEW."series_number") = '' THEN
    RETURN NEW;
  END IF;

  SELECT "document_number" INTO target_document_number
  FROM "softcopy_documents"
  WHERE "softcopy_id" = NEW."softcopy_id";

  IF target_document_number IS NOT NULL AND EXISTS (
    SELECT 1
    FROM "document_revisions" existing_revision
    JOIN "softcopy_documents" existing_document
      ON existing_document."softcopy_id" = existing_revision."softcopy_id"
    WHERE existing_revision."revision_id" <> NEW."revision_id"
      AND LOWER(BTRIM(existing_document."document_number")) = LOWER(BTRIM(target_document_number))
      AND LOWER(BTRIM(existing_revision."series_number")) = LOWER(BTRIM(NEW."series_number"))
  ) THEN
    RAISE EXCEPTION 'Series Number % is already used for Document Number %', NEW."series_number", target_document_number
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "document_revision_unique_document_series" ON "document_revisions";
CREATE TRIGGER "document_revision_unique_document_series"
BEFORE INSERT OR UPDATE OF "softcopy_id", "series_number" ON "document_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_document_series();

CREATE OR REPLACE FUNCTION prevent_document_number_series_collision()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."document_number" IS NULL OR BTRIM(NEW."document_number") = '' THEN
    RETURN NEW;
  END IF;

  IF NEW."series_number" IS NOT NULL AND BTRIM(NEW."series_number") <> '' AND EXISTS (
    SELECT 1
    FROM "softcopy_documents" other_document
    WHERE other_document."softcopy_id" <> NEW."softcopy_id"
      AND LOWER(BTRIM(other_document."document_number")) = LOWER(BTRIM(NEW."document_number"))
      AND LOWER(BTRIM(other_document."series_number")) = LOWER(BTRIM(NEW."series_number"))
  ) THEN
    RAISE EXCEPTION 'Series Number % is already used for Document Number %', NEW."series_number", NEW."document_number"
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "document_revisions" own_revision
    JOIN "document_revisions" other_revision
      ON LOWER(BTRIM(other_revision."series_number")) = LOWER(BTRIM(own_revision."series_number"))
    JOIN "softcopy_documents" other_document
      ON other_document."softcopy_id" = other_revision."softcopy_id"
    WHERE own_revision."softcopy_id" = NEW."softcopy_id"
      AND other_document."softcopy_id" <> NEW."softcopy_id"
      AND LOWER(BTRIM(other_document."document_number")) = LOWER(BTRIM(NEW."document_number"))
  ) THEN
    RAISE EXCEPTION 'Changing this Document Number would duplicate an existing Document Number and Series Number pair'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "softcopy_document_unique_series_on_number_change" ON "softcopy_documents";
CREATE TRIGGER "softcopy_document_unique_series_on_number_change"
BEFORE INSERT OR UPDATE OF "document_number", "series_number" ON "softcopy_documents"
FOR EACH ROW EXECUTE FUNCTION prevent_document_number_series_collision();
