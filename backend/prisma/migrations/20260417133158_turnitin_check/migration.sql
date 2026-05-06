-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `googleSub` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_googleSub_key`(`googleSub`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Package` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `maxFileSizeMb` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileSizeBytes` INTEGER NOT NULL,
    `sourceFileUrl` VARCHAR(191) NULL,
    `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `checkStatus` ENUM('WAITING_PAYMENT', 'PAID', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'WAITING_PAYMENT',
    `checkerJobId` VARCHAR(191) NULL,
    `resultSummary` VARCHAR(191) NULL,
    `resultReportUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `Admin` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Admin_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CheckRequest` ADD CONSTRAINT `CheckRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckRequest` ADD CONSTRAINT `CheckRequest_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `Package`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_checkRequestId_fkey` FOREIGN KEY (`checkRequestId`) REFERENCES `CheckRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
