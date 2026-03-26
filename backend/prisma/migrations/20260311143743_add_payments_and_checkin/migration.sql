/*
  Warnings:

  - You are about to alter the column `paymentLink` on the `payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `payment` MODIFY `currency` VARCHAR(191) NOT NULL,
    MODIFY `provider` VARCHAR(191) NOT NULL,
    MODIFY `paymentLink` VARCHAR(191) NULL;
