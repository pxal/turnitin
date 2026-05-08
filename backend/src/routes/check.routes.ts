import fs from "node:fs";
import path from "node:path";
import { Router, type Request } from "express";
import { z } from "zod";
import { config } from "../config";
import { verifyCheckFileAccessToken } from "../lib/file-access";
import { fetchWithTimeout } from "../lib/http";
import { generateUniqueCheckRequestPublicId } from "../lib/public-id";
import { prisma } from "../lib/prisma";
import { resolveManagedUploadPath, createManagedSourceReference } from "../lib/uploads";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { uploadPdfInMemory } from "../middleware/upload";
import {
  createPaymentQr,
  getGatewayPaymentStatus,
  PAYMENT_EXPIRY_SECONDS,
  PaymentGatewayStatusError,
  verifyVerscanSignature
} from "../services/payment.service";
import { expirePendingPayments } from "../services/payment-expiration.service";
import { getGatewaySettings } from "../services/runtime-settings.service";
import { resolvePackageByFileSize } from "../services/package.service";
import { calculateDiscountPricing, findActiveVoucherByCode, normalizeVoucherCode } from "../services/voucher.service";
import {
  getCekplagiatBalance,
  getCekplagiatResult
} from "../services/cekplagiat.service";
import {
  saveCheckProcessingOptions
} from "../services/check-processing-options.service";
import { notifyPaidOrder } from "../services/telegram-notification.service";
import {
  cleanupSourceFileForCheck,
  getExternalServiceErrorMessage,
  hasUsableCheckerJob,
  startCheckIfReady,
  syncCheckStatus
} from "../services/check-lifecycle.service";

const router = Router();
type RequestWithRawBody = Request & { rawBody?: string };

function requireSingleParam(value: string | string[] | undefined, label: string) {
  if (!value || Array.isArray(value)) {
    throw new Error(`Parameter ${label} tidak valid.`);
  }

  return value;
}

async function resolveCheckRequestLookup(lookup: string) {
  return prisma.checkRequest.findFirst({
    where: {
      OR: [{ id: lookup }, { publicId: lookup }]
    }
  });
}

async function resolveCheckRequestId(lookup: string) {
  const checkRequest = await prisma.checkRequest.findFirst({
    where: {
      OR: [{ id: lookup }, { publicId: lookup }]
    },
    select: {
      id: true
    }
  });

  return checkRequest?.id || null;
}

function sanitizeSourceFilename(filename?: string | null) {
  const fallback = "document.pdf";
  const trimmed = filename?.trim();

  if (!trimmed) {
    return fallback;
  }

  const safeName = path.basename(trimmed).replace(/[^a-zA-Z0-9._-]/g, "_");
  return safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
}

function buildPaymentCallbackUrl(checkRequestPublicId: string) {
  return `${config.appBaseUrl}/api/checks/${encodeURIComponent(checkRequestPublicId)}/payment-callback`;
}

async function notifyPaidOrderSafely(checkRequestId: string) {
  await notifyPaidOrder(checkRequestId).catch((error) => {
    console.error("Failed to send Telegram paid-order notification:", error);
  });
}

async function generateUniquePaymentCode(baseAmount: number) {
  await expirePendingPayments();

  const pendingAmounts = await prisma.checkRequest.findMany({
    where: {
      paymentStatus: "PENDING",
      finalAmount: {
        gte: baseAmount,
        lte: baseAmount + 300
      }
    },
    select: {
      finalAmount: true
    }
  });
  const usedCodes = new Set(pendingAmounts.map((item) => item.finalAmount - baseAmount));

  for (let attempt = 0; attempt < 301; attempt += 1) {
    const code = Math.floor(Math.random() * 301);
    if (!usedCodes.has(code)) {
      return code;
    }
  }

  for (let code = 0; code <= 300; code += 1) {
    if (!usedCodes.has(code)) {
      return code;
    }
  }

  throw new Error("Kode unik pembayaran sedang penuh. Silakan coba lagi beberapa saat.");
}

