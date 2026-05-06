ALTER TABLE `CheckRequest`
ADD COLUMN `publicId` VARCHAR(191) NULL;

UPDATE `CheckRequest`
SET `publicId` = LOWER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 10))
WHERE `publicId` IS NULL;

ALTER TABLE `CheckRequest`
MODIFY `publicId` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `CheckRequest_publicId_key` ON `CheckRequest`(`publicId`);
