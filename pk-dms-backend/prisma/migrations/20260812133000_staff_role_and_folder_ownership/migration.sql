ALTER TABLE "softcopy_categories" ADD COLUMN "created_by_user_id" BIGINT;
ALTER TABLE "softcopy_categories" ADD CONSTRAINT "softcopy_categories_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "softcopy_categories_created_by_user_id_idx" ON "softcopy_categories"("created_by_user_id");

INSERT INTO "permissions" ("permission_name", "module_key", "module_label", "action_key", "action_label", "description") VALUES
('documents.manage-own','documents','Documents','manage-own','Manage Own Documents','Manage documents created by the current user.')
ON CONFLICT ("permission_name") DO UPDATE SET "action_label"=EXCLUDED."action_label", "description"=EXCLUDED."description";

INSERT INTO "roles" ("role_name", "description") VALUES ('Staff','Staff users manage their own folders, requests, attachments, and documents.')
ON CONFLICT ("role_name") DO UPDATE SET "description"=EXCLUDED."description";
UPDATE "users" SET "role_id"=(SELECT "role_id" FROM "roles" WHERE "role_name"='Staff') WHERE "role_id" IN (SELECT "role_id" FROM "roles" WHERE LOWER("role_name")='viewer');
INSERT INTO "role_permissions" ("role_id","permission_id") SELECT r."role_id",p."permission_id" FROM "roles" r CROSS JOIN "permissions" p WHERE r."role_name"='Staff' AND p."permission_name" IN ('dashboard.view','documents.view','documents.create','documents.manage-own','documents.attach-scans','documents.download','documents.search','document-requests.view','document-requests.view-own','document-requests.create','document-requests.edit','document-requests.submit','storage-classification.view','storage-classification.create') ON CONFLICT ("role_id","permission_id") DO NOTHING;
