-- AlterTable
ALTER TABLE `event` ADD COLUMN `program` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `EventProgramItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timeLabel` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eventId` INTEGER NOT NULL,

    INDEX `EventProgramItem_eventId_order_idx`(`eventId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventProgramItem` ADD CONSTRAINT `EventProgramItem_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
