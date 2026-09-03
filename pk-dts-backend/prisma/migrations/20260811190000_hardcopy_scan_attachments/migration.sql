CREATE TABLE "hardcopy_attachments" (
    "attachment_id" BIGSERIAL NOT NULL,
    "hardcopy_id" BIGINT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" BIGINT,
    "mime_type" VARCHAR(100),
    "uploaded_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hardcopy_attachments_pkey" PRIMARY KEY ("attachment_id")
);

CREATE INDEX "hardcopy_attachments_hardcopy_id_created_at_idx"
ON "hardcopy_attachments"("hardcopy_id", "created_at");

ALTER TABLE "hardcopy_attachments" ADD CONSTRAINT "hardcopy_attachments_hardcopy_id_fkey"
FOREIGN KEY ("hardcopy_id") REFERENCES "hardcopy_documents"("hardcopy_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "hardcopy_attachments" ADD CONSTRAINT "hardcopy_attachments_uploaded_by_fkey"
FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
