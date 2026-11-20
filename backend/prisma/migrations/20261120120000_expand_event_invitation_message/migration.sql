-- Keep full invitation HTML/text; the original migration created this as VARCHAR(191).
ALTER TABLE `event`
  MODIFY COLUMN `invitationMessage` TEXT NULL;
