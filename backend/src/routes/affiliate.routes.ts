import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAffiliate, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.use(requireAffiliate);

function toCurrencyInt(value: number) {
  return Math.max(0, Math.round(value));
}

function buildAffiliateVoucherSeed(username: string) {
  const lettersOnly = username.trim().toLowerCase().replace(/[^a-z]/g, "");
  return (lettersOnly || "aff").slice(0, 3).toUpperCase().padEnd(3, "X");
}

async function buildAffiliateSummary(
  affiliateId: string,
  options?: {
    ordersPage?: number;
    ordersLimit?: number;
    withdrawalsPage?: number;
    withdrawalsLimit?: number;
  }
) {
  const ordersPage = Math.max(1, options?.ordersPage || 1);
  const ordersLimit = Math.max(1, Math.min(20, options?.ordersLimit || 5));
  const withdrawalsPage = Math.max(1, options?.withdrawalsPage || 1);
  const withdrawalsLimit = Math.max(1, Math.min(20, options?.withdrawalsLimit || 5));
  const ordersSkip = (ordersPage - 1) * ordersLimit;
  const withdrawalsSkip = (withdrawalsPage - 1) * withdrawalsLimit;

  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: {
      id: true,
      email: true,
      username: true,
      voucherCode: true,
      voucherDiscountPercent: true,
      commissionAmount: true,
      bankName: true,
      bankAccountName: true,
      bankAccountNumber: true,
      createdAt: true
    }
  });

  if (!affiliate) {
    return null;
  }

  const [
    paidOrdersCount,
    commissionAggregate,
    pendingWithdrawalAggregate,
    completedWithdrawalAggregate,
    recentOrders,
    withdrawals,
    totalRecentOrders,
    totalWithdrawals
  ] =
    await Promise.all([
      prisma.checkRequest.count({
        where: {
          affiliateId,
          paymentStatus: "PAID"
        }
      }),
      prisma.checkRequest.aggregate({
        where: {
          affiliateId,
          paymentStatus: "PAID"
        },
        _sum: {
          affiliateCommissionAmount: true
        }
      }),
      prisma.affiliateWithdrawal.aggregate({
        where: {
          affiliateId,
          status: {
            in: ["PENDING", "APPROVED", "PAID"]
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.affiliateWithdrawal.aggregate({
        where: {
          affiliateId,
          status: "PAID"
        },
        _sum: {
          amount: true
        }
      }),
      prisma.checkRequest.findMany({
        where: {
          affiliateId,
          paymentStatus: "PAID"
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: ordersSkip,
        take: ordersLimit,
        select: {
          id: true,
          publicId: true,
          originalName: true,
          finalAmount: true,
          affiliateCommissionAmount: true,
          discountCode: true,
          createdAt: true,
          paymentStatus: true,
          checkStatus: true,
          user: {
            select: {
              fullName: true,
              email: true
            }
          }
        }
      }),
      prisma.affiliateWithdrawal.findMany({
        where: { affiliateId },
        orderBy: { createdAt: "desc" },
        skip: withdrawalsSkip,
        take: withdrawalsLimit,
        select: {
          id: true,
          amount: true,
          bankName: true,
          bankAccountName: true,
          bankAccountNumber: true,
          status: true,
          createdAt: true
        }
      }),
      prisma.checkRequest.count({
        where: {
          affiliateId,
          paymentStatus: "PAID"
        }
      }),
      prisma.affiliateWithdrawal.count({
        where: { affiliateId }
      })
    ]);

  const totalCommission = commissionAggregate._sum.affiliateCommissionAmount || 0;
  const reservedForWithdrawals = pendingWithdrawalAggregate._sum.amount || 0;
  const totalWithdrawn = completedWithdrawalAggregate._sum.amount || 0;

  return {
    affiliate,
    stats: {
      paidOrdersCount,
      totalCommission,
      totalWithdrawn,
      availableCommission: Math.max(0, totalCommission - reservedForWithdrawals)
    },
    recentOrders,
    withdrawals,
    recentOrdersPagination: {
      page: ordersPage,
      limit: ordersLimit,
      totalItems: totalRecentOrders,
      totalPages: Math.max(1, Math.ceil(totalRecentOrders / ordersLimit))
    },
    withdrawalsPagination: {
      page: withdrawalsPage,
      limit: withdrawalsLimit,
      totalItems: totalWithdrawals,
      totalPages: Math.max(1, Math.ceil(totalWithdrawals / withdrawalsLimit))
    }
  };
}

async function generateUniqueAffiliateVoucherCode(username: string) {
  const seed = buildAffiliateVoucherSeed(username);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    const nextCode = `${seed}${suffix}`;
    const existing = await prisma.voucher.findUnique({
      where: { code: nextCode },
      select: { id: true }
    });

    if (!existing) {
      return nextCode;
    }
  }

  throw new Error("Gagal membuat voucher affiliate baru.");
}

router.get("/dashboard", async (req: AuthenticatedRequest, res) => {
  const parsedQuery = z
    .object({
      ordersPage: z.coerce.number().int().min(1).optional(),
      ordersLimit: z.coerce.number().int().min(1).max(20).optional(),
      withdrawalsPage: z.coerce.number().int().min(1).optional(),
      withdrawalsLimit: z.coerce.number().int().min(1).max(20).optional()
    })
    .safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({ message: "Parameter pagination affiliate tidak valid." });
  }

  const summary = await buildAffiliateSummary(req.auth!.id, parsedQuery.data);
  if (!summary) {
    return res.status(404).json({ message: "Affiliate tidak ditemukan." });
  }

  return res.json({
    success: true,
    data: summary
  });
});

router.put("/bank-account", async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    bankName: z.string().trim().min(2),
    bankAccountName: z.string().trim().min(2),
    bankAccountNumber: z.string().trim().min(5).max(40)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Data rekening affiliate tidak valid." });
  }

  const updated = await prisma.affiliate.update({
    where: { id: req.auth!.id },
    data: {
      bankName: parsed.data.bankName,
      bankAccountName: parsed.data.bankAccountName,
      bankAccountNumber: parsed.data.bankAccountNumber
    }
  });

  return res.json({
    success: true,
    data: {
      bankName: updated.bankName,
      bankAccountName: updated.bankAccountName,
      bankAccountNumber: updated.bankAccountNumber
    }
  });
});

