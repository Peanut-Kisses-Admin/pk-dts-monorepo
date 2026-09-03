CREATE TABLE `system_appearance_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `theme_scope` VARCHAR(20) NOT NULL DEFAULT 'device',
    `color_mode` VARCHAR(20) NOT NULL DEFAULT 'light',
    `color_theme` VARCHAR(30) NOT NULL DEFAULT 'default',
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
