import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

function resolveDotenvPath() {
  const candidates = [
    process.env.ENV_FILE_PATH,
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(__dirname, "../../../.env"),
    path.resolve(__dirname, "../../.env")
  ].filter((item): item is string => Boolean(item));

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

dotenv.config({
  path: resolveDotenvPath()
});

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function parseBaseUrlList(value: string) {
  return value
    .split(",")
    .map((item) => normalizeBaseUrl(item))
    .filter(Boolean);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} wajib diisi di file .env root project.`);
  }

  return value;
}

const appBaseUrl = normalizeBaseUrl(process.env.APP_BASE_URL || "http://localhost:4000");
const frontendBaseUrl = normalizeBaseUrl(process.env.FRONTEND_BASE_URL || "http://localhost:3000");
const publicUploadsBaseUrl = normalizeBaseUrl(process.env.PUBLIC_UPLOADS_BASE_URL || `${appBaseUrl}/uploads`);
const corsAllowedOrigins = parseBaseUrlList(process.env.CORS_ALLOWED_ORIGINS || "");

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  appBaseUrl,
  frontendBaseUrl,
  corsAllowedOrigins,
  sessionCookieDomain: process.env.SESSION_COOKIE_DOMAIN || "",
  sessionCookieSameSite: (process.env.SESSION_COOKIE_SAME_SITE || "").toLowerCase(),
  databaseUrl: requiredEnv("DATABASE_URL"),
  jwtSecret: requiredEnv("JWT_SECRET"),
  sessionSecret: requiredEnv("SESSION_SECRET"),
  adminEmail: process.env.ADMIN_EMAIL || "",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || "",
  googleClientId: requiredEnv("GOOGLE_CLIENT_ID"),
  turnitinApiUrl: process.env.TURNITIN_API_URL || "",
  turnitinApiKey: process.env.TURNITIN_API_KEY || "",
  turnitinApiSecret: process.env.TURNITIN_API_SECRET || "",
  cekplagiatBaseUrl: process.env.CEKPLAGIAT_BASE_URL || "https://api.cekplagiat.net/api",
  cekplagiatApiKey: process.env.CEKPLAGIAT_API_KEY || "",
  cekplagiatCostPerCheck: Number(process.env.CEKPLAGIAT_COST_PER_CHECK || 4600),
  checkFileAccessTokenTtlSeconds: Number(process.env.CHECK_FILE_ACCESS_TOKEN_TTL_SECONDS || 24 * 60 * 60),
  paymentGatewayProvider: process.env.PAYMENT_GATEWAY_PROVIDER || "versan",
  versanBaseUrl: process.env.VERSCAN_BASE_URL || process.env.VERSAN_BASE_URL || "https://gateway.verscan.net",
  versanApiKey: process.env.VERSCAN_API_KEY || process.env.VERSAN_API_KEY || "",
  versanWebhookSecret: process.env.VERSCAN_WEBHOOK_SECRET || process.env.VERSAN_WEBHOOK_SECRET || "",
  versanStoreId: process.env.VERSCAN_MERCHANT_ID || process.env.VERSAN_STORE_ID || "",
  telegramNotificationsEnabled: process.env.TELEGRAM_NOTIFICATIONS_ENABLED || "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  telegramNotifyPaidOrders: process.env.TELEGRAM_NOTIFY_PAID_ORDERS || "",
  uploadsDir: process.env.UPLOADS_DIR || path.resolve(__dirname, "../uploads"),
  privateUploadsDir: process.env.PRIVATE_UPLOADS_DIR || path.resolve(__dirname, "../private-uploads"),
  publicUploadsBaseUrl,
  runtimeSettingsFile: process.env.RUNTIME_SETTINGS_FILE || path.resolve(__dirname, "../data/runtime-settings.json")
};
