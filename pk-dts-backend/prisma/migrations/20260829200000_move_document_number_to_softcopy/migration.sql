-- Document Number belongs only to the controlled Softcopy record.
ALTER TABLE "softcopy_documents"
  ADD COLUMN IF NOT EXISTS "document_number" VARCHAR(100);

UPDATE "softcopy_documents" AS softcopy
SET "document_number" = document."document_number"
FROM "documents" AS document
WHERE softcopy."document_id" = document."document_id"
  AND document."document_number" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "softcopy_documents_document_number_key"
  ON "softcopy_documents" ("document_number");

ALTER TABLE "documents"
  DROP CONSTRAINT IF EXISTS "documents_document_number_key";

DROP INDEX IF EXISTS "documents_document_number_key";

ALTER TABLE "documents"
  DROP COLUMN IF EXISTS "document_number";