router.get("/:id/source-file/:filename?", async (req, res) => {
  let checkRequestId: string;
  try {
    const lookup = requireSingleParam(req.params.id, "id");
    const resolvedId = await resolveCheckRequestId(lookup);
    if (!resolvedId) {
      return res.status(404).json({ message: "Request tidak ditemukan." });
    }
    checkRequestId = resolvedId;
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "ID request tidak valid." });
  }

  const token = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
  if (!token || typeof token !== "string") {
    return res.status(401).json({ message: "Token akses file wajib dikirim." });
  }

  try {
    verifyCheckFileAccessToken(token, checkRequestId);
  } catch (error) {
    return res.status(401).json({
      message: error instanceof Error ? error.message : "Token akses file tidak valid."
    });
  }

  const checkRequest = await prisma.checkRequest.findUnique({
    where: { id: checkRequestId },
    select: {
      originalName: true,
      mimeType: true,
      sourceFileUrl: true
    }
  });

  if (!checkRequest?.sourceFileUrl) {
    return res.status(404).json({ message: "File sumber tidak tersedia." });
  }

  const filePath = resolveManagedUploadPath(checkRequest.sourceFileUrl);
  if (!filePath) {
    return res.status(404).json({ message: "File sumber tidak ditemukan." });
  }

  return res.sendFile(filePath, {
    headers: {
      "Content-Type": checkRequest.mimeType || "application/pdf",
      "Content-Disposition": `inline; filename="${path.basename(checkRequest.originalName)}"`,
      "Cache-Control": "private, no-store, max-age=0"
    }
  });
});

router.post("/:id/payment-callback", async (req, res) => {
  let checkRequestId: string;
  try {
    const lookup = requireSingleParam(req.params.id, "id");
    const resolvedId = await resolveCheckRequestId(lookup);
    if (!resolvedId) {
      return res.status(404).json({ message: "Request tidak ditemukan." });
    }
    checkRequestId = resolvedId;
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "ID request tidak valid." });
  }

  const rawBody = (req as RequestWithRawBody).rawBody || "";
  const verscanSignature = req.headers["x-gateway-signature"];
  const paymentPayload = z
    .object({
      merchant_ref_id: z.string().optional(),
      invoice: z.string().optional(),
      payment_id: z.string().optional(),
      external_id: z.string().optional(),
      amount: z.number().optional(),
      status: z.string(),
      paid_at: z.string().optional()
    })
    .safeParse(req.body);

  if (!paymentPayload.success) {
    return res.status(400).json({ message: "Payload callback pembayaran tidak valid." });
  }

  const gateway = await getGatewaySettings();
  if (gateway.secretKey) {
    if (!rawBody || !verscanSignature || !(await verifyVerscanSignature(rawBody, verscanSignature))) {
      return res.status(401).json({ message: "Signature callback Verscan Gateway tidak valid." });
    }
  }

  const isPaid = paymentPayload.data.status.toLowerCase() === "paid";
  const isFailed = ["failed", "expired", "cancelled"].includes(paymentPayload.data.status.toLowerCase());

  await prisma.$transaction([
    prisma.checkRequest.update({
      where: { id: checkRequestId },
      data: {
        paymentStatus: isPaid ? "PAID" : isFailed ? "FAILED" : "PENDING",
        checkStatus: isPaid ? "PAID" : "WAITING_PAYMENT"
      }
    }),
    prisma.payment.updateMany({
      where: { checkRequestId },
      data: {
        providerRef: paymentPayload.data.invoice || paymentPayload.data.payment_id,
        status: isPaid ? "PAID" : isFailed ? "FAILED" : "PENDING",
        paidAt: isPaid ? new Date(paymentPayload.data.paid_at || Date.now()) : null
      }
    })
  ]);

  if (isPaid) {
    await startCheckIfReady(checkRequestId).catch((error) => {
      console.error("Failed to auto-start checker after callback:", error);
    });
    await notifyPaidOrderSafely(checkRequestId);
  } else if (isFailed) {
    await cleanupSourceFileForCheck(checkRequestId).catch((error) => {
      console.error("Failed to cleanup file after failed payment callback:", error);
    });
  }

  return res.json({ success: true });
});

router.use(requireAuth);

