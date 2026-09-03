CREATE TABLE "softcopy_categories" (
    "softcopy_category_id" BIGSERIAL NOT NULL,
    "category_name" VARCHAR(150) NOT NULL,
    "folder_name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "softcopy_categories_pkey" PRIMARY KEY ("softcopy_category_id")
);

CREATE UNIQUE INDEX "softcopy_categories_category_name_key" ON "softcopy_categories"("category_name");
CREATE UNIQUE INDEX "softcopy_categories_folder_name_key" ON "softcopy_categories"("folder_name");

INSERT INTO "softcopy_categories" ("category_name", "folder_name", "description")
VALUES ('Uncategorized', 'uncategorized', 'Default category for existing and unclassified softcopy documents.');

ALTER TABLE "softcopy_documents" ADD COLUMN "softcopy_category_id" BIGINT;
UPDATE "softcopy_documents"
SET "softcopy_category_id" = (SELECT "softcopy_category_id" FROM "softcopy_categories" WHERE "folder_name" = 'uncategorized');
ALTER TABLE "softcopy_documents" ALTER COLUMN "softcopy_category_id" SET NOT NULL;
ALTER TABLE "softcopy_documents" ADD CONSTRAINT "softcopy_documents_softcopy_category_id_fkey"
FOREIGN KEY ("softcopy_category_id") REFERENCES "softcopy_categories"("softcopy_category_id") ON DELETE RESTRICT ON UPDATE CASCADE;
