-- Hardcopy records are identified by title/name and storage classification.
-- Keep documents.document_number for Softcopy records, but clear it from every
-- existing Hardcopy record without deleting any document or storage data.
UPDATE "documents" AS d
SET "document_number" = NULL
FROM "hardcopy_documents" AS h
WHERE h."document_id" = d."document_id"
  AND d."document_number" IS NOT NULL;
