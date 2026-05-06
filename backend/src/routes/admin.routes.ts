import { Router } from "express";
import path from "node:path";
import { CheckStatus, PaymentStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { fetchWithTimeout } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { uploadBrandingImage } from "../middleware/upload";
import { config } from "../config";
import { cleanupManagedUpload } from "../lib/uploads";
import {
  getBrandingSettings,
  getGatewaySettings,
  getTelegramNotificationSettings,
  maskSecret,
  saveBrandingSettings,
  saveGatewaySettings,
  saveTelegramNotificationSettings
} from "../services/runtime-settings.service";
import { cleanupInactiveAffiliateVouchers, normalizeVoucherCode } from "../services/voucher.service";
import { hasUsableCheckerJob, startCheckIfReady } from "../services/check-lifecycle.service";

const router = Router();

router.use(requireAdmin);

router.get("/dashboard", async (req, res) => {
  const parsedQuery = z
    .object({
      packagePage: z.coerce.number().int().min(1).optional(),
      packageLimit: z.coerce.number().int().min(1).max(20).optional(),
      voucherPage: z.coerce.number().int().min(1).optional(),
      voucherLimit: z.coerce.number().int().min(1).max(20).optional()
    })
    .safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({ message: "Parameter dashboard admin tidak valid." });
  }

  const packagePage = parsedQuery.data.packagePage || 1;
  const packageLimit = parsedQuery.data.packageLimit || 5;
  const voucherPage = parsedQuery.data.voucherPage || 1;
  const voucherLimit = parsedQuery.data.voucherLimit || 5;
  const packageSkip = (packagePage - 1) * packageLimit;
  const voucherSkip = (voucherPage - 1) * voucherLimit;

  await cleanupInactiveAffiliateVouchers();

  const [users, requests, completedCount, failedCount, recentRequests, totalEarnings, packages, vouchers, affiliates, totalPackages, totalVouchers] = await Promise.all([
    prisma.user.count(),
    prisma.checkRequest.count(),
    prisma.checkRequest.count({ where: { checkStatus: "COMPLETED" } }),
    prisma.checkRequest.count({ where: { checkStatus: "FAILED" } }),
    prisma.checkRequest.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        package: true,
      }
    }),
    prisma.checkRequest.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { finalAmount: true }
    }),
    prisma.package.findMany({
      orderBy: [{ isActive: "desc" }, { maxFileSizeMb: "asc" }],
      skip: packageSkip,
      take: packageLimit
    }),
    prisma.voucher.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      skip: voucherSkip,
      take: voucherLimit
    }),
    prisma.affiliate.count(),
    prisma.package.count(),
    prisma.voucher.count()
  ]);

  return res.json({
    users,
    requests,
    completed: completedCount,
    failed: failedCount,
    affiliates,
    recentRequests,
    totalEarnings: totalEarnings._sum.finalAmount || 0,
    packages,
    vouchers,
    packagesPagination: {
      page: packagePage,
      limit: packageLimit,
      totalItems: totalPackages,
      totalPages: Math.max(1, Math.ceil(totalPackages / packageLimit))
    },
    vouchersPagination: {
      page: voucherPage,
      limit: voucherLimit,
      totalItems: totalVouchers,
      totalPages: Math.max(1, Math.ceil(totalVouchers / voucherLimit))
    }
  });
});

