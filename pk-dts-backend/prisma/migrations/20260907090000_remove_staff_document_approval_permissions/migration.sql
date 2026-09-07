-- Staff accounts submit and manage their own requests. Approval work is reserved
-- for explicitly assigned workflow roles such as Plant Manager or Document Controller.
DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."role_id" = r."role_id"
  AND rp."permission_id" = p."permission_id"
  AND LOWER(TRIM(r."role_name")) = 'staff'
  AND p."permission_name" IN (
    'document-requests.review',
    'document-requests.approve-noted-by',
    'document-requests.request-revision',
    'document-requests.reject'
  );
