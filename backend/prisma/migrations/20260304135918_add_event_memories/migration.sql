-- CreateTable
CREATE TABLE `EventMemory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mediaType` ENUM('IMAGE', 'VIDEO') NOT NULL,
    `mediaUrl` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `uploadedByName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eventId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventChatMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `senderType` ENUM('HOST', 'GUEST') NOT NULL,
    `senderName` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eventId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventMemory` ADD CONSTRAINT `EventMemory_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventChatMessage` ADD CONSTRAINT `EventChatMessage_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