router.get("/:id", async (req: AuthenticatedRequest, res) => {
  await expirePendingPayments();

  let checkRequest;
  try {
    const lookup = requireSingleParam(req.params.id, "id");
    checkRequest = await resolveCheckRequestLookup(lookup);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "ID request tidak valid." });
  }

  if (!checkRequest) {
    return res.status(404).json({ message: "Request tidak ditemukan." });
  }

  checkRequest = await prisma.checkRequest.findUnique({
    where: { id: checkRequest.id },
    include: {
      user: true,
      package: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!checkRequest) {
    return res.status(404).json({ message: "Request tidak ditemukan." });
  }

  if (req.auth?.role !== "admin" && checkRequest.userId !== req.auth?.id) {
    return res.status(403).json({ message: "Anda tidak berhak melihat request ini." });
  }

  const payment = checkRequest.payments[0] || null;

  return res.json({
    success: true,
    data: {
      id: checkRequest.id,
      publicId: checkRequest.publicId,
      originalName: checkRequest.originalName,
      fileSizeBytes: checkRequest.fileSizeBytes,
      paymentStatus: checkRequest.paymentStatus,
      checkStatus: checkRequest.checkStatus,
      checkerJobId: checkRequest.checkerJobId,
      similarityScore: checkRequest.similarityScore,
      aiScore: checkRequest.aiScore,
      resultSummary: checkRequest.resultSummary,
      hasResultReport: Boolean(checkRequest.resultReportUrl),
      reportDownloadUrl: checkRequest.resultReportUrl
        ? `${config.appBaseUrl}/api/checks/${encodeURIComponent(checkRequest.publicId)}/report`
        : null,
      package: {
        name: checkRequest.package.name,
        price: checkRequest.package.price,
        maxFileSizeMb: checkRequest.package.maxFileSizeMb
      },
      pricing: {
        originalAmount: checkRequest.originalAmount,
        discountCode: checkRequest.discountCode,
        discountPercent: checkRequest.discountPercent,
        discountAmount: checkRequest.discountAmount,
        uniquePaymentCode: checkRequest.uniquePaymentCode,
        finalAmount: checkRequest.finalAmount
      },
      user: {
        id: checkRequest.user.id,
        whatsapp: checkRequest.user.whatsapp,
        email: checkRequest.user.email,
        fullName: checkRequest.user.fullName
      },
      payment: payment
        ? {
            provider: payment.provider,
            providerRef: payment.providerRef,
            amount: payment.amount,
            qrUrl: payment.qrUrl,
            status: payment.status,
            expiresAt: payment.expiresAt ? payment.expiresAt.toISOString() : null,
            paidAt: payment.paidAt ? payment.paidAt.toISOString() : null
          }
        : null
    }
  });
});

