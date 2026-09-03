CREATE TABLE `document_assignments` (
    `document_assignment_id` BIGINT NOT NULL AUTO_INCREMENT,
    `document_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `assigned_by` BIGINT NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `document_assignments_document_id_user_id_key`(`document_id`, `user_id`),
    INDEX `document_assignments_user_id_document_id_idx`(`user_id`, `document_id`),
    PRIMARY KEY (`document_assignment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `document_assignments` ADD CONSTRAINT `document_assignments_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`document_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `document_assignments` ADD CONSTRAINT `document_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `document_assignments` ADD CONSTRAINT `document_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
