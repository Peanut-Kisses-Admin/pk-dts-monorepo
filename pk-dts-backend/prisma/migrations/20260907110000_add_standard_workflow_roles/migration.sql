INSERT INTO "roles" ("role_name", "description") VALUES
  ('Plant Manager', 'Approves requests assigned to the Plant Manager stage.'),
  ('Document Controller', 'Approves and completes requests assigned to Document Control.')
ON CONFLICT ("role_name") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."role_id", permission."permission_id"
FROM "roles" role
JOIN "permissions" permission ON permission."permission_name" IN (
  'dashboard.view','documents.view','documents.create','documents.manage-own','documents.attach-scans','documents.download','documents.search','ai-document-assistant.search',
  'document-requests.view','document-requests.view-own','document-requests.create','document-requests.edit','document-requests.submit','document-requests.review','document-requests.request-revision','document-requests.reject','document-requests.complete',
  'hardcopy-transfers.view-own','hardcopy-transfers.create','hardcopy-transfers.accept','hardcopy-transfers.review','hardcopy-transfers.approve','hardcopy-transfers.dispatch',
  'document-access-requests.catalog','document-access-requests.create','document-access-requests.view-own','document-access-requests.cancel-own','document-access-requests.review','document-access-requests.approve','document-access-requests.reject','document-access-requests.grant','document-access-requests.revoke','document-access-requests.expire',
  'document-disposal.request','softcopy-folders.view','softcopy-folders.create','softcopy-folders.edit',
  'document-requests.approve-plant-manager','document-requests.approve-document-controller','document-requests.approve-hardcopy'
)
WHERE LOWER(TRIM(role."role_name")) IN ('plant manager', 'document controller')
  AND (
    (LOWER(TRIM(role."role_name")) = 'plant manager' AND permission."permission_name" <> 'document-requests.approve-document-controller' AND permission."permission_name" <> 'document-requests.approve-hardcopy')
    OR (LOWER(TRIM(role."role_name")) = 'document controller' AND permission."permission_name" <> 'document-requests.approve-plant-manager')
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
