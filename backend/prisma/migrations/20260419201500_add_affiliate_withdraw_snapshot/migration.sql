ALTER TABLE `AffiliateWithdrawal`
  ADD COLUMN `bankName` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `bankAccountName` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `bankAccountNumber` VARCHAR(191) NOT NULL DEFAULT '';

UPDATE `AffiliateWithdrawal` aw
JOIN `Affiliate` a ON a.`id` = aw.`affiliateId`
SET
  aw.`bankName` = COALESCE(a.`bankName`, ''),
  aw.`bankAccountName` = COALESCE(a.`bankAccountName`, ''),
  aw.`bankAccountNumber` = COALESCE(a.`bankAccountNumber`, '');
