INSERT INTO "permissions" ("permission_name", "module_key", "module_label", "action_key", "action_label", "description") VALUES
('softcopy-folders.view','softcopy-folders','Softcopy Folders','view','View','View authorized softcopy folders and subfolders.'),
('softcopy-folders.create','softcopy-folders','Softcopy Folders','create','Create','Create softcopy folders and subfolders.'),
('softcopy-folders.edit','softcopy-folders','Softcopy Folders','edit','Edit','Rename or move authorized softcopy folders and subfolders.'),
('softcopy-folders.delete','softcopy-folders','Softcopy Folders','delete','Delete','Delete authorized empty softcopy folders and subfolders.'),
('softcopy-folders.manage','softcopy-folders','Softcopy Folders','manage','Manage','Manage all softcopy folders and subfolders.')
ON CONFLICT ("permission_name") DO UPDATE SET "module_key"=EXCLUDED."module_key","module_label"=EXCLUDED."module_label","action_key"=EXCLUDED."action_key","action_label"=EXCLUDED."action_label","description"=EXCLUDED."description";

INSERT INTO "role_permissions" ("role_id","permission_id") SELECT r."role_id",p."permission_id" FROM "roles" r CROSS JOIN "permissions" p
WHERE LOWER(TRIM(r."role_name"))='staff' AND p."permission_name" IN ('softcopy-folders.view','softcopy-folders.create','softcopy-folders.edit')
ON CONFLICT ("role_id","permission_id") DO NOTHING;
