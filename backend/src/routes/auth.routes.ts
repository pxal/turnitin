import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config";
import { clearSessionCookie, setSessionCookie } from "../lib/cookies";
import { hashPassword, needsPasswordRehash, verifyPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { createSignedToken } from "../lib/tokens";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { createRateLimit } from "../middleware/rate-limit";
import { verifyGoogleIdToken } from "../services/google-auth.service";

const router = Router();
const adminLoginRateLimit = createRateLimit({
  keyPrefix: "admin-login",
  maxAttempts: 5,
  windowMs: 10 * 60 * 1000,
  message: "Terlalu banyak percobaan login admin. Coba lagi beberapa menit lagi."
});
const historyPinSetupRateLimit = createRateLimit({
  keyPrefix: "history-pin-setup",
  maxAttempts: 5,
  windowMs: 10 * 60 * 1000,
  message: "Terlalu banyak percobaan mengatur PIN. Coba lagi beberapa menit lagi.",
  keyGenerator: (req) => (req as AuthenticatedRequest).auth?.id || req.ip || "unknown"
});
const affiliateRegisterRateLimit = createRateLimit({
  keyPrefix: "affiliate-register",
  maxAttempts: 6,
  windowMs: 10 * 60 * 1000,
  message: "Terlalu banyak percobaan daftar affiliate. Coba lagi beberapa menit lagi."
});
const affiliateLoginRateLimit = createRateLimit({
  keyPrefix: "affiliate-login",
  maxAttempts: 8,
  windowMs: 10 * 60 * 1000,
  message: "Terlalu banyak percobaan login affiliate. Coba lagi beberapa menit lagi."
});

function normalizeAffiliateEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeAffiliateUsername(username: string) {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function buildAffiliateVoucherSeed(username: string) {
  const lettersOnly = normalizeAffiliateUsername(username).replace(/[^a-z]/g, "");
  return (lettersOnly || "aff").slice(0, 3).toUpperCase().padEnd(3, "X");
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

  throw new Error("Gagal membuat kode voucher affiliate unik.");
}
const historyPinVerifyRateLimit = createRateLimit({
  keyPrefix: "history-pin-verify",
  maxAttempts: 8,
  windowMs: 10 * 60 * 1000,
  message: "Terlalu banyak percobaan PIN. Coba lagi beberapa menit lagi.",
  keyGenerator: (req) => (req as AuthenticatedRequest).auth?.id || req.ip || "unknown"
});

router.post("/google", async (req, res) => {
  const schema = z.object({
    idToken: z.string().min(20)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Payload Google login tidak valid." });
  }

  const googleUser = await verifyGoogleIdToken(parsed.data.idToken);

  const user = await prisma.user.upsert({
    where: { email: googleUser.email },
    update: {
      googleSub: googleUser.sub,
      fullName: googleUser.name,
      avatarUrl: googleUser.picture
    },
    create: {
      email: googleUser.email,
      googleSub: googleUser.sub,
      fullName: googleUser.name,
      avatarUrl: googleUser.picture
    }
  });

  const token = createSignedToken(
    {
      sub: user.id,
      role: "user",
      email: user.email,
      name: user.fullName
    },
    60 * 60 * 24 * 7
  );
  setSessionCookie(res, token, 60 * 60 * 24 * 7, "user");

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl
    }
  });
});

router.post("/admin/login", adminLoginRateLimit, async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Email atau password admin tidak valid." });
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const envEmail = config.adminEmail.toLowerCase();

  if (!envEmail || !config.adminPasswordHash) {
    return res.status(503).json({ message: "Akun admin belum dikonfigurasi di server." });
  }

  if (normalizedEmail !== envEmail || !verifyPassword(parsed.data.password, config.adminPasswordHash)) {
    return res.status(401).json({ message: "Email atau password admin salah." });
  }

  const admin = await prisma.admin.upsert({
    where: { email: normalizedEmail },
    update: {
      passwordHash: config.adminPasswordHash
    },
    create: {
      email: normalizedEmail,
      passwordHash: config.adminPasswordHash
    }
  });

  const token = createSignedToken(
    {
      sub: admin.id,
      role: "admin",
      email: admin.email,
      name: "Admin"
    },
    60 * 60 * 8
  );
  setSessionCookie(res, token, 60 * 60 * 8, "admin");

  return res.json({
    success: true,
    admin: {
      id: admin.id,
      email: admin.email
    }
  });
});

