CREATE TYPE "DisposalRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

CREATE TABLE "document_disposal_requests" (
  "disposal_request_id" BIGSERIAL PRIMARY KEY,
  "document_id" BIGINT NOT NULL REFERENCES "documents"("document_id") ON DELETE CASCADE,
  "requested_by_user_id" BIGINT NOT NULL REFERENCES "users"("user_id") ON DELETE RESTRICT,
  "disposal_remarks" TEXT NOT NULL,
  "status" "DisposalRequestStatus" NOT NULL DEFAULT 'Pending',
  "reviewed_by_user_id" BIGINT REFERENCES "users"("user_id") ON DELETE SET NULL,
  "reviewer_remarks" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "document_disposal_requests_status_created_at_idx" ON "document_disposal_requests"("status", "created_at");
CREATE INDEX "document_disposal_requests_document_id_status_idx" ON "document_disposal_requests"("document_id", "status");
