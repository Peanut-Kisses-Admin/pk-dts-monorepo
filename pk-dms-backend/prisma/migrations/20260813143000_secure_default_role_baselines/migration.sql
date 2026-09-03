INSERT INTO "roles" ("role_name", "description") VALUES
('Viewer', 'Read-only access to assigned documents and their folder hierarchy.'),
('Staff', 'Staff users manage their own folders, requests, attachments, and documents.')
ON CONFLICT ("role_name") DO UPDATE SET "description" = EXCLUDED."description";

DELETE FROM "role_permissions" rp USING "roles" r
WHERE rp."role_id" = r."role_id" AND LOWER(TRIM(r."role_name")) = 'viewer';

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id" FROM "roles" r CROSS JOIN "permissions" p
WHERE LOWER(TRIM(r."role_name")) = 'viewer'
  AND p."permission_name" IN ('dashboard.view', 'documents.view', 'softcopy-folders.view')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

DELETE FROM "role_permissions" rp USING "roles" r
WHERE rp."role_id" = r."role_id" AND LOWER(TRIM(r."role_name")) = 'staff';

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id" FROM "roles" r CROSS JOIN "permissions" p
WHERE LOWER(TRIM(r."role_name")) = 'staff'
  AND p."permission_name" IN (
    'dashboard.view', 'documents.view', 'documents.create', 'documents.manage-own',
    'documents.attach-scans', 'documents.download', 'documents.search',
    'ai-document-assistant.search', 'document-requests.view', 'document-requests.view-own',
    'document-requests.create', 'document-requests.edit', 'document-requests.submit',
    'softcopy-folders.view', 'softcopy-folders.create', 'softcopy-folders.edit'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
