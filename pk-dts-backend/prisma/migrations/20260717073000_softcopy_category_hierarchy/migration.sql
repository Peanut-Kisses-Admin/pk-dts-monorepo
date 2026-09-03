ALTER TABLE `softcopy_categories`
    ADD COLUMN `parent_category_id` BIGINT NULL;

DROP INDEX `softcopy_categories_category_name_key` ON `softcopy_categories`;

CREATE INDEX `softcopy_categories_parent_category_id_idx`
    ON `softcopy_categories`(`parent_category_id`);

CREATE UNIQUE INDEX `softcopy_categories_parent_category_id_category_name_key`
    ON `softcopy_categories`(`parent_category_id`, `category_name`);

ALTER TABLE `softcopy_categories`
    ADD CONSTRAINT `softcopy_categories_parent_category_id_fkey`
    FOREIGN KEY (`parent_category_id`) REFERENCES `softcopy_categories`(`softcopy_category_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
