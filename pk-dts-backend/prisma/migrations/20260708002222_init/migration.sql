-- CreateTable
CREATE TABLE `users` (
    `user_id` BIGINT NOT NULL AUTO_INCREMENT,
    `firstname` VARCHAR(100) NOT NULL,
    `lastname` VARCHAR(100) NOT NULL,
    `middlename` VARCHAR(100) NULL,
    `age` INTEGER NULL,
    `address` TEXT NULL,
    `phone_number` VARCHAR(20) NULL,
    `email` VARCHAR(150) NOT NULL,
    `position_title` VARCHAR(100) NULL,
    `password` VARCHAR(255) NOT NULL,
    `role_id` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `role_id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `roles_role_name_key`(`role_name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `permission_id` BIGINT NOT NULL AUTO_INCREMENT,
    `permission_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `permissions_permission_name_key`(`permission_name`),
    PRIMARY KEY (`permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_permission_id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_id` BIGINT NOT NULL,
    `permission_id` BIGINT NOT NULL,

    UNIQUE INDEX `role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`role_permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `areas` (
    `area_id` BIGINT NOT NULL AUTO_INCREMENT,
    `area_name` VARCHAR(150) NOT NULL,

    PRIMARY KEY (`area_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `specifics` (
    `specific_id` BIGINT NOT NULL AUTO_INCREMENT,
    `specific_name` VARCHAR(150) NOT NULL,
    `area_id` BIGINT NULL,

    PRIMARY KEY (`specific_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `locations` (
    `location_id` BIGINT NOT NULL AUTO_INCREMENT,
    `location_name` VARCHAR(150) NOT NULL,

    PRIMARY KEY (`location_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sequences` (
    `sequence_id` BIGINT NOT NULL AUTO_INCREMENT,
    `sequence_code` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `sequences_sequence_code_key`(`sequence_code`),
    PRIMARY KEY (`sequence_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_numbers` (
    `asset_id` BIGINT NOT NULL AUTO_INCREMENT,
    `asset_number` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `asset_numbers_asset_number_key`(`asset_number`),
    PRIMARY KEY (`asset_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `document_id` BIGINT NOT NULL AUTO_INCREMENT,
    `document_number` VARCHAR(100) NOT NULL,
    `document_title` VARCHAR(255) NOT NULL,
    `document_type` ENUM('SOFTCOPY', 'HARDCOPY') NOT NULL,
    `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `documents_document_number_key`(`document_number`),
    PRIMARY KEY (`document_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hardcopy_documents` (
    `hardcopy_id` BIGINT NOT NULL AUTO_INCREMENT,
    `document_id` BIGINT NOT NULL,
    `asset_id` BIGINT NULL,
    `area_id` BIGINT NOT NULL,
    `specific_id` BIGINT NULL,
    `location_id` BIGINT NOT NULL,
    `sequence_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `hardcopy_documents_document_id_key`(`document_id`),
    UNIQUE INDEX `hardcopy_documents_asset_id_key`(`asset_id`),
    PRIMARY KEY (`hardcopy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `softcopy_documents` (
    `softcopy_id` BIGINT NOT NULL AUTO_INCREMENT,
    `document_id` BIGINT NOT NULL,
    `current_revision_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `softcopy_documents_document_id_key`(`document_id`),
    PRIMARY KEY (`softcopy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_revisions` (
    `revision_id` BIGINT NOT NULL AUTO_INCREMENT,
    `softcopy_id` BIGINT NOT NULL,
    `revision_number` VARCHAR(50) NOT NULL,
    `reason_of_revision` TEXT NULL,
    `effective_date` DATETIME(3) NULL,
    `page_number` VARCHAR(50) NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` BIGINT NULL,
    `mime_type` VARCHAR(100) NULL,
    `uploaded_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `document_revisions_softcopy_id_revision_number_key`(`softcopy_id`, `revision_number`),
    PRIMARY KEY (`revision_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `specifics` ADD CONSTRAINT `specifics_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas`(`area_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hardcopy_documents` ADD CONSTRAINT `hardcopy_documents_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`document_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hardcopy_documents` ADD CONSTRAINT `hardcopy_documents_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset_numbers`(`asset_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hardcopy_documents` ADD CONSTRAINT `hardcopy_documents_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas`(`area_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hardcopy_documents` ADD CONSTRAINT `hardcopy_documents_specific_id_fkey` FOREIGN KEY (`specific_id`) REFERENCES `specifics`(`specific_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hardcopy_documents` ADD CONSTRAINT `hardcopy_documents_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `locations`(`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hardcopy_documents` ADD CONSTRAINT `hardcopy_documents_sequence_id_fkey` FOREIGN KEY (`sequence_id`) REFERENCES `sequences`(`sequence_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `softcopy_documents` ADD CONSTRAINT `softcopy_documents_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`document_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `softcopy_documents` ADD CONSTRAINT `softcopy_documents_current_revision_id_fkey` FOREIGN KEY (`current_revision_id`) REFERENCES `document_revisions`(`revision_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_revisions` ADD CONSTRAINT `document_revisions_softcopy_id_fkey` FOREIGN KEY (`softcopy_id`) REFERENCES `softcopy_documents`(`softcopy_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_revisions` ADD CONSTRAINT `document_revisions_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
