CREATE TABLE `document_access_requests` (
    `access_request_id` BIGINT NOT NULL AUTO_INCREMENT,
    `document_id` BIGINT NOT NULL,
    `requested_by_user_id` BIGINT NOT NULL,
    `request_reason` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewed_by_user_id` BIGINT NULL,
    `reviewer_remarks` TEXT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `document_access_requests_requester_status_created_idx` (`requested_by_user_id`, `status`, `created_at`),
    INDEX `document_access_requests_status_created_idx` (`status`, `created_at`),
    INDEX `document_access_requests_document_requester_status_idx` (`document_id`, `requested_by_user_id`, `status`),
    PRIMARY KEY (`access_request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `document_access_requests`
    ADD CONSTRAINT `document_access_requests_document_id_fkey`
    FOREIGN KEY (`document_id`) REFERENCES `documents`(`document_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `document_access_requests`
    ADD CONSTRAINT `document_access_requests_requested_by_user_id_fkey`
    FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `document_access_requests`
    ADD CONSTRAINT `document_access_requests_reviewed_by_user_id_fkey`
    FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