router.get("/affiliates", async (req, res) => {
  const parsedQuery = z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional()
    })
    .safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({ message: "Parameter affiliate admin tidak valid." });
  }

  const page = parsedQuery.data.page || 1;
  const limit = parsedQuery.data.limit || 10;
  const skip = (page - 1) * limit;

  const [affiliates, totalCount, totalVoucherUsages, totalAffiliateCommission] = await Promise.all([
    prisma.affiliate.findMany({
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: {
      checkRequests: {
        where: {
          paymentStatus: "PAID"
        },
        select: {
          id: true,
          finalAmount: true,
          affiliateCommissionAmount: true,
          discountCode: true,
          createdAt: true,
          user: {
            select: {
              fullName: true,
              email: true
            }
          }
        }
      },
      withdrawals: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          bankName: true,
          bankAccountName: true,
          bankAccountNumber: true,
          status: true,
          createdAt: true
        }
      }
    }
    }),
    prisma.affiliate.count(),
    prisma.checkRequest.count({
      where: {
        affiliateId: { not: null },
        paymentStatus: "PAID"
      }
    }),
    prisma.checkRequest.aggregate({
      where: {
        affiliateId: { not: null },
        paymentStatus: "PAID"
      },
      _sum: {
        affiliateCommissionAmount: true
      }
    })
  ]);

  return res.json({
    success: true,
    summary: {
      totalAffiliates: totalCount,
      totalVoucherUsages,
      totalAffiliateCommission: totalAffiliateCommission._sum.affiliateCommissionAmount || 0
    },
    data: affiliates.map((affiliate) => {
      const totalVoucherUsages = affiliate.checkRequests.length;
      const totalCommission = affiliate.checkRequests.reduce(
        (sum, item) => sum + item.affiliateCommissionAmount,
        0
      );
      const totalRevenue = affiliate.checkRequests.reduce((sum, item) => sum + item.finalAmount, 0);

      return {
        id: affiliate.id,
        email: affiliate.email,
        username: affiliate.username,
        voucherCode: affiliate.voucherCode,
        voucherDiscountPercent: affiliate.voucherDiscountPercent,
        commissionAmount: affiliate.commissionAmount,
        isActive: affiliate.isActive,
        bankName: affiliate.bankName,
        bankAccountName: affiliate.bankAccountName,
        bankAccountNumber: affiliate.bankAccountNumber,
        createdAt: affiliate.createdAt,
        stats: {
          totalVoucherUsages,
          totalCommission,
          totalRevenue
        },
        recentOrders: affiliate.checkRequests.slice(0, 10),
        withdrawals: affiliate.withdrawals
      };
    }),
    pagination: {
      page,
      limit,
      totalItems: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit))
    }
  });
});

router.post("/packages", async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1),
    maxFileSizeMb: z.number().int().positive(),
    price: z.number().int().nonnegative(),
    isActive: z.boolean().default(true)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Data paket tidak valid." });
  }

  try {
    const created = await prisma.package.create({
      data: parsed.data
    });

    return res.json({ success: true, data: created });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Gagal menambah paket."
    });
  }
});

router.put("/packages/:id", async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1),
    maxFileSizeMb: z.number().int().positive(),
    price: z.number().int().nonnegative(),
    isActive: z.boolean()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Data paket tidak valid." });
  }

  try {
    const updated = await prisma.package.update({
      where: { id: req.params.id },
      data: parsed.data
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Gagal memperbarui paket."
    });
  }
});

router.delete("/packages/:id", async (req, res) => {
  const relatedCount = await prisma.checkRequest.count({
    where: { packageId: req.params.id }
  });

  if (relatedCount > 0) {
    return res.status(400).json({
      message: "Paket ini sudah dipakai pada order dan tidak bisa dihapus. Nonaktifkan saja bila perlu."
    });
  }

  await prisma.package.delete({
    where: { id: req.params.id }
  });

  return res.json({ success: true });
});

router.post("/vouchers", async (req, res) => {
  const schema = z.object({
    code: z.string().trim().min(3),
    discountPercent: z.number().int().min(1).max(100),
    isActive: z.boolean().default(true)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Data voucher tidak valid." });
  }

  try {
    const created = await prisma.voucher.create({
      data: {
        code: normalizeVoucherCode(parsed.data.code),
        discountPercent: parsed.data.discountPercent,
        isActive: parsed.data.isActive
      }
    });

    return res.json({ success: true, data: created });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Gagal menambah voucher."
    });
  }
});

