/*
  Warnings:

  - You are about to alter the column `logoUrl` on the `event` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(191)`.
  - You are about to alter the column `hostNames` on the `event` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(191)`.

*/
-- DropForeignKey
ALTER TABLE `eventcoorganizer` DROP FOREIGN KEY `EventCoOrganizer_eventId_fkey`;

-- DropForeignKey
ALTER TABLE `eventcoorganizer` DROP FOREIGN KEY `EventCoOrganizer_invitedById_fkey`;

-- DropForeignKey
ALTER TABLE `eventcoorganizer` DROP FOREIGN KEY `EventCoOrganizer_organizerId_fkey`;

-- DropIndex
DROP INDEX `EventCoOrganizer_eventId_idx` ON `eventcoorganizer`;

-- DropIndex
DROP INDEX `EventCoOrganizer_invitedById_idx` ON `eventcoorganizer`;

-- DropIndex
DROP INDEX `EventCoOrganizer_organizerId_idx` ON `eventcoorganizer`;

-- AlterTable
ALTER TABLE `event` MODIFY `logoUrl` VARCHAR(191) NULL,
    MODIFY `themePreset` VARCHAR(191) NULL,
    MODIFY `primaryColor` VARCHAR(191) NULL,
    MODIFY `accentColor` VARCHAR(191) NULL,
    MODIFY `fontFamily` VARCHAR(191) NULL,
    MODIFY `animationStyle` VARCHAR(191) NULL,
    MODIFY `hostNames` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `table` MODIFY `location` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `EventCoOrganizer` ADD CONSTRAINT `EventCoOrganizer_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventCoOrganizer` ADD CONSTRAINT `EventCoOrganizer_organizerId_fkey` FOREIGN KEY (`organizerId`) REFERENCES `Organizer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventCoOrganizer` ADD CONSTRAINT `EventCoOrganizer_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `Organizer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
