-- AlterTable
ALTER TABLE `event` ADD COLUMN `guestbookRequiresApproval` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `guestbookmessage` ADD COLUMN `isHidden` BOOLEAN NOT NULL DEFAULT false;
