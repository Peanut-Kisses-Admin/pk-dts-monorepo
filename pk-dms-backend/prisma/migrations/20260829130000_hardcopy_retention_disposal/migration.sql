DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisposalAction') THEN
    CREATE TYPE "DisposalAction" AS ENUM ('Shred', 'Scratch', 'Reuse', 'Other');
  END IF;
END $$;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "disposal_action" "DisposalAction",
  ADD COLUMN IF NOT EXISTS "disposal_action_other" VARCHAR(150);

ALTER TABLE "document_disposal_requests"
  ADD COLUMN IF NOT EXISTS "disposal_action" "DisposalAction" NOT NULL DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS "disposal_action_other" VARCHAR(150);

ALTER TABLE "hardcopy_documents"
  ADD COLUMN IF NOT EXISTS "retention_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "retention_start_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retention_end_date" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "hardcopy_documents_retention_enabled_retention_end_date_idx"
  ON "hardcopy_documents" ("retention_enabled", "retention_end_date");
