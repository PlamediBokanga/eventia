-- Add detailed guest fields
ALTER TABLE `Guest`
  ADD COLUMN `lastName` VARCHAR(191) NULL,
  ADD COLUMN `middleName` VARCHAR(191) NULL,
  ADD COLUMN `firstName` VARCHAR(191) NULL,
  ADD COLUMN `email` VARCHAR(191) NULL,
  ADD COLUMN `sex` ENUM('M', 'F') NULL,
  ADD COLUMN `category` VARCHAR(191) NULL,
  ADD COLUMN `guestType` ENUM('COUPLE', 'MR', 'MME', 'MLLE') NULL;