router.post("/upload", uploadPdfInMemory.single("file"), async (req: AuthenticatedRequest, res) => {
  const file = req.file;
  const voucherCodeInput = typeof req.body?.voucherCode === "string" ? req.body.voucherCode.trim() : "";
  const excludeQuotesInput = typeof req.body?.excludeQuotes === "string" ? req.body.excludeQuotes.trim().toLowerCase() : "";
  const excludeBiblioInput = typeof req.body?.excludeBiblio === "string" ? req.body.excludeBiblio.trim().toLowerCase() : "";
  const excludeMatchesInput = typeof req.body?.excludeMatches === "string" ? req.body.excludeMatches.trim() : "";

  if (!file) {
    return res.status(400).json({ message: "File PDF wajib diunggah." });
  }

  if (req.auth?.role !== "user") {
    return res.status(403).json({ message: "Hanya user yang boleh membuat order upload." });
  }

  const excludeQuotes = excludeQuotesInput === "" ? true : excludeQuotesInput === "true";
  const excludeBiblio = excludeBiblioInput === "" ? true : excludeBiblioInput === "true";
  const excludeMatches = excludeMatchesInput || null;

  if (excludeQuotesInput && !["true", "false"].includes(excludeQuotesInput)) {
    return res.status(400).json({ message: "Nilai Kecualikan kutipan tidak valid." });
  }

  if (excludeBiblioInput && !["true", "false"].includes(excludeBiblioInput)) {
    return res.status(400).json({ message: "Nilai Kecualikan daftar pustaka tidak valid." });
  }

  if (excludeMatches && !/^(\d+\s*%|\d+\s*words?)$/i.test(excludeMatches)) {
    return res.status(400).json({
      message: "Format abaikan kecocokan harus seperti `1%` atau `5 words`."
    });
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
  if (!user) {
    return res.status(401).json({ message: "User belum login Google." });
  }

  const selectedPackage = await resolvePackageByFileSize(file.size);
  const voucher = voucherCodeInput ? await findActiveVoucherByCode(voucherCodeInput) : null;

  if (voucherCodeInput && !voucher) {
    if (file.path) {
      fs.promises.unlink(file.path).catch(() => {});
    }
    return res.status(400).json({
      success: false,
      message: "Kode voucher tidak valid atau sudah tidak aktif."
    });
  }

  const pricing = calculateDiscountPricing(selectedPackage.price, voucher?.discountPercent);
  const uniquePaymentCode = await generateUniquePaymentCode(pricing.finalAmount);
  const finalAmountWithUniqueCode = pricing.finalAmount + uniquePaymentCode;
  let balance;
  try {
    balance = await getCekplagiatBalance();
  } catch (error) {
    if (file.path) {
      fs.promises.unlink(file.path).catch(() => {});
    }
    return res.status(503).json({
      success: false,
      message: error instanceof Error ? error.message : "Layanan checker sedang tidak tersedia."
    });
  }

  if (balance.balance < config.cekplagiatCostPerCheck) {
    if (file.path) {
      fs.promises.unlink(file.path).catch(() => {});
    }
    return res.status(503).json({
      success: false,
      message:
        "Layanan pengecekan sedang mencapai limit operasional. Silakan coba lagi beberapa saat."
    });
  }

  const checkRequest = await prisma.checkRequest.create({
    data: {
      publicId: await generateUniqueCheckRequestPublicId(),
      userId: user.id,
      packageId: selectedPackage.id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      sourceFileUrl: createManagedSourceReference(file.filename),
      originalAmount: pricing.originalAmount,
      discountCode: voucher ? normalizeVoucherCode(voucher.code) : null,
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
      uniquePaymentCode,
      finalAmount: finalAmountWithUniqueCode
    }
  });

  await saveCheckProcessingOptions(checkRequest.id, {
    excludeQuotes,
    excludeBiblio,
    excludeMatches: excludeMatches || ""
  });

  let payment;
  try {
    payment = await createPaymentQr({
      orderId: checkRequest.publicId,
      amount: finalAmountWithUniqueCode,
      customerPhone: user.whatsapp || "0000000000",
      customerName: user.fullName,
      customerEmail: user.email,
      callbackUrl: buildPaymentCallbackUrl(checkRequest.publicId),
      metadata: {
        packageName: selectedPackage.name,
        fileName: file.originalname,
        fileSizeBytes: file.size,
        voucherCode: voucher?.code || null,
        discountPercent: pricing.discountPercent,
        discountAmount: pricing.discountAmount,
        uniquePaymentCode
      }
    });
  } catch (paymentError) {
    // Rollback: delete the orphan checkRequest so DB stays clean
    await prisma.checkRequest.delete({ where: { id: checkRequest.id } }).catch(() => {});
    if (file.path) {
      fs.promises.unlink(file.path).catch(() => {});
    }
    const message = paymentError instanceof Error ? paymentError.message : "Gagal membuat pembayaran.";
    return res.status(502).json({ success: false, message });
  }

  await prisma.payment.create({
    data: {
      checkRequestId: checkRequest.id,
      provider: payment.provider,
      providerRef: payment.providerRef,
      amount: payment.amount,
      qrUrl: payment.qrUrl,
      expiresAt: payment.expiredAt ? new Date(payment.expiredAt) : new Date(Date.now() + PAYMENT_EXPIRY_SECONDS * 1000)
    }
  });

  return res.json({
    success: true,
    checkRequestId: checkRequest.publicId,
    package: selectedPackage,
    pricing: {
      ...pricing,
      uniquePaymentCode,
      finalAmount: finalAmountWithUniqueCode,
      voucherCode: voucher?.code || null
    },
    payment
  });
});

router.get("/:id/payment-status", async (req: AuthenticatedRequest, res) => {
  await expirePendingPayments();

  let checkRequestId: string;
  try {
    const lookup = requireSingleParam(req.params.id, "id");
    const resolvedId = await resolveCheckRequestId(lookup);
    if (!resolvedId) {
      return res.status(404).json({ message: "Request tidak ditemukan." });
    }
    checkRequestId = resolvedId;
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "ID request tidak valid." });
  }

  const checkRequest = await prisma.checkRequest.findUnique({
    where: { id: checkRequestId },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!checkRequest || checkRequest.payments.length === 0) {
    return res.status(404).json({ message: "Data pembayaran tidak ditemukan." });
  }

  if (req.auth?.role !== "admin" && checkRequest.userId !== req.auth?.id) {
    return res.status(403).json({ message: "Anda tidak berhak melihat pembayaran ini." });
  }

  const payment = checkRequest.payments[0];
  if (payment.status === "EXPIRED" || checkRequest.paymentStatus === "EXPIRED") {
    return res.json({
      success: true,
      source: payment.provider,
      data: {
        merchant_ref_id: checkRequest.publicId,
        invoice: payment.providerRef || "",
        amount: payment.amount,
        status: "EXPIRED",
        paid_at: payment.paidAt ? payment.paidAt.toISOString() : undefined
      }
    });
  }

  const remoteRef = payment.providerRef || checkRequest.publicId;
  let remote: Awaited<ReturnType<typeof getGatewayPaymentStatus>> | null = null;

  try {
    remote = await getGatewayPaymentStatus(remoteRef);
  } catch (error) {
    const isPaymentNotFound =
      error instanceof PaymentGatewayStatusError && error.code === "PAYMENT_NOT_FOUND";

    if (!isPaymentNotFound && remoteRef !== checkRequest.publicId) {
      try {
        remote = await getGatewayPaymentStatus(checkRequest.publicId);
      } catch (fallbackError) {
        const fallbackNotFound =
          fallbackError instanceof PaymentGatewayStatusError && fallbackError.code === "PAYMENT_NOT_FOUND";

        if (!fallbackNotFound) {
          throw fallbackError;
        }
      }
    }

    if (!remote) {
      return res.json({
        success: true,
        source: "local-fallback",
        data: {
          merchant_ref_id: checkRequest.publicId,
          invoice: payment.providerRef || "",
          amount: payment.amount,
          status: payment.status,
          paid_at: payment.paidAt ? payment.paidAt.toISOString() : undefined
        },
        warning: `Status pembayaran belum tersedia di ${payment.provider}, menggunakan data lokal sementara.`
      });
    }
  }

  const normalizedStatus =
    remote.status.toLowerCase() === "paid"
      ? "PAID"
      : remote.status.toLowerCase() === "expired"
        ? "EXPIRED"
        : ["failed", "cancelled"].includes(remote.status.toLowerCase())
          ? "FAILED"
        : "PENDING";

  await prisma.$transaction([
    prisma.checkRequest.update({
      where: { id: checkRequest.id },
      data: {
        paymentStatus: normalizedStatus,
        checkStatus: normalizedStatus === "PAID" ? "PAID" : checkRequest.checkStatus
      }
    }),
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerRef: remote.invoice,
        status: normalizedStatus,
        paidAt: normalizedStatus === "PAID" && remote.paid_at ? new Date(remote.paid_at) : payment.paidAt
      }
    })
  ]);

  if (normalizedStatus === "PAID") {
    await startCheckIfReady(checkRequest.id).catch((error) => {
      console.error("Failed to auto-start checker after payment polling:", error);
    });
    await notifyPaidOrderSafely(checkRequest.id);
  } else if (normalizedStatus === "FAILED" || normalizedStatus === "EXPIRED") {
    await cleanupSourceFileForCheck(checkRequest.id).catch((error) => {
      console.error("Failed to cleanup file after failed payment polling:", error);
    });
  }

  return res.json({
    success: true,
    source: payment.provider,
    data: remote
  });
});

