import { prisma } from "../lib/prisma";

export function normalizeVoucherCode(value: string) {
  return value.trim().toUpperCase();
}

export async function findActiveVoucherByCode(code: string) {
  const normalizedCode = normalizeVoucherCode(code);
  if (!normalizedCode) {
    return null;
  }

  return prisma.voucher.findFirst({
    where: {
      code: normalizedCode,
      isActive: true
    }
  });
}

export function calculateDiscountPricing(amount: number, discountPercent?: number | null) {
  const safeOriginalAmount = Math.max(0, Math.round(amount));
  const safeDiscountPercent = Math.max(0, Math.min(100, discountPercent || 0));
  const discountAmount = Math.round((safeOriginalAmount * safeDiscountPercent) / 100);
  const finalAmount = Math.max(0, safeOriginalAmount - discountAmount);

  return {
    originalAmount: safeOriginalAmount,
    discountPercent: safeDiscountPercent || null,
    discountAmount,
    finalAmount
  };
}
