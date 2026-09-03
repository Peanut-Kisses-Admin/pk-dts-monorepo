INSERT INTO "permissions" ("permission_name", "module_key", "module_label", "action_key", "action_label", "description")
VALUES (
  'documents.attach-scans',
  'documents',
  'Documents',
  'attach-scans',
  'Attach Scanned Documents',
  'Attach scanned documents or supporting files to assigned softcopy and hardcopy records.'
)
ON CONFLICT ("permission_name") DO UPDATE SET
  "module_key" = EXCLUDED."module_key",
  "module_label" = EXCLUDED."module_label",
  "action_key" = EXCLUDED."action_key",
  "action_label" = EXCLUDED."action_label",
  "description" = EXCLUDED."description";

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE LOWER(r."role_name") = 'viewer'
  AND p."permission_name" IN (
    'documents.attach-scans',
    'documents.dispose',
    'document-disposal.dispose'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
