CREATE TABLE `EventCoOrganizerInvite` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `acceptedAt` DATETIME(3) NULL,
  `eventId` INT NOT NULL,
  `invitedById` INT NOT NULL,
  `acceptedById` INT NULL,
  UNIQUE INDEX `EventCoOrganizerInvite_token_key` (`token`),
  UNIQUE INDEX `EventCoOrganizerInvite_eventId_email_key` (`eventId`, `email`),
  PRIMARY KEY (`id`),
  CONSTRAINT `EventCoOrganizerInvite_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `EventCoOrganizerInvite_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `Organizer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `EventCoOrganizerInvite_acceptedById_fkey` FOREIGN KEY (`acceptedById`) REFERENCES `Organizer` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
