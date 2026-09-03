-- Document Control workflow foundation for the PostgreSQL deployment.
DO $$ BEGIN CREATE TYPE "DocumentBusinessType" AS ENUM ('Forms', 'Manual', 'Procedures', 'WorkInstruction', 'Monitoring', 'Others'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DocumentActionRequested" AS ENUM ('CREATE_REVISE', 'CANCELLATION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DocumentChangeReason" AS ENUM ('Improvement', 'CorrectionOfPreviousReleases', 'Others'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DocumentWorkflowStage" AS ENUM ('DRAFT', 'NOTED_BY', 'PLANT_MANAGER', 'DOCUMENT_CONTROLLER_ADMIN', 'HARDCOPY_APPROVAL', 'COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WorkflowStepStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "HardcopyTransferStatus" AS ENUM ('Draft', 'ForApproval', 'Approved', 'ForTransfer', 'Transferred', 'PendingRecipientAcceptance', 'Completed', 'Returned', 'Rejected', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RecipientAcceptanceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'ForNotedBy';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'ForPlantManagerApproval';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'ForDocumentControllerAdmin';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'ForApproval';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'ForTransfer';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'Transferred';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'PendingRecipientAcceptance';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'Completed';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'ReturnedForCorrection';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'Cancelled';
ALTER TYPE "DocumentAccessRequestStatus" ADD VALUE IF NOT EXISTS 'ForAccessApproval';
ALTER TYPE "DocumentAccessRequestStatus" ADD VALUE IF NOT EXISTS 'AccessGranted';
ALTER TYPE "DocumentAccessRequestStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE "DocumentAccessRequestStatus" ADD VALUE IF NOT EXISTS 'REVOKED';
ALTER TYPE "DocumentAccessRequestStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "leader_id" BIGINT;
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_leader_id_fkey"
    FOREIGN KEY ("leader_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "request_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "department" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "business_document_type" "DocumentBusinessType",
  ADD COLUMN IF NOT EXISTS "action_requested" "DocumentActionRequested" NOT NULL DEFAULT 'CREATE_REVISE',
  ADD COLUMN IF NOT EXISTS "from_party" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "to_party" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "reason_for_change" "DocumentChangeReason",
  ADD COLUMN IF NOT EXISTS "brief_description" TEXT,
  ADD COLUMN IF NOT EXISTS "proposed_change" TEXT,
  ADD COLUMN IF NOT EXISTS "revision_level_from" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "revision_level_to" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "previous_effective_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "new_effective_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "date_received" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "date_released" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approval_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "legacy_imported" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "legacy_import_note" TEXT;

ALTER TABLE "document_access_requests"
  ADD COLUMN IF NOT EXISTS "approver_user_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "approval_stage" VARCHAR(60),
  ADD COLUMN IF NOT EXISTS "granted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
DO $$ BEGIN
  ALTER TABLE "document_access_requests" ADD CONSTRAINT "document_access_requests_approver_user_id_fkey"
    FOREIGN KEY ("approver_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "document_revisions"
  ADD COLUMN IF NOT EXISTS "series_number" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "document_title" VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "revision_level_from" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "revision_level_to" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "previous_effective_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "new_effective_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "date_received" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "date_released" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approval_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "is_current" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "is_historical" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "approved_by_user_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);
UPDATE "document_revisions" AS revision
SET "document_title" = document."document_title"
FROM "softcopy_documents" AS softcopy
JOIN "documents" AS document ON document."document_id" = softcopy."document_id"
WHERE revision."softcopy_id" = softcopy."softcopy_id" AND revision."document_title" = '';
DO $$ BEGIN
  ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_approved_by_user_id_fkey"
    FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "document_workflow_steps" (
  "workflow_step_id" BIGSERIAL PRIMARY KEY,
  "document_id" BIGINT NOT NULL,
  "stage" "DocumentWorkflowStage" NOT NULL,
  "sequence" INTEGER NOT NULL,
  "assigned_user_id" BIGINT,
  "status" "WorkflowStepStatus" NOT NULL DEFAULT 'PENDING',
  "acted_by_user_id" BIGINT,
  "decision" VARCHAR(30),
  "comments" TEXT,
  "acted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_workflow_steps_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_workflow_steps_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "document_workflow_steps_acted_by_user_id_fkey" FOREIGN KEY ("acted_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "document_workflow_steps_document_id_stage_key" UNIQUE ("document_id", "stage")
);
CREATE INDEX IF NOT EXISTS "document_workflow_steps_assigned_user_id_status_idx" ON "document_workflow_steps"("assigned_user_id", "status");

CREATE TABLE IF NOT EXISTS "document_approver_configurations" (
  "approver_configuration_id" BIGSERIAL PRIMARY KEY,
  "document_id" BIGINT NOT NULL UNIQUE,
  "noted_by_user_id" BIGINT,
  "plant_manager_user_id" BIGINT,
  "document_controller_user_id" BIGINT,
  "hardcopy_approver_user_id" BIGINT,
  "access_approver_user_id" BIGINT,
  "document_owner_user_id" BIGINT,
  "configured_by_user_id" BIGINT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_approver_configurations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_approver_configurations_configured_by_user_id_fkey" FOREIGN KEY ("configured_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_approver_configurations_document_owner_user_id_fkey" FOREIGN KEY ("document_owner_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "hardcopy_transfer_requests" (
  "transfer_request_id" BIGSERIAL PRIMARY KEY,
  "document_id" BIGINT NOT NULL,
  "hardcopy_id" BIGINT NOT NULL,
  "document_copy_number" VARCHAR(100) NOT NULL,
  "current_holder" VARCHAR(220),
  "transfer_to" VARCHAR(220) NOT NULL,
  "requested_by_user_id" BIGINT NOT NULL,
  "reason" TEXT NOT NULL,
  "approver_user_id" BIGINT,
  "approval_date" TIMESTAMP(3),
  "transfer_date" TIMESTAMP(3),
  "assigned_recipient_user_id" BIGINT NOT NULL,
  "recipient_acceptance" "RecipientAcceptanceStatus" NOT NULL DEFAULT 'PENDING',
  "accepted_by_user_id" BIGINT,
  "acceptance_at" TIMESTAMP(3),
  "comments" TEXT,
  "status" "HardcopyTransferStatus" NOT NULL DEFAULT 'Draft',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hardcopy_transfer_requests_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hardcopy_transfer_requests_hardcopy_id_fkey" FOREIGN KEY ("hardcopy_id") REFERENCES "hardcopy_documents"("hardcopy_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hardcopy_transfer_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "hardcopy_transfer_requests_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "hardcopy_transfer_requests_assigned_recipient_user_id_fkey" FOREIGN KEY ("assigned_recipient_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "hardcopy_transfer_requests_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "hardcopy_transfer_requests_document_id_status_idx" ON "hardcopy_transfer_requests"("document_id", "status");
CREATE INDEX IF NOT EXISTS "hardcopy_transfer_requests_assigned_recipient_user_id_recipient_acceptance_idx" ON "hardcopy_transfer_requests"("assigned_recipient_user_id", "recipient_acceptance");

CREATE TABLE IF NOT EXISTS "hardcopy_transfer_history" (
  "transfer_history_id" BIGSERIAL PRIMARY KEY,
  "transfer_request_id" BIGINT NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "previous_status" "HardcopyTransferStatus",
  "new_status" "HardcopyTransferStatus" NOT NULL,
  "performed_by_user_id" BIGINT NOT NULL,
  "comments" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hardcopy_transfer_history_transfer_request_id_fkey" FOREIGN KEY ("transfer_request_id") REFERENCES "hardcopy_transfer_requests"("transfer_request_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hardcopy_transfer_history_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "hardcopy_transfer_history_transfer_request_id_created_at_idx" ON "hardcopy_transfer_history"("transfer_request_id", "created_at");

CREATE TABLE IF NOT EXISTS "document_access_request_history" (
  "access_history_id" BIGSERIAL PRIMARY KEY,
  "access_request_id" BIGINT NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "previous_status" "DocumentAccessRequestStatus",
  "new_status" "DocumentAccessRequestStatus" NOT NULL,
  "performed_by_user_id" BIGINT NOT NULL,
  "comments" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_access_request_history_access_request_id_fkey" FOREIGN KEY ("access_request_id") REFERENCES "document_access_requests"("access_request_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_access_request_history_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "document_access_request_history_access_request_id_created_at_idx" ON "document_access_request_history"("access_request_id", "created_at");
