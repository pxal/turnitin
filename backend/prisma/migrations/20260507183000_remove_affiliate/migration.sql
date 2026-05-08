ALTER TABLE `AffiliateWithdrawal`
  DROP FOREIGN KEY `AffiliateWithdrawal_affiliateId_fkey`;

ALTER TABLE `Voucher`
  DROP FOREIGN KEY `Voucher_affiliateId_fkey`;

ALTER TABLE `CheckRequest`
  DROP FOREIGN KEY `CheckRequest_affiliateId_fkey`;

ALTER TABLE `Voucher`
  DROP INDEX `Voucher_affiliateId_idx`,
  DROP COLUMN `affiliateId`;

ALTER TABLE `CheckRequest`
  DROP INDEX `CheckRequest_affiliateId_idx`,
  DROP COLUMN `affiliateId`,
  DROP COLUMN `affiliateCommissionAmount`;

DROP TABLE `AffiliateWithdrawal`;

DROP TABLE `Affiliate`;
