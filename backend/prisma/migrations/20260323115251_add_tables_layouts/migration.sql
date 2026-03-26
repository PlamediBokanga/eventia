/*
  Warnings:

  - A unique constraint covering the columns `[activeTableLayoutId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `event` ADD COLUMN `activeTableLayoutId` INTEGER NULL;

-- CreateTable
CREATE TABLE `TableLayout` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `eventId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TableLayout_eventId_name_key`(`eventId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TableLayoutPosition` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `layoutId` INTEGER NOT NULL,
    `tableId` INTEGER NOT NULL,
    `positionX` DOUBLE NOT NULL,
    `positionY` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TableLayoutPosition_layoutId_tableId_key`(`layoutId`, `tableId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Event_activeTableLayoutId_key` ON `Event`(`activeTableLayoutId`);

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_activeTableLayoutId_fkey` FOREIGN KEY (`activeTableLayoutId`) REFERENCES `TableLayout`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TableLayout` ADD CONSTRAINT `TableLayout_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TableLayoutPosition` ADD CONSTRAINT `TableLayoutPosition_layoutId_fkey` FOREIGN KEY (`layoutId`) REFERENCES `TableLayout`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TableLayoutPosition` ADD CONSTRAINT `TableLayoutPosition_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `Table`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
