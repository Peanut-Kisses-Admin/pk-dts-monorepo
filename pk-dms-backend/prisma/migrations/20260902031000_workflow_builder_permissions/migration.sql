INSERT INTO "permissions" ("permission_name", "module_key", "module_label", "action_key", "action_label", "description") VALUES
('document-workflow.view', 'document-workflow', 'Document Workflow', 'view', 'View Workflow Definitions', 'View published workflow definitions and version history.'),
('document-workflow.configure', 'document-workflow', 'Document Workflow', 'configure', 'Build Workflows', 'Create and edit draft workflow definitions, steps, assignments, conditions, and paths.'),
('document-workflow.publish', 'document-workflow', 'Document Workflow', 'publish', 'Publish Workflows', 'Publish immutable workflow versions for future requests.')
ON CONFLICT ("permission_name") DO UPDATE SET
  "module_key" = EXCLUDED."module_key",
  "module_label" = EXCLUDED."module_label",
  "action_key" = EXCLUDED."action_key",
  "action_label" = EXCLUDED."action_label",
  "description" = EXCLUDED."description";

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id"
FROM "roles" r CROSS JOIN "permissions" p
WHERE LOWER(TRIM(r."role_name")) IN ('admin', 'administrator', 'super admin', 'superadmin', 'super-admin')
  AND p."permission_name" IN ('document-workflow.view', 'document-workflow.configure', 'document-workflow.publish')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
