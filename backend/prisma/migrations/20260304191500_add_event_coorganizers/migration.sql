CREATE TABLE `EventCoOrganizer` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `eventId` INTEGER NOT NULL,
  `organizerId` INTEGER NOT NULL,
  `invitedById` INTEGER NOT NULL,

  UNIQUE INDEX `EventCoOrganizer_eventId_organizerId_key`(`eventId`, `organizerId`),
  INDEX `EventCoOrganizer_eventId_idx`(`eventId`),
  INDEX `EventCoOrganizer_organizerId_idx`(`organizerId`),
  INDEX `EventCoOrganizer_invitedById_idx`(`invitedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EventCoOrganizer`
  ADD CONSTRAINT `EventCoOrganizer_eventId_fkey`
    FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EventCoOrganizer_organizerId_fkey`
    FOREIGN KEY (`organizerId`) REFERENCES `Organizer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EventCoOrganizer_invitedById_fkey`
    FOREIGN KEY (`invitedById`) REFERENCES `Organizer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
