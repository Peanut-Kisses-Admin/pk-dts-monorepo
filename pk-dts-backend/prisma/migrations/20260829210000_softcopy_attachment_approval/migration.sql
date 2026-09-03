CREATE TYPE "SoftcopyAttachmentStatus" AS ENUM ('PendingApproval', 'Approved', 'Rejected', 'Cancelled');

ALTER TABLE "softcopy_attachments"
  ADD COLUMN "status" "SoftcopyAttachmentStatus" NOT NULL DEFAULT 'PendingApproval',
  ADD COLUMN "approved_by_user_id" BIGINT,
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "rejected_by_user_id" BIGINT,
  ADD COLUMN "rejected_at" TIMESTAMP(3),
  ADD COLUMN "rejection_reason" TEXT;

UPDATE "softcopy_attachments" AS a
SET "status" = 'Approved'
FROM "softcopy_documents" AS s
JOIN "documents" AS d ON d."document_id" = s."document_id"
WHERE a."softcopy_id" = s."softcopy_id"
  AND d."status" IN ('Approved', 'Completed');

ALTER TABLE "softcopy_attachments"
  ADD CONSTRAINT "softcopy_attachments_approved_by_user_id_fkey"
    FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "softcopy_attachments_rejected_by_user_id_fkey"
    FOREIGN KEY ("rejected_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "softcopy_attachments_softcopy_id_status_idx"
  ON "softcopy_attachments"("softcopy_id", "status");
