CREATE TABLE `Affiliate` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `voucherCode` VARCHAR(191) NOT NULL,
  `voucherDiscountPercent` INTEGER NOT NULL DEFAULT 5,
  `commissionAmount` INTEGER NOT NULL DEFAULT 1000,
  `bankName` VARCHAR(191) NULL,
  `bankAccountName` VARCHAR(191) NULL,
  `bankAccountNumber` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Affiliate_email_key`(`email`),
  UNIQUE INDEX `Affiliate_username_key`(`username`),
  UNIQUE INDEX `Affiliate_voucherCode_key`(`voucherCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AffiliateWithdrawal` (
  `id` VARCHAR(191) NOT NULL,
  `affiliateId` VARCHAR(191) NOT NULL,
  `amount` INTEGER NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID') NOT NULL DEFAULT 'PENDING',
  `note` VARCHAR(191) NULL,
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AffiliateWithdrawal_affiliateId_idx`(`affiliateId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Voucher`
  ADD COLUMN `affiliateId` VARCHAR(191) NULL,
  ADD INDEX `Voucher_affiliateId_idx`(`affiliateId`);

ALTER TABLE `CheckRequest`
  ADD COLUMN `affiliateId` VARCHAR(191) NULL,
  ADD COLUMN `affiliateCommissionAmount` INTEGER NOT NULL DEFAULT 0,
  ADD INDEX `CheckRequest_affiliateId_idx`(`affiliateId`);

ALTER TABLE `Voucher`
  ADD CONSTRAINT `Voucher_affiliateId_fkey`
  FOREIGN KEY (`affiliateId`) REFERENCES `Affiliate`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `CheckRequest`
  ADD CONSTRAINT `CheckRequest_affiliateId_fkey`
  FOREIGN KEY (`affiliateId`) REFERENCES `Affiliate`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AffiliateWithdrawal`
  ADD CONSTRAINT `AffiliateWithdrawal_affiliateId_fkey`
  FOREIGN KEY (`affiliateId`) REFERENCES `Affiliate`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
