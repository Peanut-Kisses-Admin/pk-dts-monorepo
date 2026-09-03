INSERT INTO "permissions" ("permission_name", "module_key", "module_label", "action_key", "action_label", "description") VALUES
('document-requests.approve-noted-by', 'document-requests', 'Document Requests', 'approve-noted-by', 'Approve as Noted By', 'Approve the assigned Softcopy Noted By stage.'),
('document-requests.approve-plant-manager', 'document-requests', 'Document Requests', 'approve-plant-manager', 'Approve as Plant Manager', 'Approve the assigned Softcopy Plant Manager stage.'),
('document-requests.approve-document-controller', 'document-requests', 'Document Requests', 'approve-document-controller', 'Approve as Document Controller', 'Approve the assigned Softcopy Document Controller/Admin stage.'),
('document-requests.approve-hardcopy', 'document-requests', 'Document Requests', 'approve-hardcopy', 'Approve Hardcopy Requests', 'Approve the assigned Hardcopy request stage.'),
('document-requests.complete', 'document-requests', 'Document Requests', 'complete', 'Complete', 'Complete an approved request as the configured final approver.'),
('document-workflow.configure', 'document-workflow', 'Document Workflow', 'configure', 'Configure Approvers', 'Configure the approvers used by document workflows.'),
('hardcopy-transfers.view-own', 'hardcopy-transfers', 'Hardcopy Transfers', 'view-own', 'View Own Transfers', 'View hardcopy transfers requested by or assigned to the current user.'),
('hardcopy-transfers.create', 'hardcopy-transfers', 'Hardcopy Transfers', 'create', 'Request Transfer', 'Create a hardcopy transfer request.'),
('hardcopy-transfers.review', 'hardcopy-transfers', 'Hardcopy Transfers', 'review', 'Review Transfers', 'View hardcopy transfers awaiting the configured approver''s action.'),
('hardcopy-transfers.approve', 'hardcopy-transfers', 'Hardcopy Transfers', 'approve', 'Approve Transfers', 'Approve a hardcopy transfer request assigned to the current user.'),
('hardcopy-transfers.dispatch', 'hardcopy-transfers', 'Hardcopy Transfers', 'dispatch', 'Dispatch Transfers', 'Prepare and dispatch an approved hardcopy transfer.'),
('hardcopy-transfers.accept', 'hardcopy-transfers', 'Hardcopy Transfers', 'accept', 'Accept Receipt', 'Confirm physical receipt of a hardcopy transfer assigned to the current user.'),
('document-access-requests.grant', 'document-access-requests', 'Document Access Requests', 'grant', 'Grant Access', 'Grant document access after the configured approver approves the request.'),
('document-access-requests.revoke', 'document-access-requests', 'Document Access Requests', 'revoke', 'Revoke Access', 'Revoke an existing document assignment.'),
('document-access-requests.expire', 'document-access-requests', 'Document Access Requests', 'expire', 'Expire Access', 'Expire an approved document access request.')
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
  AND p."permission_name" IN (
    'document-requests.approve-noted-by', 'document-requests.approve-plant-manager',
    'document-requests.approve-document-controller', 'document-requests.approve-hardcopy',
    'document-requests.complete', 'document-workflow.configure',
    'hardcopy-transfers.view-own', 'hardcopy-transfers.create', 'hardcopy-transfers.review',
    'hardcopy-transfers.approve', 'hardcopy-transfers.dispatch', 'hardcopy-transfers.accept',
    'document-access-requests.grant', 'document-access-requests.revoke', 'document-access-requests.expire'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id"
FROM "roles" r CROSS JOIN "permissions" p
WHERE LOWER(TRIM(r."role_name")) = 'staff'
  AND p."permission_name" IN (
    'document-requests.review', 'document-requests.approve-noted-by',
    'document-requests.request-revision', 'document-requests.reject',
    'hardcopy-transfers.view-own', 'hardcopy-transfers.create', 'hardcopy-transfers.accept'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id"
FROM "roles" r CROSS JOIN "permissions" p
WHERE LOWER(TRIM(r."role_name")) IN ('plant manager', 'plant_manager', 'plant-manager')
  AND p."permission_name" IN (
    'document-requests.review', 'document-requests.approve-plant-manager',
    'document-requests.request-revision', 'document-requests.reject',
    'document-requests.complete', 'hardcopy-transfers.review',
    'hardcopy-transfers.approve', 'hardcopy-transfers.dispatch',
    'document-access-requests.review', 'document-access-requests.approve',
    'document-access-requests.reject', 'document-access-requests.grant',
    'document-access-requests.revoke', 'document-access-requests.expire'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."role_id", p."permission_id"
FROM "roles" r CROSS JOIN "permissions" p
WHERE LOWER(TRIM(r."role_name")) IN ('document controller', 'document_controller', 'document controller officer', 'document_controller_officer', 'document controller/admin')
  AND p."permission_name" IN (
    'document-requests.review', 'document-requests.approve-document-controller',
    'document-requests.approve-hardcopy', 'document-requests.request-revision',
    'document-requests.reject', 'document-requests.complete',
    'hardcopy-transfers.review', 'hardcopy-transfers.approve', 'hardcopy-transfers.dispatch',
    'document-access-requests.review', 'document-access-requests.approve',
    'document-access-requests.reject', 'document-access-requests.grant',
    'document-access-requests.revoke', 'document-access-requests.expire'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
