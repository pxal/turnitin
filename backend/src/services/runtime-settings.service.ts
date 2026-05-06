import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { config } from "../config";
import { extractManagedFilename } from "../lib/uploads";

type GatewaySettings = {
  provider: "sekalipay" | "versan";
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  merchantCode: string;
  paymentCode: string;
  useHmac: boolean;
  mockPayment: boolean;
};

type TelegramNotificationSettings = {
  enabled: boolean;
  botToken: string;
  chatId: string;
  notifyPaidOrders: boolean;
};

type TelegramNotificationSettingsInput = {
  enabled: boolean;
  botToken?: string;
  chatId: string;
  notifyPaidOrders: boolean;
};

type RuntimeSettingsFile = {
  gateway?: Partial<GatewaySettings>;
  telegram?: Partial<TelegramNotificationSettings>;
  branding?: Partial<BrandingSettings>;
};

export type BrandingSettings = {
  brandName: string;
  logoUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  whatsappUrl: string;
};

function deriveSecretKey() {
  return crypto.createHash("sha256").update(config.sessionSecret).digest();
}

function encryptSecret(value: string) {
  if (!value) {
    return "";
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveSecretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decryptSecret(value: string) {
  if (!value) {
    return "";
  }

  if (!value.startsWith("enc:")) {
    return value;
  }

  const [, ivRaw, tagRaw, payloadRaw] = value.split(":");
  if (!ivRaw || !tagRaw || !payloadRaw) {
    return "";
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      deriveSecretKey(),
      Buffer.from(ivRaw, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadRaw, "base64url")),
      decipher.final()
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

function defaultGatewaySettings(): GatewaySettings {
  const configuredProvider = config.paymentGatewayProvider.toLowerCase() === "versan" ? "versan" : "sekalipay";
  if (configuredProvider === "versan") {
    return {
      provider: "versan",
      baseUrl: config.versanBaseUrl,
      apiKey: config.versanApiKey,
      secretKey: config.versanWebhookSecret,
      merchantCode: config.versanStoreId,
      paymentCode: "QRIS",
      useHmac: false,
      mockPayment: process.env.MOCK_PAYMENT === "true"
    };
  }

  return {
    provider: "sekalipay",
    baseUrl: config.sekalipayBaseUrl,
    apiKey: config.sekalipayApiKey,
    secretKey: config.sekalipaySecretKey,
    merchantCode: config.sekalipayMerchantCode,
    paymentCode: config.sekalipayPaymentCode,
    useHmac: config.sekalipayUseHmac,
    mockPayment: process.env.MOCK_PAYMENT === "true"
  };
}

async function ensureSettingsFile() {
  await fs.mkdir(path.dirname(config.runtimeSettingsFile), { recursive: true });
  try {
    await fs.access(config.runtimeSettingsFile);
  } catch {
    await fs.writeFile(config.runtimeSettingsFile, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readSettingsFile(): Promise<RuntimeSettingsFile> {
  await ensureSettingsFile();
  const raw = await fs.readFile(config.runtimeSettingsFile, "utf8");

  try {
    return raw.trim() ? (JSON.parse(raw) as RuntimeSettingsFile) : {};
  } catch {
    return {};
  }
}

async function writeSettingsFile(data: RuntimeSettingsFile) {
  await ensureSettingsFile();
  await fs.writeFile(config.runtimeSettingsFile, JSON.stringify(data, null, 2), "utf8");
}

function defaultTelegramSettings(): TelegramNotificationSettings {
  return {
    enabled: Boolean(config.telegramBotToken && config.telegramChatId),
    botToken: config.telegramBotToken,
    chatId: config.telegramChatId,
    notifyPaidOrders: true
  };
}

function defaultBrandingSettings(): BrandingSettings {
  return {
    brandName: "Verscan",
    logoUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    whatsappUrl: "https://wa.me/6282135489547"
  };
}

function normalizeBrandingLogoUrl(logoUrl: string) {
  const trimmed = logoUrl.trim();
  if (!trimmed) {
    return "";
  }

  const managedFilename = extractManagedFilename(trimmed);
  if (managedFilename) {
    return `/uploads/${encodeURIComponent(managedFilename)}`;
  }

  if (trimmed.startsWith("/uploads/")) {
    return trimmed;
  }

  if (trimmed.startsWith("uploads/")) {
    return `/${trimmed}`;
  }

  return trimmed;
}

function resolveBrandingLogoUrl(logoUrl: string) {
  const normalized = normalizeBrandingLogoUrl(logoUrl);
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("/")) {
    return `${config.appBaseUrl}${normalized}`;
  }

  return normalized;
}

export async function getGatewaySettings(): Promise<GatewaySettings> {
  const file = await readSettingsFile();
  return {
    ...defaultGatewaySettings(),
    ...file.gateway,
    apiKey: decryptSecret(file.gateway?.apiKey || "") || defaultGatewaySettings().apiKey,
    secretKey: decryptSecret(file.gateway?.secretKey || "") || defaultGatewaySettings().secretKey
  };
}

export async function saveGatewaySettings(
  input: Partial<GatewaySettings> & Pick<GatewaySettings, "baseUrl" | "merchantCode" | "paymentCode" | "useHmac" | "mockPayment">
): Promise<GatewaySettings> {
  const currentGateway = await getGatewaySettings();
  const normalized: GatewaySettings = {
    provider: input.provider === "versan" ? "versan" : "sekalipay",
    baseUrl: input.baseUrl.trim(),
    apiKey: (input.apiKey || currentGateway.apiKey).trim(),
    secretKey: (input.secretKey || currentGateway.secretKey).trim(),
    merchantCode: input.merchantCode.trim(),
    paymentCode: input.paymentCode.trim(),
    useHmac: Boolean(input.useHmac),
    mockPayment: Boolean(input.mockPayment)
  };

  const current = await readSettingsFile();
  await writeSettingsFile({
    ...current,
    gateway: {
      ...normalized,
      apiKey: encryptSecret(normalized.apiKey),
      secretKey: encryptSecret(normalized.secretKey)
    }
  });

  return normalized;
}

export async function getTelegramNotificationSettings(): Promise<TelegramNotificationSettings> {
  const file = await readSettingsFile();
  return {
    ...defaultTelegramSettings(),
    ...file.telegram,
    botToken: decryptSecret(file.telegram?.botToken || "")
  };
}

export async function getBrandingSettings(): Promise<BrandingSettings> {
  const file = await readSettingsFile();
  const branding = {
    ...defaultBrandingSettings(),
    ...file.branding
  };

  return {
    brandName: branding.brandName || defaultBrandingSettings().brandName,
    logoUrl: resolveBrandingLogoUrl(branding.logoUrl || ""),
    instagramUrl: (branding.instagramUrl || defaultBrandingSettings().instagramUrl).trim(),
    tiktokUrl: (branding.tiktokUrl || defaultBrandingSettings().tiktokUrl).trim(),
    whatsappUrl: (branding.whatsappUrl || defaultBrandingSettings().whatsappUrl).trim()
  };
}

export async function saveBrandingSettings(input: BrandingSettings): Promise<BrandingSettings> {
  const normalized: BrandingSettings = {
    brandName: input.brandName.trim() || defaultBrandingSettings().brandName,
    logoUrl: normalizeBrandingLogoUrl(input.logoUrl),
    instagramUrl: input.instagramUrl.trim(),
    tiktokUrl: input.tiktokUrl.trim(),
    whatsappUrl: input.whatsappUrl.trim()
  };

  const current = await readSettingsFile();
  await writeSettingsFile({
    ...current,
    branding: normalized
  });

  return {
    ...normalized,
    logoUrl: resolveBrandingLogoUrl(normalized.logoUrl)
  };
}

export async function saveTelegramNotificationSettings(
  input: TelegramNotificationSettingsInput
): Promise<TelegramNotificationSettings> {
  const current = await readSettingsFile();
  const currentTelegram = {
    ...defaultTelegramSettings(),
    ...current.telegram
  };

  const nextBotToken =
    typeof input.botToken === "string" && input.botToken.trim().length > 0
      ? input.botToken.trim()
      : currentTelegram.botToken;

  const normalized: TelegramNotificationSettings = {
    enabled: Boolean(input.enabled),
    botToken: nextBotToken,
    chatId: input.chatId.trim(),
    notifyPaidOrders: Boolean(input.notifyPaidOrders)
  };

  await writeSettingsFile({
    ...current,
    telegram: {
      ...normalized,
      botToken: encryptSecret(normalized.botToken)
    }
  });

  return normalized;
}

export function maskSecret(value: string) {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}${"*".repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}
