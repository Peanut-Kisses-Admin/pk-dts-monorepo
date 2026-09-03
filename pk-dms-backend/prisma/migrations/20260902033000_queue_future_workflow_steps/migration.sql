-- Existing workflows historically stored every unacted step as PENDING.
-- Preserve the first pending step and queue the remaining snapshots so only
-- the active node can appear in approval queues after the dynamic engine ships.
WITH ranked_pending AS (
  SELECT
    workflow_step_id,
    ROW_NUMBER() OVER (
      PARTITION BY document_id
      ORDER BY sequence ASC, workflow_step_id ASC
    ) AS pending_rank
  FROM document_workflow_steps
  WHERE status = 'PENDING'
)
UPDATE document_workflow_steps AS workflow_step
SET status = 'QUEUED'
FROM ranked_pending
WHERE workflow_step.workflow_step_id = ranked_pending.workflow_step_id
  AND ranked_pending.pending_rank > 1;
