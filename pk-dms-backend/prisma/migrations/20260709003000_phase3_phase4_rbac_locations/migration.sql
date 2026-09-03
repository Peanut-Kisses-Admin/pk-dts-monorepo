-- Bring the original init migration forward to the current schema shape.

-- Users
ALTER TABLE `users`
    ADD COLUMN `require_password_change` BOOLEAN NOT NULL DEFAULT false;

-- Permissions
ALTER TABLE `permissions`
    ADD COLUMN `module_key` VARCHAR(100) NOT NULL,
    ADD COLUMN `module_label` VARCHAR(150) NOT NULL,
    ADD COLUMN `action_key` VARCHAR(100) NOT NULL,
    ADD COLUMN `action_label` VARCHAR(150) NOT NULL;

CREATE UNIQUE INDEX `permissions_module_key_action_key_key` ON `permissions`(`module_key`, `action_key`);

-- Locations
ALTER TABLE `locations`
    ADD COLUMN `location_code` VARCHAR(20) NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `archived_at` DATETIME(3) NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD UNIQUE INDEX `locations_location_name_key`(`location_name`),
    ADD UNIQUE INDEX `locations_location_code_key`(`location_code`);

-- System sequence state
CREATE TABLE `system_sequence_states` (
    `sequence_key` VARCHAR(100) NOT NULL,
    `next_value` BIGINT NOT NULL DEFAULT 0,

    PRIMARY KEY (`sequence_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Documents disposal fields
ALTER TABLE `documents`
    ADD COLUMN `disposal_remarks` TEXT NULL,
    ADD COLUMN `disposed_at` DATETIME(3) NULL,
    ADD COLUMN `disposed_by_name` VARCHAR(150) NULL,
    ADD COLUMN `disposed_by_user_id` BIGINT NULL,
    MODIFY `status` ENUM('Active', 'Disposed') NOT NULL DEFAULT 'Active';

CREATE INDEX `documents_disposed_by_user_id_idx` ON `documents`(`disposed_by_user_id`);

ALTER TABLE `documents`
    ADD CONSTRAINT `documents_disposed_by_user_id_fkey`
    FOREIGN KEY (`disposed_by_user_id`) REFERENCES `users`(`user_id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
