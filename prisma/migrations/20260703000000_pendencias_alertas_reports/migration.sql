-- AlterTable
ALTER TABLE `Pendencia` ADD COLUMN `resolvedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `AlertaAcknowledgment` (
    `id` VARCHAR(191) NOT NULL,
    `alertaId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `acknowledgedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AlertaAcknowledgment_alertaId_userId_key`(`alertaId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AlertaAcknowledgment` ADD CONSTRAINT `AlertaAcknowledgment_alertaId_fkey` FOREIGN KEY (`alertaId`) REFERENCES `Alerta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlertaAcknowledgment` ADD CONSTRAINT `AlertaAcknowledgment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
