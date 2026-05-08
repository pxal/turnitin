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

router.post("/logout", (req, res) => {
  const rawRole = req.headers["x-session-role"];
  const role = Array.isArray(rawRole) ? rawRole[0] : rawRole;

  if (role === "user" || role === "admin") {
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
