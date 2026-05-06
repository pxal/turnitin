-- Turnitin / Verscan schema bootstrap
-- Import this into an empty MySQL/MariaDB database such as `turnitin_db`.
-- Recommended: create the database first, then run this file inside that database.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `googleSub` VARCHAR(191) NOT NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `avatarUrl` VARCHAR(191) NULL,
  `whatsapp` VARCHAR(191) NULL,
  `historyPinHash` VARCHAR(191) NULL,
  `historyPinUpdatedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `User_email_key` (`email`),
  UNIQUE INDEX `User_googleSub_key` (`googleSub`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Package` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `maxFileSizeMb` INTEGER NOT NULL,
  `price` INTEGER NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Package_maxFileSizeMb_key` (`maxFileSizeMb`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Affiliate_email_key` (`email`),
  UNIQUE INDEX `Affiliate_username_key` (`username`),
  UNIQUE INDEX `Affiliate_voucherCode_key` (`voucherCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Voucher` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `discountPercent` INTEGER NOT NULL,
  `affiliateId` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Voucher_code_key` (`code`),
  INDEX `Voucher_affiliateId_idx` (`affiliateId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CheckRequest` (
  `id` VARCHAR(191) NOT NULL,
  `publicId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `packageId` VARCHAR(191) NOT NULL,
  `affiliateId` VARCHAR(191) NULL,
  `originalName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `fileSizeBytes` INTEGER NOT NULL,
  `sourceFileUrl` VARCHAR(191) NULL,
  `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  `checkStatus` ENUM('WAITING_PAYMENT', 'PAID', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'WAITING_PAYMENT',
  `checkerJobId` VARCHAR(191) NULL,
  `similarityScore` INTEGER NULL,
  `aiScore` INTEGER NULL,
  `originalAmount` INTEGER NOT NULL DEFAULT 0,
  `discountCode` VARCHAR(191) NULL,
  `discountPercent` INTEGER NULL,
  `discountAmount` INTEGER NOT NULL DEFAULT 0,
  `finalAmount` INTEGER NOT NULL DEFAULT 0,
  `affiliateCommissionAmount` INTEGER NOT NULL DEFAULT 0,
  `resultSummary` VARCHAR(191) NULL,
  `resultReportUrl` VARCHAR(191) NULL,
  `paymentNotifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CheckRequest_publicId_key` (`publicId`),
  INDEX `CheckRequest_affiliateId_idx` (`affiliateId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Payment` (
  `id` VARCHAR(191) NOT NULL,
  `checkRequestId` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(191) NOT NULL,
  `providerRef` VARCHAR(191) NULL,
  `amount` INTEGER NOT NULL,
  `qrUrl` VARCHAR(191) NULL,
  `status` ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Admin` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Admin_email_key` (`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AffiliateWithdrawal` (
  `id` VARCHAR(191) NOT NULL,
  `affiliateId` VARCHAR(191) NOT NULL,
  `amount` INTEGER NOT NULL,
  `bankName` VARCHAR(191) NOT NULL,
  `bankAccountName` VARCHAR(191) NOT NULL,
  `bankAccountNumber` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID') NOT NULL DEFAULT 'PENDING',
  `note` VARCHAR(191) NULL,
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `AffiliateWithdrawal_affiliateId_idx` (`affiliateId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Voucher`
  ADD CONSTRAINT `Voucher_affiliateId_fkey`
  FOREIGN KEY (`affiliateId`) REFERENCES `Affiliate` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `CheckRequest`
  ADD CONSTRAINT `CheckRequest_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CheckRequest`
  ADD CONSTRAINT `CheckRequest_packageId_fkey`
  FOREIGN KEY (`packageId`) REFERENCES `Package` (`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CheckRequest`
  ADD CONSTRAINT `CheckRequest_affiliateId_fkey`
  FOREIGN KEY (`affiliateId`) REFERENCES `Affiliate` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Payment`
  ADD CONSTRAINT `Payment_checkRequestId_fkey`
  FOREIGN KEY (`checkRequestId`) REFERENCES `CheckRequest` (`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AffiliateWithdrawal`
  ADD CONSTRAINT `AffiliateWithdrawal_affiliateId_fkey`
  FOREIGN KEY (`affiliateId`) REFERENCES `Affiliate` (`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
