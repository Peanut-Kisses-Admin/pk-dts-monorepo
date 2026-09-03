ALTER TABLE "document_workflow_steps"
  ADD COLUMN "stage_label" VARCHAR(150),
  ADD COLUMN "assignment_source" VARCHAR(50),
  ADD COLUMN "required_permission" VARCHAR(120),
  ADD COLUMN "assigned_user_name_snapshot" VARCHAR(255),
  ADD COLUMN "assigned_position_title_snapshot" VARCHAR(150),
  ADD COLUMN "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "acted_user_name_snapshot" VARCHAR(255),
  ADD COLUMN "acted_position_title_snapshot" VARCHAR(150);

ALTER TABLE "document_approver_configurations"
  ADD COLUMN "workflow_name" VARCHAR(150),
  ADD COLUMN "workflow_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "workflow_plan" JSONB;

CREATE TABLE "document_workflow_assignment_history" (
  "assignment_history_id" BIGSERIAL NOT NULL,
  "workflow_step_id" BIGINT NOT NULL,
  "previous_user_id" BIGINT,
  "new_user_id" BIGINT NOT NULL,
  "changed_by_user_id" BIGINT NOT NULL,
  "previous_user_name" VARCHAR(255),
  "new_user_name" VARCHAR(255) NOT NULL,
  "new_position_title" VARCHAR(150),
  "reason" TEXT NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_workflow_assignment_history_pkey" PRIMARY KEY ("assignment_history_id"),
  CONSTRAINT "document_workflow_assignment_history_workflow_step_id_fkey"
    FOREIGN KEY ("workflow_step_id") REFERENCES "document_workflow_steps"("workflow_step_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "document_workflow_assignment_history_workflow_step_id_changed_at_idx"
  ON "document_workflow_assignment_history"("workflow_step_id", "changed_at");

UPDATE "document_workflow_steps" AS step
SET
  "stage_label" = CASE step."stage"::text
    WHEN 'NOTED_BY' THEN 'Leader / Noted By'
    WHEN 'PLANT_MANAGER' THEN 'Plant Manager Approval'
    WHEN 'DOCUMENT_CONTROLLER_ADMIN' THEN 'Document Controller Approval'
    WHEN 'HARDCOPY_APPROVAL' THEN 'Hardcopy Approval'
    ELSE INITCAP(REPLACE(step."stage"::text, '_', ' '))
  END,
  "assignment_source" = 'LEGACY',
  "assigned_user_name_snapshot" = CONCAT_WS(' ', users."firstname", users."lastname"),
  "assigned_position_title_snapshot" = users."position_title"
FROM "users"
WHERE users."user_id" = step."assigned_user_id";
