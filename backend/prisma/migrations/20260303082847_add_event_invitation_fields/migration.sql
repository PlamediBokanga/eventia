-- AlterTable
ALTER TABLE `event` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `coverImageUrl` VARCHAR(191) NULL,
    ADD COLUMN `details` VARCHAR(191) NULL,
    ADD COLUMN `invitationMessage` VARCHAR(191) NULL;