router.post("/:id/process", async (req: AuthenticatedRequest, res) => {
  let checkRequestId: string;
  try {
    const lookup = requireSingleParam(req.params.id, "id");
    const resolvedId = await resolveCheckRequestId(lookup);
    if (!resolvedId) {
      return res.status(404).json({ message: "Request tidak ditemukan." });
    }
    checkRequestId = resolvedId;
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "ID request tidak valid." });
  }

  const schema = z.object({
    excludeQuotes: z.boolean().optional(),
    excludeBiblio: z.boolean().optional(),
    excludeMatches: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Payload process tidak valid."
    });
  }

  const checkRequest = await prisma.checkRequest.findUnique({
    where: { id: checkRequestId }
  });

  if (!checkRequest) {
    return res.status(404).json({ message: "Request tidak ditemukan." });
  }

  if (req.auth?.role !== "admin" && checkRequest.userId !== req.auth?.id) {
    return res.status(403).json({ message: "Anda tidak berhak memproses request ini." });
  }

  if (checkRequest.paymentStatus !== "PAID") {
    return res.status(400).json({ message: "Pembayaran belum selesai." });
  }

  if (!checkRequest.sourceFileUrl) {
    return res.status(400).json({
      message: "File sumber untuk request ini tidak tersedia lagi."
    });
  }

  const started = await startCheckIfReady(checkRequestId, {
    excludeQuotes: parsed.data.excludeQuotes,
    excludeBiblio: parsed.data.excludeBiblio,
    excludeMatches: parsed.data.excludeMatches,
    resetFailedState: req.auth?.role === "admin" && checkRequest.checkStatus === "FAILED"
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
});

