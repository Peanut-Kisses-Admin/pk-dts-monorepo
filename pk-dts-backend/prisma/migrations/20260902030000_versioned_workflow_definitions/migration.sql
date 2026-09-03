-- Add versioned workflow definitions without modifying or deleting existing users,
-- documents, workflow decisions, or assignment history.
DO $$ BEGIN
  CREATE TYPE "WorkflowVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "DocumentWorkflowStage" ADD VALUE IF NOT EXISTS 'CUSTOM';
ALTER TYPE "WorkflowStepStatus" ADD VALUE IF NOT EXISTS 'QUEUED';

CREATE TABLE IF NOT EXISTS "workflow_definitions" (
  "workflow_definition_id" BIGSERIAL PRIMARY KEY,
  "workflow_key" VARCHAR(100) NOT NULL UNIQUE,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "document_type" "DocumentType",
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by_user_id" BIGINT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_definitions_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "workflow_versions" (
  "workflow_version_id" BIGSERIAL PRIMARY KEY,
  "workflow_definition_id" BIGINT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "status" "WorkflowVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "graph" JSONB NOT NULL,
  "created_by_user_id" BIGINT NOT NULL,
  "published_by_user_id" BIGINT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_versions_definition_version_key" UNIQUE ("workflow_definition_id", "version_number"),
  CONSTRAINT "workflow_versions_workflow_definition_id_fkey"
    FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("workflow_definition_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "workflow_versions_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "workflow_versions_published_by_user_id_fkey"
    FOREIGN KEY ("published_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "workflow_definitions_document_type_is_active_idx"
  ON "workflow_definitions"("document_type", "is_active");
CREATE INDEX IF NOT EXISTS "workflow_versions_status_published_at_idx"
  ON "workflow_versions"("status", "published_at");

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "workflow_version_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "workflow_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "workflow_current_node_key" VARCHAR(100);

DO $$ BEGIN
  ALTER TABLE "documents" ADD CONSTRAINT "documents_workflow_version_id_fkey"
    FOREIGN KEY ("workflow_version_id") REFERENCES "workflow_versions"("workflow_version_id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "document_workflow_steps"
  ADD COLUMN IF NOT EXISTS "node_key" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "assignment_type" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "assigned_role_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "condition_json" JSONB,
  ADD COLUMN IF NOT EXISTS "on_approve_node_key" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "on_reject_node_key" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "on_return_node_key" VARCHAR(100);

DO $$ BEGIN
  ALTER TABLE "document_workflow_steps" ADD CONSTRAINT "document_workflow_steps_assigned_role_id_fkey"
    FOREIGN KEY ("assigned_role_id") REFERENCES "roles"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "document_workflow_steps"
  DROP CONSTRAINT IF EXISTS "document_workflow_steps_document_id_stage_key";

UPDATE "document_workflow_steps"
SET "node_key" = 'legacy-' || LOWER("stage"::text),
    "assignment_type" = CASE
      WHEN "assignment_source" = 'REQUESTER_LEADER' THEN 'REQUESTER_LEADER'
      WHEN "assignment_source" = 'ROLE_FALLBACK' THEN 'ROLE'
      ELSE 'USER'
    END
WHERE "node_key" IS NULL;

UPDATE "document_workflow_steps" current_step
SET "on_approve_node_key" = next_step."node_key"
FROM "document_workflow_steps" next_step
WHERE next_step."document_id" = current_step."document_id"
  AND next_step."sequence" = current_step."sequence" + 1
  AND current_step."on_approve_node_key" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "document_workflow_steps_document_id_node_key_key"
  ON "document_workflow_steps"("document_id", "node_key");
CREATE INDEX IF NOT EXISTS "document_workflow_steps_assigned_role_id_status_idx"
  ON "document_workflow_steps"("assigned_role_id", "status");

INSERT INTO "workflow_definitions" (
  "workflow_key", "name", "description", "document_type", "is_active", "created_by_user_id", "created_at", "updated_at"
)
SELECT
  'legacy-document-' || d."document_id"::text,
  COALESCE(c."workflow_name", 'Legacy document workflow'),
  'Preserved workflow snapshot migrated from an existing document request.',
  d."document_type",
  FALSE,
  COALESCE(c."configured_by_user_id", d."created_by"),
  d."created_at",
  CURRENT_TIMESTAMP
FROM "documents" d
LEFT JOIN "document_approver_configurations" c ON c."document_id" = d."document_id"
ON CONFLICT ("workflow_key") DO NOTHING;

INSERT INTO "workflow_versions" (
  "workflow_definition_id", "version_number", "status", "graph", "created_by_user_id", "published_by_user_id", "published_at", "created_at", "updated_at"
)
SELECT
  wd."workflow_definition_id",
  COALESCE(c."workflow_version", 1),
  'PUBLISHED',
  jsonb_build_object(
    'schema_version', 1,
    'legacy_plan', COALESCE(c."workflow_plan", '[]'::jsonb),
    'migrated_document_id', d."document_id"::text
  ),
  COALESCE(c."configured_by_user_id", d."created_by"),
  COALESCE(c."configured_by_user_id", d."created_by"),
  COALESCE(d."approval_date", d."created_at"),
  d."created_at",
  CURRENT_TIMESTAMP
FROM "documents" d
JOIN "workflow_definitions" wd ON wd."workflow_key" = 'legacy-document-' || d."document_id"::text
LEFT JOIN "document_approver_configurations" c ON c."document_id" = d."document_id"
ON CONFLICT ("workflow_definition_id", "version_number") DO NOTHING;

UPDATE "documents" d
SET "workflow_version_id" = wv."workflow_version_id",
    "workflow_snapshot" = wv."graph",
    "workflow_current_node_key" = (
      SELECT s."node_key"
      FROM "document_workflow_steps" s
      WHERE s."document_id" = d."document_id" AND s."status" = 'PENDING'
      ORDER BY s."sequence"
      LIMIT 1
    )
FROM "workflow_definitions" wd
JOIN "workflow_versions" wv ON wv."workflow_definition_id" = wd."workflow_definition_id"
WHERE wd."workflow_key" = 'legacy-document-' || d."document_id"::text
  AND d."workflow_version_id" IS NULL;
