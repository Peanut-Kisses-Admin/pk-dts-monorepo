BEGIN;

DO $$
DECLARE
  actor_id BIGINT;
  completed_at TIMESTAMP(3) := CURRENT_TIMESTAMP;
BEGIN
  SELECT user_id
  INTO actor_id
  FROM users
  WHERE firstname = 'John Paul'
    AND lastname = 'Curib'
    AND email = 'curibtech@gmail.com';

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'John Paul Curib account was not found';
  END IF;

  UPDATE document_workflow_steps AS step
  SET status = 'APPROVED',
      acted_by_user_id = actor_id,
      decision = 'approve',
      acted_at = completed_at,
      acted_user_name_snapshot = 'John Paul Curib'
  FROM hardcopy_documents AS hardcopy
  JOIN documents AS document ON document.document_id = hardcopy.document_id
  WHERE step.document_id = document.document_id
    AND step.stage = 'HARDCOPY_APPROVAL'
    AND step.status <> 'APPROVED';

  WITH targets AS (
    SELECT document.document_id,
           document.status AS previous_status
    FROM documents AS document
    JOIN hardcopy_documents AS hardcopy ON hardcopy.document_id = document.document_id
    WHERE document.status = 'Approved'
  ), updated AS (
    UPDATE documents AS document
    SET status = 'Completed',
        date_released = COALESCE(document.date_released, completed_at),
        reviewed_by_user_id = actor_id,
        reviewed_at = completed_at,
        reviewer_remarks = 'Completed by John Paul Curib.'
    FROM targets
    WHERE document.document_id = targets.document_id
    RETURNING document.document_id, targets.previous_status
  )
  INSERT INTO document_status_history (
    document_id,
    previous_status,
    new_status,
    action,
    performed_by,
    remarks,
    created_at
  )
  SELECT document_id,
         previous_status,
         'Completed',
         'complete',
         actor_id,
         'Completed by John Paul Curib.',
         completed_at
  FROM updated;
END $$;

COMMIT;
