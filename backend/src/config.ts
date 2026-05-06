import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
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
  midtransServerKey: process.env.MIDTRANS_SERVER_KEY || "",
  midtransClientKey: process.env.MIDTRANS_CLIENT_KEY || "",
  midtransMerchantId: process.env.MIDTRANS_MERCHANT_ID || "",
  paymentGatewayBaseUrl: process.env.PAYMENT_GATEWAY_BASE_URL || "",
  googleClientId: requiredEnv("GOOGLE_CLIENT_ID"),
  turnitinApiUrl: process.env.TURNITIN_API_URL || "",
  turnitinApiKey: process.env.TURNITIN_API_KEY || "",
  turnitinApiSecret: process.env.TURNITIN_API_SECRET || "",
  cekplagiatBaseUrl: process.env.CEKPLAGIAT_BASE_URL || "https://api.cekplagiat.net/api",
  cekplagiatApiKey: process.env.CEKPLAGIAT_API_KEY || "",
  cekplagiatCostPerCheck: Number(process.env.CEKPLAGIAT_COST_PER_CHECK || 4600),
  checkFileAccessTokenTtlSeconds: Number(process.env.CHECK_FILE_ACCESS_TOKEN_TTL_SECONDS || 24 * 60 * 60),
  sekalipayBaseUrl: process.env.SEKALIPAY_BASE_URL || "https://sekalipay.com/api/v1/gateway",
  sekalipayApiKey: process.env.SEKALIPAY_API_KEY || "",
  sekalipaySecretKey: process.env.SEKALIPAY_SECRET_KEY || "",
  sekalipayMerchantCode: process.env.SEKALIPAY_MERCHANT_CODE || "",
  sekalipayPaymentCode: process.env.SEKALIPAY_PAYMENT_CODE || "QRIS",
  sekalipayUseHmac: process.env.SEKALIPAY_USE_HMAC === "true",
  paymentGatewayProvider: process.env.PAYMENT_GATEWAY_PROVIDER || "",
  versanBaseUrl: process.env.VERSAN_BASE_URL || "https://gateway.verscan.net",
  versanApiKey: process.env.VERSAN_API_KEY || "",
  versanWebhookSecret: process.env.VERSAN_WEBHOOK_SECRET || "",
  versanStoreId: process.env.VERSAN_STORE_ID || "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  uploadsDir: process.env.UPLOADS_DIR || path.resolve(__dirname, "../uploads"),
  privateUploadsDir: process.env.PRIVATE_UPLOADS_DIR || path.resolve(__dirname, "../private-uploads"),
  publicUploadsBaseUrl,
  runtimeSettingsFile: process.env.RUNTIME_SETTINGS_FILE || path.resolve(__dirname, "../data/runtime-settings.json")
};
