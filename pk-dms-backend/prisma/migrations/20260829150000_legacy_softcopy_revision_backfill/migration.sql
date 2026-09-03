-- Preserve pre-workflow approved records while making their existing revision
-- metadata usable by the current-document and revision-history queries.
-- This migration intentionally does not create approval timestamps or history.

BEGIN;

UPDATE document_revisions revision
SET
  is_current = revision.revision_id = softcopy.current_revision_id,
  is_historical = revision.revision_id <> softcopy.current_revision_id
FROM softcopy_documents softcopy
JOIN documents document_record ON document_record.document_id = softcopy.document_id
WHERE revision.softcopy_id = softcopy.softcopy_id
  AND document_record.status IN ('Approved', 'Completed')
  AND NOT EXISTS (
    SELECT 1
    FROM document_workflow_steps workflow_step
    WHERE workflow_step.document_id = document_record.document_id
  )
  AND softcopy.current_revision_id IS NOT NULL;

WITH ranked_revisions AS (
  SELECT
    revision.revision_id,
    revision.softcopy_id,
    ROW_NUMBER() OVER (
      PARTITION BY revision.softcopy_id
      ORDER BY revision.created_at DESC, revision.revision_id DESC
    ) AS revision_rank
  FROM document_revisions revision
  JOIN softcopy_documents softcopy ON softcopy.softcopy_id = revision.softcopy_id
  JOIN documents document_record ON document_record.document_id = softcopy.document_id
  WHERE document_record.status IN ('Approved', 'Completed')
    AND NOT EXISTS (
      SELECT 1
      FROM document_workflow_steps workflow_step
      WHERE workflow_step.document_id = document_record.document_id
    )
    AND softcopy.current_revision_id IS NULL
)
UPDATE document_revisions revision
SET
  is_current = ranked.revision_rank = 1,
  is_historical = ranked.revision_rank > 1
FROM ranked_revisions ranked
WHERE revision.revision_id = ranked.revision_id;

WITH ranked_revisions AS (
  SELECT
    revision.softcopy_id,
    revision.revision_id,
    ROW_NUMBER() OVER (
      PARTITION BY revision.softcopy_id
      ORDER BY revision.created_at DESC, revision.revision_id DESC
    ) AS revision_rank
  FROM document_revisions revision
  JOIN softcopy_documents softcopy ON softcopy.softcopy_id = revision.softcopy_id
  JOIN documents document_record ON document_record.document_id = softcopy.document_id
  WHERE document_record.status IN ('Approved', 'Completed')
    AND NOT EXISTS (
      SELECT 1
      FROM document_workflow_steps workflow_step
      WHERE workflow_step.document_id = document_record.document_id
    )
    AND softcopy.current_revision_id IS NULL
)
UPDATE softcopy_documents softcopy
SET current_revision_id = ranked.revision_id
FROM ranked_revisions ranked
WHERE softcopy.softcopy_id = ranked.softcopy_id
  AND ranked.revision_rank = 1
  AND softcopy.current_revision_id IS NULL;

UPDATE documents document_record
SET
  legacy_imported = TRUE,
  legacy_import_note = COALESCE(
    document_record.legacy_import_note,
    'Legacy / Imported Approved: preserved from pre-workflow data; no new approval history was created.'
  )
WHERE document_record.status IN ('Approved', 'Completed')
  AND document_record.legacy_imported = FALSE
  AND NOT EXISTS (
    SELECT 1
    FROM document_workflow_steps workflow_step
    WHERE workflow_step.document_id = document_record.document_id
  );

COMMIT;
