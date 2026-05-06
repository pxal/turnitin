ALTER TABLE `Package`
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD UNIQUE INDEX `Package_maxFileSizeMb_key`(`maxFileSizeMb`);

ALTER TABLE `CheckRequest`
  ADD COLUMN `originalAmount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `discountCode` VARCHAR(191) NULL,
  ADD COLUMN `discountPercent` INTEGER NULL,
  ADD COLUMN `discountAmount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `finalAmount` INTEGER NOT NULL DEFAULT 0;

UPDATE `CheckRequest` cr
JOIN `Package` p ON p.`id` = cr.`packageId`
SET
  cr.`originalAmount` = p.`price`,
  cr.`finalAmount` = p.`price`
WHERE cr.`originalAmount` = 0
   OR cr.`finalAmount` = 0;

CREATE TABLE `Voucher` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `discountPercent` INTEGER NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Voucher_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