router.post("/affiliate/register", affiliateRegisterRateLimit, async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    username: z.string().trim().min(3).max(30),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Data pendaftaran affiliate tidak valid." });
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return res.status(400).json({ message: "Konfirmasi password tidak cocok." });
  }

  const email = normalizeAffiliateEmail(parsed.data.email);
  const username = normalizeAffiliateUsername(parsed.data.username);

  if (username.length < 3) {
    return res.status(400).json({ message: "Username affiliate minimal 3 karakter valid." });
  }

  const existing = await prisma.affiliate.findFirst({
    where: {
      OR: [{ email }, { username }]
    },
    select: {
      id: true,
      email: true,
      username: true
    }
  });

  if (existing) {
    return res.status(409).json({
      message:
        existing.email === email
          ? "Email affiliate sudah terdaftar."
          : "Username affiliate sudah dipakai."
    });
  }

  const voucherCode = await generateUniqueAffiliateVoucherCode(username);

  const affiliate = await prisma.$transaction(async (tx) => {
    const createdAffiliate = await tx.affiliate.create({
      data: {
        email,
        username,
        passwordHash: hashPassword(parsed.data.password),
        voucherCode,
        voucherDiscountPercent: 5,
        commissionAmount: 1000
      }
    });

    await tx.voucher.create({
      data: {
        code: voucherCode,
        discountPercent: 5,
        isActive: true,
        affiliateId: createdAffiliate.id
      }
    });

    return createdAffiliate;
  });

  const token = createSignedToken(
    {
      sub: affiliate.id,
      role: "affiliate",
      email: affiliate.email,
      name: affiliate.username
    },
    60 * 60 * 24 * 7
  );
  setSessionCookie(res, token, 60 * 60 * 24 * 7, "affiliate");

  return res.json({
    success: true,
    affiliate: {
      id: affiliate.id,
      email: affiliate.email,
      username: affiliate.username,
      voucherCode: affiliate.voucherCode,
      voucherDiscountPercent: affiliate.voucherDiscountPercent,
      commissionAmount: affiliate.commissionAmount
    }
  });
});

router.post("/affiliate/login", affiliateLoginRateLimit, async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Email atau password affiliate tidak valid." });
  }

  const email = normalizeAffiliateEmail(parsed.data.email);
  const affiliate = await prisma.affiliate.findUnique({
    where: { email }
  });

  if (!affiliate || !verifyPassword(parsed.data.password, affiliate.passwordHash)) {
    return res.status(401).json({ message: "Email atau password affiliate salah." });
  }

  if (needsPasswordRehash(affiliate.passwordHash)) {
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        passwordHash: hashPassword(parsed.data.password)
      }
    });
  }

  if (!affiliate.isActive) {
    return res.status(403).json({ message: "Akun affiliate sedang nonaktif." });
  }

  const token = createSignedToken(
    {
      sub: affiliate.id,
      role: "affiliate",
      email: affiliate.email,
      name: affiliate.username
    },
    60 * 60 * 24 * 7
  );
  setSessionCookie(res, token, 60 * 60 * 24 * 7, "affiliate");

  return res.json({
    success: true,
    affiliate: {
      id: affiliate.id,
      email: affiliate.email,
      username: affiliate.username,
      voucherCode: affiliate.voucherCode,
      voucherDiscountPercent: affiliate.voucherDiscountPercent,
      commissionAmount: affiliate.commissionAmount,
      bankName: affiliate.bankName,
      bankAccountName: affiliate.bankAccountName,
      bankAccountNumber: affiliate.bankAccountNumber
    }
  });
});

