INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE LOWER(r."role_name") = 'viewer'
  AND p."permission_name" = 'document-requests.edit'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
