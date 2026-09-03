CREATE TABLE `account_registration_requests` (
    `registration_id` BIGINT NOT NULL AUTO_INCREMENT,
    `reference_code` VARCHAR(40) NOT NULL,
    `firstname` VARCHAR(100) NOT NULL,
    `lastname` VARCHAR(100) NOT NULL,
    `middlename` VARCHAR(100) NULL,
    `email` VARCHAR(150) NOT NULL,
    `phone_number` VARCHAR(20) NULL,
    `position_title` VARCHAR(100) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `review_remarks` TEXT NULL,
    `requested_role_id` BIGINT NOT NULL,
    `assigned_role_id` BIGINT NULL,
    `reviewed_by_user_id` BIGINT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `account_registration_requests_reference_code_key`(`reference_code`),
    INDEX `account_registration_requests_email_status_idx`(`email`, `status`),
    INDEX `account_registration_requests_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`registration_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `account_registration_requests`
    ADD CONSTRAINT `account_registration_requests_requested_role_id_fkey`
    FOREIGN KEY (`requested_role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `account_registration_requests`
    ADD CONSTRAINT `account_registration_requests_assigned_role_id_fkey`
    FOREIGN KEY (`assigned_role_id`) REFERENCES `roles`(`role_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `account_registration_requests`
    ADD CONSTRAINT `account_registration_requests_reviewed_by_user_id_fkey`
    FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
