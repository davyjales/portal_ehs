-- AlterTable EHSContent: add summary
ALTER TABLE `EHSContent` ADD COLUMN `summary` TEXT NULL;

-- Backfill summary from body (first 120 chars)
UPDATE `EHSContent` SET `summary` = LEFT(`body`, 120) WHERE `summary` IS NULL;

ALTER TABLE `EHSContent` MODIFY COLUMN `summary` TEXT NOT NULL;

-- AlterTable UserScore: add correctCount and responseTimeMs
ALTER TABLE `UserScore` ADD COLUMN `correctCount` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `UserScore` ADD COLUMN `responseTimeMs` INTEGER NOT NULL DEFAULT 0;

-- CreateTable QuizQuestion
CREATE TABLE `QuizQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `question` VARCHAR(191) NOT NULL,
    `options` TEXT NOT NULL,
    `correct` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable UserQuizAssignment
CREATE TABLE `UserQuizAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `challengeId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,

    UNIQUE INDEX `UserQuizAssignment_userId_challengeId_questionId_key`(`userId`, `challengeId`, `questionId`),
    UNIQUE INDEX `UserQuizAssignment_userId_challengeId_order_key`(`userId`, `challengeId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
