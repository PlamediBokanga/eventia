-- AlterTable
ALTER TABLE `drinkoption` ADD COLUMN `availableQuantity` INTEGER NULL,
    ADD COLUMN `maxPerGuest` INTEGER NULL;

-- AlterTable
ALTER TABLE `event` ADD COLUMN `drinksEnabled` BOOLEAN NOT NULL DEFAULT true;