router.put("/vouchers/:id", async (req, res) => {
  const schema = z.object({
    code: z.string().trim().min(3),
    discountPercent: z.number().int().min(1).max(100),
    isActive: z.boolean()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Data voucher tidak valid." });
  }

  try {
    const updated = await prisma.voucher.update({
      where: { id: req.params.id },
      data: {
        code: normalizeVoucherCode(parsed.data.code),
        discountPercent: parsed.data.discountPercent,
        isActive: parsed.data.isActive
      }
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Gagal memperbarui voucher."
    });
  }
});

router.delete("/vouchers/:id", async (req, res) => {
  await prisma.voucher.delete({
    where: { id: req.params.id }
  });

  return res.json({ success: true });
});

router.get("/orders", async (req, res) => {
  const parsedQuery = z
    .object({
      status: z.nativeEnum(CheckStatus).optional(),
      payment: z.nativeEnum(PaymentStatus).optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional()
    })
    .safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ message: "Filter order tidak valid." });
  }

  const { status, payment } = parsedQuery.data;
  const page = parsedQuery.data.page || 1;
  const limit = parsedQuery.data.limit || 10;
  const skip = (page - 1) * limit;
  const where: Prisma.CheckRequestWhereInput = {};
  if (status) where.checkStatus = status;
  if (payment) where.paymentStatus = payment;

  const [orders, totalCount] = await Promise.all([
    prisma.checkRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: true,
        package: true,
        payments: {
          take: 1,
          orderBy: { createdAt: "desc" }
        }
      }
    }),
    prisma.checkRequest.count({ where })
  ]);

  return res.json({
    success: true,
    data: orders,
    pagination: {
      page,
      limit,
      totalItems: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit))
    }
  });
});

router.post("/orders/:id/process", async (req, res) => {
  const schema = z.object({
    excludeQuotes: z.boolean().optional(),
    excludeBiblio: z.boolean().optional(),
    excludeMatches: z.string().optional()
  });
  const parsedBody = schema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({ message: "Payload process tidak valid." });
  }

  const lookup = req.params.id;
  const checkRequest = await prisma.checkRequest.findFirst({
    where: {
      OR: [{ id: lookup }, { publicId: lookup }]
    }
  });

  if (!checkRequest) {
    return res.status(404).json({ message: "Request tidak ditemukan." });
  }

  if (checkRequest.paymentStatus !== "PAID") {
    return res.status(400).json({ message: "Pembayaran belum selesai." });
  }

  if (!checkRequest.sourceFileUrl) {
    return res.status(400).json({
      message: "File sumber untuk request ini tidak tersedia lagi."
    });
  }

  try {
    const started = await startCheckIfReady(checkRequest.id, {
      excludeQuotes: parsedBody.data.excludeQuotes,
      excludeBiblio: parsedBody.data.excludeBiblio,
      excludeMatches: parsedBody.data.excludeMatches,
      resetFailedState: checkRequest.checkStatus === "FAILED"
    });

    if (!started.started) {
      const current = started.request;

      if (current?.checkStatus === "COMPLETED" || hasUsableCheckerJob(current?.checkerJobId)) {
        return res.status(409).json({
          success: false,
          message: "Dokumen ini sudah sedang diproses atau sudah pernah disubmit.",
          data: {
            checkStatus: current?.checkStatus,
            checkerJobId: current?.checkerJobId
          }
        });
      }

      return res.status(409).json({
        success: false,
        message: "Request ini belum siap diproses atau sedang dikunci oleh proses lain."
      });
    }

    return res.json({
      success: true,
      job: started.job
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: error instanceof Error ? error.message : "Gagal memulai proses ulang dokumen."
    });
  }
});

router.get("/gateway", async (_req, res) => {
  const gateway = await getGatewaySettings();

  return res.json({
    provider: gateway.provider,
    baseUrl: gateway.baseUrl,
    apiKey: "",
    secretKey: "",
    hasApiKey: Boolean(gateway.apiKey),
    hasSecretKey: Boolean(gateway.secretKey),
    apiKeyMasked: gateway.apiKey ? maskSecret(gateway.apiKey) : "",
    secretKeyMasked: gateway.secretKey ? maskSecret(gateway.secretKey) : "",
    merchantCode: gateway.merchantCode,
    paymentCode: gateway.paymentCode,
    useHmac: gateway.useHmac,
    mockPayment: gateway.mockPayment,
    callbackUrlTemplate: `${config.appBaseUrl}/api/checks/:publicId/payment-callback`,
    returnUrlTemplate: `${config.frontendBaseUrl}/processing/:publicId`
  });
});

