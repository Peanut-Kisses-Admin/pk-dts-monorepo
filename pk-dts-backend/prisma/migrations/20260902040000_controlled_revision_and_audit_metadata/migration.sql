ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS creation_source VARCHAR(30) NOT NULL DEFAULT 'DCR',
  ADD COLUMN IF NOT EXISTS creation_reason TEXT,
  ADD COLUMN IF NOT EXISTS direct_created_at TIMESTAMP(3);

ALTER TABLE document_revisions
  ADD COLUMN IF NOT EXISTS superseded_by_revision_id BIGINT,
  ADD COLUMN IF NOT EXISTS correction_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_revisions_superseded_by_revision_id_fkey'
  ) THEN
    ALTER TABLE document_revisions
      ADD CONSTRAINT document_revisions_superseded_by_revision_id_fkey
      FOREIGN KEY (superseded_by_revision_id) REFERENCES document_revisions(revision_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS document_revisions_superseded_by_revision_id_idx
  ON document_revisions(superseded_by_revision_id);

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS before_state JSONB,
  ADD COLUMN IF NOT EXISTS after_state JSONB,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS workflow_context JSONB;

CREATE INDEX IF NOT EXISTS audit_logs_action_created_at_idx ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_entity_created_at_idx ON audit_logs(entity_id, created_at);

-- Audit rows are append-only. The application exposes no write endpoint, and
-- this database guard also blocks accidental or unauthorized direct changes.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