router.post("/logout", (req, res) => {
  const rawRole = req.headers["x-session-role"];
  const role = Array.isArray(rawRole) ? rawRole[0] : rawRole;

  if (role === "user" || role === "admin" || role === "affiliate") {
    clearSessionCookie(res, role);
  } else {
    clearSessionCookie(res);
  }

  return res.json({
    success: true
  });
});

router.use(requireAuth);

router.get("/session", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Sesi tidak ditemukan." });
  }

  if (req.auth.role === "admin") {
    return res.json({
      success: true,
      role: "admin",
      admin: {
        id: req.auth.id,
        email: req.auth.email || ""
      }
    });
  }

  if (req.auth.role === "affiliate") {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: req.auth.id },
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
        isActive: true
      }
    });

    if (!affiliate || !affiliate.isActive) {
      clearSessionCookie(res);
      return res.status(401).json({ message: "Sesi affiliate tidak lagi valid." });
    }

    return res.json({
      success: true,
      role: "affiliate",
      affiliate: {
        id: affiliate.id,
        email: affiliate.email,
        username: affiliate.username,
        voucherCode: affiliate.voucherCode,
        voucherDiscountPercent: affiliate.voucherDiscountPercent,
        commissionAmount: affiliate.commissionAmount,
        bankName: affiliate.bankName,
        bankAccountName: affiliate.bankAccountName,
        bankAccountNumber: affiliate.bankAccountNumber
      }
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true
    }
  });

  if (!user) {
    clearSessionCookie(res);
    return res.status(401).json({ message: "Sesi user tidak lagi valid." });
  }

  return res.json({
    success: true,
    role: "user",
    user
  });
});

router.get("/history-pin/status", async (req: AuthenticatedRequest, res) => {
  if (req.auth?.role !== "user") {
    return res.status(403).json({ message: "Hanya user yang bisa mengakses brankas riwayat." });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.id },
    select: {
      historyPinHash: true,
      historyPinUpdatedAt: true
    }
  });

  return res.json({
    success: true,
    data: {
      hasPin: Boolean(user?.historyPinHash),
      updatedAt: user?.historyPinUpdatedAt?.toISOString() || null
    }
  });
});

router.post("/history-pin/setup", historyPinSetupRateLimit, async (req: AuthenticatedRequest, res) => {
  if (req.auth?.role !== "user") {
    return res.status(403).json({ message: "Hanya user yang bisa mengatur PIN brankas." });
  }

  const schema = z.object({
    pin: z.string().regex(/^\d{4}$/),
    confirmPin: z.string().regex(/^\d{4}$/)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "PIN harus terdiri dari 4 angka." });
  }

  if (parsed.data.pin !== parsed.data.confirmPin) {
    return res.status(400).json({ message: "Konfirmasi PIN tidak cocok." });
  }

  await prisma.user.update({
    where: { id: req.auth.id },
    data: {
      historyPinHash: hashPassword(parsed.data.pin),
      historyPinUpdatedAt: new Date()
    }
  });

  return res.json({
    success: true,
    message: "PIN brankas berhasil disimpan."
  });
});

router.post("/history-pin/verify", historyPinVerifyRateLimit, async (req: AuthenticatedRequest, res) => {
  if (req.auth?.role !== "user") {
    return res.status(403).json({ message: "Hanya user yang bisa membuka brankas riwayat." });
  }

  const schema = z.object({
    pin: z.string().regex(/^\d{4}$/)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "PIN harus terdiri dari 4 angka." });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.id },
    select: {
      historyPinHash: true
    }
  });

  if (!user?.historyPinHash) {
    return res.status(404).json({ message: "PIN brankas belum dibuat." });
  }

  if (!verifyPassword(parsed.data.pin, user.historyPinHash)) {
    return res.status(401).json({ message: "PIN brankas salah." });
  }

  if (needsPasswordRehash(user.historyPinHash)) {
    await prisma.user.update({
      where: { id: req.auth.id },
      data: {
        historyPinHash: hashPassword(parsed.data.pin),
        historyPinUpdatedAt: new Date()
      }
    });
  }

  return res.json({
    success: true,
    message: "Brankas riwayat berhasil dibuka."
  });
});

export default router;
