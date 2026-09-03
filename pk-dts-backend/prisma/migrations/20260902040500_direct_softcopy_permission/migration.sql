INSERT INTO "permissions" ("permission_name", "module_key", "module_label", "action_key", "action_label", "description") VALUES
('documents.create-direct', 'documents', 'Documents', 'create-direct', 'Direct Softcopy Create', 'Create a Softcopy directly without a Document Control Request when authorized.')
ON CONFLICT ("permission_name") DO UPDATE SET
  "module_key" = EXCLUDED."module_key",
  "module_label" = EXCLUDED."module_label",
  "action_key" = EXCLUDED."action_key",
  "action_label" = EXCLUDED."action_label",
  "description" = EXCLUDED."description";

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id"
FROM "roles" r CROSS JOIN "permissions" p
WHERE LOWER(TRIM(r."role_name")) IN (
  'admin', 'administrator', 'super admin', 'superadmin', 'super-admin',
  'plant manager', 'plant_manager', 'plant-manager'
)
  AND p."permission_name" = 'documents.create-direct'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
