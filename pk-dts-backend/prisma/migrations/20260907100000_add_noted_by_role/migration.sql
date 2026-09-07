-- Keep routine Staff accounts out of approval queues while giving designated
-- first-stage approvers a clearly named Noted By role.
INSERT INTO "roles" ("role_name", "description")
VALUES (
  'Noted By',
  'Staff self-service access plus approval of requests assigned to the Noted By stage.'
)
ON CONFLICT ("role_name") DO UPDATE
SET "description" = EXCLUDED."description";

DELETE FROM "role_permissions" rp
USING "roles" r
WHERE rp."role_id" = r."role_id"
  AND LOWER(TRIM(r."role_name")) = 'noted by';

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT noted_by."role_id", staff_permission."permission_id"
FROM "roles" noted_by
JOIN "roles" staff ON LOWER(TRIM(staff."role_name")) = 'staff'
JOIN "role_permissions" staff_permission ON staff_permission."role_id" = staff."role_id"
WHERE LOWER(TRIM(noted_by."role_name")) = 'noted by'

UNION

SELECT noted_by."role_id", permission."permission_id"
FROM "roles" noted_by
JOIN "permissions" permission ON permission."permission_name" IN (
  'document-requests.review',
  'document-requests.approve-noted-by',
  'document-requests.request-revision',
  'document-requests.reject'
)
WHERE LOWER(TRIM(noted_by."role_name")) = 'noted by'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