router.put("/gateway", async (req, res) => {
  const schema = z.object({
    provider: z.enum(["sekalipay", "versan"]).default("sekalipay"),
    baseUrl: z.string().url(),
    apiKey: z.string().optional().default(""),
    secretKey: z.string().optional().default(""),
    merchantCode: z.string().default(""),
    paymentCode: z.string().min(1),
    useHmac: z.boolean(),
    mockPayment: z.boolean()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Konfigurasi gateway tidak valid." });
  }

  const saved = await saveGatewaySettings({
    ...parsed.data
  });

  return res.json({
    success: true,
    data: {
      ...saved,
      apiKey: "",
      secretKey: "",
      hasApiKey: Boolean(saved.apiKey),
      hasSecretKey: Boolean(saved.secretKey),
      apiKeyMasked: saved.apiKey ? maskSecret(saved.apiKey) : "",
      secretKeyMasked: saved.secretKey ? maskSecret(saved.secretKey) : "",
      callbackUrlTemplate: `${config.appBaseUrl}/api/checks/:publicId/payment-callback`,
      returnUrlTemplate: `${config.frontendBaseUrl}/processing/:publicId`
    }
  });
});

router.get("/notifications", async (_req, res) => {
  const telegram = await getTelegramNotificationSettings();

  return res.json({
    telegram: {
      enabled: telegram.enabled,
      chatId: telegram.chatId,
      notifyPaidOrders: telegram.notifyPaidOrders,
      hasBotToken: Boolean(telegram.botToken),
      botTokenMasked: telegram.botToken ? maskSecret(telegram.botToken) : ""
    }
  });
});

router.put("/notifications", async (req, res) => {
  const schema = z.object({
    enabled: z.boolean(),
    botToken: z.string().optional(),
    chatId: z.string(),
    notifyPaidOrders: z.boolean()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Konfigurasi notifikasi tidak valid." });
  }

  const telegram = await saveTelegramNotificationSettings(parsed.data);
  return res.json({
    success: true,
    data: {
      telegram: {
        enabled: telegram.enabled,
        chatId: telegram.chatId,
        notifyPaidOrders: telegram.notifyPaidOrders,
        hasBotToken: Boolean(telegram.botToken),
        botTokenMasked: telegram.botToken ? maskSecret(telegram.botToken) : ""
      }
    }
  });
});

router.post("/notifications/test", async (_req, res) => {
  const telegram = await getTelegramNotificationSettings();

  if (!telegram.enabled || !telegram.botToken || !telegram.chatId) {
    return res.status(400).json({
      message: "Konfigurasi Telegram belum lengkap. Isi bot token, chat ID, lalu aktifkan notifikasi."
    });
  }

  const response = await fetchWithTimeout(
    `https://api.telegram.org/bot${encodeURIComponent(telegram.botToken)}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: telegram.chatId,
        text: [
          "Test notifikasi admin berhasil.",
          "",
          "Bot Telegram sudah terhubung dengan dashboard Verscan.",
          "Order berstatus PAID selanjutnya akan mengirim alert ke chat ini."
        ].join("\n")
      })
    }
  );

  const payload = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (!response.ok || !payload?.ok) {
    return res.status(502).json({
      message: payload?.description || "Gagal mengirim test notifikasi Telegram."
    });
  }

  return res.json({
    success: true,
    message: "Test notifikasi berhasil dikirim ke Telegram."
  });
});

router.get("/branding", async (_req, res) => {
  const branding = await getBrandingSettings();

  return res.json({
    success: true,
    data: branding
  });
});

router.put("/branding", async (req, res) => {
  const schema = z.object({
    brandName: z.string().trim().min(1),
    logoUrl: z.string().trim().optional().default(""),
    instagramUrl: z.union([z.string().trim().url(), z.literal("")]).optional().default(""),
    tiktokUrl: z.union([z.string().trim().url(), z.literal("")]).optional().default(""),
    whatsappUrl: z.union([z.string().trim().url(), z.literal("")]).optional().default("")
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Pengaturan branding tidak valid." });
  }

  const branding = await saveBrandingSettings(parsed.data);
  return res.json({
    success: true,
    data: branding
  });
});

router.post("/branding/logo", uploadBrandingImage.single("logo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File logo wajib dipilih." });
  }

  const currentBranding = await getBrandingSettings();
  const nextLogoUrl = `${config.publicUploadsBaseUrl}/${encodeURIComponent(path.basename(req.file.filename))}`;

  if (currentBranding.logoUrl && currentBranding.logoUrl !== nextLogoUrl) {
    await cleanupManagedUpload(currentBranding.logoUrl).catch((error) => {
      console.error("Failed to cleanup previous branding logo:", error);
    });
  }

  const branding = await saveBrandingSettings({
    ...currentBranding,
    logoUrl: nextLogoUrl
  });

  return res.json({
    success: true,
    data: branding
  });
});

export default router;
