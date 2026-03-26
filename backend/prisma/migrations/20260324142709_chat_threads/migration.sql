-- AlterTable
ALTER TABLE `eventchatmessage` ADD COLUMN `guestId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `EventChatMessage` ADD CONSTRAINT `EventChatMessage_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `Guest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