router.get("/:id/status", async (req: AuthenticatedRequest, res) => {
  let checkRequestId: string;
  try {
    const lookup = requireSingleParam(req.params.id, "id");
    const resolvedId = await resolveCheckRequestId(lookup);
    if (!resolvedId) {
      return res.status(404).json({ message: "Request tidak ditemukan." });
    }
    checkRequestId = resolvedId;
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "ID request tidak valid." });
  }

  const checkRequest = await prisma.checkRequest.findUnique({
    where: { id: checkRequestId }
  });

  if (!checkRequest) {
    return res.status(404).json({ message: "Request tidak ditemukan." });
  }

  if (req.auth?.role !== "admin" && checkRequest.userId !== req.auth?.id) {
    return res.status(403).json({ message: "Anda tidak berhak melihat status request ini." });
  }

  if (!hasUsableCheckerJob(checkRequest.checkerJobId)) {
    return res.json({
      success: true,
      source: "local",
      data: {
        status: checkRequest.checkStatus
      }
    });
  }

  const checkerJobId = checkRequest.checkerJobId;
  if (!checkerJobId || !hasUsableCheckerJob(checkerJobId)) {
    return res.json({
      success: true,
      source: "local",
      data: {
        status: checkRequest.checkStatus
      }
    });
  }

  const result = await syncCheckStatus(checkRequest.id);
  if (!result.success) {
    return res.status(result.statusCode || 502).json(result);
  }

  return res.json(result);
});

router.get("/:id/result", async (req: AuthenticatedRequest, res) => {
  let checkRequestId: string;
  try {
    const lookup = requireSingleParam(req.params.id, "id");
    const resolvedId = await resolveCheckRequestId(lookup);
    if (!resolvedId) {
      return res.status(404).json({ message: "Request tidak ditemukan." });
    }
    checkRequestId = resolvedId;
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "ID request tidak valid." });
  }

  const checkRequest = await prisma.checkRequest.findUnique({
    where: { id: checkRequestId }
  });

  if (!checkRequest || !hasUsableCheckerJob(checkRequest.checkerJobId)) {
    return res.status(404).json({ message: "Hasil belum tersedia." });
  }

  if (req.auth?.role !== "admin" && checkRequest.userId !== req.auth?.id) {
    return res.status(403).json({ message: "Anda tidak berhak melihat hasil request ini." });
  }

  const checkerJobId = checkRequest.checkerJobId;
  if (!checkerJobId || !hasUsableCheckerJob(checkerJobId)) {
    return res.status(404).json({ message: "Hasil belum tersedia." });
  }

  let remote;
  try {
    remote = await getCekplagiatResult(checkerJobId);
  } catch (error) {
    console.error(`[Cekplagiat] Result polling failed for checkRequest=${checkRequest.id}:`, error);
    return res.status(502).json({
      success: false,
      source: "cekplagiat",
      message: getExternalServiceErrorMessage(
        error,
        "Hasil dari layanan Cekplagiat belum bisa diambil. Silakan coba lagi beberapa saat."
      )
    });
  }
  const normalizedStatus =
    remote.status === "DONE"
      ? "COMPLETED"
      : remote.status === "ERROR" || remote.status === "FAILED"
        ? "FAILED"
        : "PROCESSING";

  await prisma.checkRequest.update({
    where: { id: checkRequest.id },
    data: {
      checkStatus: normalizedStatus,
      resultSummary: remote.log || null,
      resultReportUrl: remote.report_url || null
    }
  });

  if (normalizedStatus === "COMPLETED") {
    await cleanupSourceFileForCheck(checkRequest.id).catch((error) => {
      console.error("Failed to cleanup file after fetching final result:", error);
    });
  }

  return res.json({
    success: true,
    source: "cekplagiat",
    data: remote
  });
});

