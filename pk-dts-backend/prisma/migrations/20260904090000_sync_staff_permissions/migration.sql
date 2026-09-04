-- Keep existing Staff accounts aligned with the application Staff baseline.
-- This is additive so administrator-managed extra permissions are preserved.
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE LOWER(TRIM(r."role_name")) = 'staff'
  AND p."permission_name" IN (
    'dashboard.view',
    'documents.view',
    'documents.create',
    'documents.manage-own',
    'documents.attach-scans',
    'documents.download',
    'documents.search',
    'ai-document-assistant.search',
    'document-requests.view',
    'document-requests.view-own',
    'document-requests.create',
    'document-requests.edit',
    'document-requests.submit',
    'document-requests.review',
    'document-requests.approve-noted-by',
    'document-requests.request-revision',
    'document-requests.reject',
    'document-access-requests.catalog',
    'document-access-requests.create',
    'document-access-requests.view-own',
    'document-access-requests.cancel-own',
    'document-disposal.request',
    'hardcopy-transfers.view-own',
    'hardcopy-transfers.create',
    'hardcopy-transfers.accept',
    'softcopy-folders.view',
    'softcopy-folders.create',
    'softcopy-folders.edit'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
