-- Standardize the actionable revision state while retaining the legacy enum
-- value for compatibility with historical backups and older clients.
UPDATE "documents"
SET "status" = 'ForRevision'
WHERE "status" = 'ReturnedForCorrection';

UPDATE "documents"
SET "status_before_disposal" = 'ForRevision'
WHERE "status_before_disposal" = 'ReturnedForCorrection';

UPDATE "document_status_history"
SET "previous_status" = 'ForRevision'
WHERE "previous_status" = 'ReturnedForCorrection';

UPDATE "document_status_history"
SET "new_status" = 'ForRevision'
WHERE "new_status" = 'ReturnedForCorrection';
