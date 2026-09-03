CREATE TABLE "softcopy_attachments" (
    "attachment_id" BIGSERIAL NOT NULL,
    "softcopy_id" BIGINT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" BIGINT,
    "mime_type" VARCHAR(100),
    "uploaded_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "softcopy_attachments_pkey" PRIMARY KEY ("attachment_id")
);

CREATE INDEX "softcopy_attachments_softcopy_id_created_at_idx"
ON "softcopy_attachments"("softcopy_id", "created_at");

ALTER TABLE "softcopy_attachments" ADD CONSTRAINT "softcopy_attachments_softcopy_id_fkey"
FOREIGN KEY ("softcopy_id") REFERENCES "softcopy_documents"("softcopy_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "softcopy_attachments" ADD CONSTRAINT "softcopy_attachments_uploaded_by_fkey"
FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
