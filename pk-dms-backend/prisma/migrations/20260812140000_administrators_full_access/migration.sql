INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE LOWER(TRIM(r."role_name")) IN ('admin','administrator','super admin','superadmin','super-admin')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
