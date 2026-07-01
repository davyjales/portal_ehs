-- CreateTable
CREATE TABLE `ThemeSettings` (
    `id` VARCHAR(191) NOT NULL,
    `environmentImage` VARCHAR(191) NOT NULL,
    `healthImage` VARCHAR(191) NOT NULL,
    `safetyImage` VARCHAR(191) NOT NULL,
    `teamImage` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ThemeSettings` (`id`, `environmentImage`, `healthImage`, `safetyImage`, `teamImage`)
VALUES (
    'default',
    '/backgrounds/environment.jpg',
    '/backgrounds/health.jpg',
    '/backgrounds/safety.jpg',
    '/backgrounds/ehs_team.jpg'
);