router.post("/voucher/regenerate", async (req: AuthenticatedRequest, res) => {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: req.auth!.id },
    select: {
      id: true,
      username: true,
      voucherDiscountPercent: true
    }
  });

  if (!affiliate) {
    return res.status(404).json({ message: "Affiliate tidak ditemukan." });
  }

  const nextCode = await generateUniqueAffiliateVoucherCode(affiliate.username);

  await prisma.$transaction(async (tx) => {
    await tx.voucher.updateMany({
      where: {
        affiliateId: affiliate.id
      },
      data: {
        isActive: false
      }
    });

    await tx.affiliate.update({
      where: { id: affiliate.id },
      data: {
        voucherCode: nextCode
      }
    });

    await tx.voucher.create({
      data: {
        code: nextCode,
        discountPercent: affiliate.voucherDiscountPercent,
        isActive: true,
        affiliateId: affiliate.id
      }
    });
  });

  return res.json({
    success: true,
    data: {
      voucherCode: nextCode,
      voucherDiscountPercent: affiliate.voucherDiscountPercent
    }
  });
});

router.post("/withdrawals", async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    amount: z.number().int().min(1000)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Nominal withdraw tidak valid." });
  }

  const summary = await buildAffiliateSummary(req.auth!.id);
  if (!summary) {
    return res.status(404).json({ message: "Affiliate tidak ditemukan." });
  }

  if (!summary.affiliate.bankName || !summary.affiliate.bankAccountName || !summary.affiliate.bankAccountNumber) {
    return res.status(400).json({ message: "Lengkapi data rekening sebelum mengajukan withdraw." });
  }

  const amount = toCurrencyInt(parsed.data.amount);
  if (amount > summary.stats.availableCommission) {
    return res.status(400).json({ message: "Saldo komisi tersedia tidak mencukupi untuk withdraw." });
  }

  const withdrawal = await prisma.affiliateWithdrawal.create({
    data: {
      affiliateId: req.auth!.id,
      amount,
      bankName: summary.affiliate.bankName,
      bankAccountName: summary.affiliate.bankAccountName,
      bankAccountNumber: summary.affiliate.bankAccountNumber,
      status: "PENDING"
    }
  });

  return res.json({
    success: true,
    data: withdrawal
  });
});

export default router;