router.get("/:id/report", async (req: AuthenticatedRequest, res) => {
  let checkRequestId: string;
  try {
    const lookup = requireSingleParam(req.params.id, "id");
    const resolvedId = await resolveCheckRequestId(lookup);
    if (!resolvedId) {
      return res.status(404).json({ message: "Request tidak ditemukan." });
    }
    checkRequestId = resolvedId;
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "ID request tidak valid." });
  }

  const checkRequest = await prisma.checkRequest.findUnique({
    where: { id: checkRequestId },
    select: {
      userId: true,
      publicId: true,
      originalName: true,
      resultReportUrl: true
    }
  });

  if (!checkRequest?.resultReportUrl) {
    return res.status(404).json({ message: "Laporan belum tersedia." });
  }

  if (req.auth?.role !== "admin" && checkRequest.userId !== req.auth?.id) {
    return res.status(403).json({ message: "Anda tidak berhak mengunduh laporan ini." });
  }

  try {
    const response = await fetchWithTimeout(checkRequest.resultReportUrl, {
      method: "GET",
      headers: {
        Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8"
      },
      timeoutMs: 30000
    });

    if (!response.ok) {
      return res.status(502).json({ message: "Gagal mengambil file laporan dari server checker." });
    }

    const fileBuffer = Buffer.from(await response.arrayBuffer());
    const fallbackBaseName = sanitizeSourceFilename(checkRequest.originalName).replace(/\.pdf$/i, "");
    const filename = `${fallbackBaseName || checkRequest.publicId || "laporan-plagiarisme"}-report.pdf`;

    res.setHeader("Content-Type", response.headers.get("content-type") || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");

    return res.send(fileBuffer);
  } catch (error) {
    console.error("Failed to proxy report download:", error);
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Gagal mengunduh file laporan."
    });
  }
});

router.post("/:id/simulate-completed", async (req: AuthenticatedRequest, res) => {
  if (process.env.MOCK_PAYMENT !== "true") {
    return res.status(403).json({ message: "Simulasi hanya diijinkan dalam mode MOCK_PAYMENT." });
  }

  let checkRequestId: string;
  try {
    const lookup = requireSingleParam(req.params.id, "id");
    const resolvedId = await resolveCheckRequestId(lookup);
    if (!resolvedId) {
      return res.status(404).json({ message: "Request tidak ditemukan." });
    }
    checkRequestId = resolvedId;
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "ID request tidak valid." });
  }

  const existing = await prisma.checkRequest.findUnique({ where: { id: checkRequestId } });
  if (!existing) {
    return res.status(404).json({ message: "Request tidak ditemukan." });
  }

  if (req.auth?.role !== "admin" && existing.userId !== req.auth?.id) {
    return res.status(403).json({ message: "Anda tidak berhak mensimulasikan request ini." });
  }

  const similarityScore = Math.floor(Math.random() * 30) + 5; // 5% - 35%

  await prisma.checkRequest.update({
    where: { id: checkRequestId },
    data: {
      checkStatus: "COMPLETED",
      similarityScore: similarityScore,
      resultReportUrl: "https://www.turnitin.com/static/resources/sample-report.pdf" // Placeholder
    }
  });

  await cleanupSourceFileForCheck(checkRequestId).catch((error) => {
    console.error("Failed to cleanup file after simulated completion:", error);
  });

  return res.json({ success: true, score: similarityScore });
});

router.get("/user/:userId", async (req: AuthenticatedRequest, res) => {
  await expirePendingPayments();

  let userId: string;
  try {
    userId = requireSingleParam(req.params.userId, "userId");
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "User ID tidak valid." });
  }

  if (req.auth?.role !== "admin" && userId !== req.auth?.id) {
    return res.status(403).json({ success: false, message: "Anda tidak berhak melihat riwayat user lain." });
  }

  const rawPage = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
  const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const page = parseInt(String(rawPage || 1), 10) || 1;
  const limit = parseInt(String(rawLimit || 10), 10) || 10;
  const skip = (page - 1) * limit;

  try {
    const [checks, totalCount] = await prisma.$transaction([
      prisma.checkRequest.findMany({
        where: { userId },
        include: {
          package: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.checkRequest.count({ where: { userId } })
    ]);

    return res.json({
      success: true,
      data: checks.map(c => ({
        id: c.id,
        publicId: c.publicId,
        originalName: c.originalName,
        createdAt: c.createdAt,
        paymentStatus: c.paymentStatus,
        checkStatus: c.checkStatus,
        packageName: c.package.name,
        price: c.finalAmount || c.package.price
      })),
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Gagal mengambil riwayat." });
  }
});

export default router;
