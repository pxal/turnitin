import crypto from "node:crypto";
import { fetchWithTimeout } from "../lib/http";
import { getGatewaySettings } from "./runtime-settings.service";

type CreatePaymentOptions = {
  orderId: string;
  amount: number;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export const PAYMENT_EXPIRY_SECONDS = 15 * 60;

type VerscanPaymentResponse = {
  payment_id: string;
  external_id: string;
  amount: number;
  status: string;
  qr_string?: string | null;
  qr_image_url?: string | null;
  expired_at?: string | null;
  paid_at?: string | null;
  callback_status?: string | null;
};

export class PaymentGatewayStatusError extends Error {
  code?: string;
  statusCode: number;

  constructor(message: string, options?: { code?: string; statusCode?: number }) {
    super(message);
    this.name = "PaymentGatewayStatusError";
    this.code = options?.code;
    this.statusCode = options?.statusCode ?? 502;
  }
}

function requireGatewayValue(value: string, label: string) {
  if (!value) {
    throw new Error(`${label} wajib diisi untuk integrasi Verscan Gateway.`);
  }

  return value;
}

function signPayload(payload: string, secretKey: string) {
  const secret = requireGatewayValue(secretKey, "Webhook Secret Verscan Gateway");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function normalizeBody(body: Record<string, unknown>) {
  return JSON.stringify(body);
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respons Verscan Gateway tidak valid: ${text}`);
  }
}

function normalizeStatus(status: string) {
  const lowered = status.toLowerCase();
  if (lowered === "paid") {
    return "PAID";
  }
  if (["failed", "expired", "cancelled", "canceled"].includes(lowered)) {
    return "FAILED";
  }
  return "PENDING";
}

function buildVerscanHeaders(gateway: Awaited<ReturnType<typeof getGatewaySettings>>, includeJson = false) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireGatewayValue(gateway.apiKey, "API Key Verscan Gateway")}`,
    "X-Merchant-ID": requireGatewayValue(gateway.merchantCode, "Merchant ID Verscan Gateway")
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

export async function createPaymentQr(options: CreatePaymentOptions) {
  const gateway = await getGatewaySettings();

  if (gateway.mockPayment) {
    return {
      provider: "mock",
      providerRef: `MOCK-${options.orderId}`,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MOCK-PAYMENT-FOR-${options.orderId}`,
      paymentLink: null,
      virtualAccount: null,
      amount: options.amount,
      fee: 0,
      total: options.amount,
      expiredAt: new Date(Date.now() + PAYMENT_EXPIRY_SECONDS * 1000).toISOString(),
      status: "PENDING",
      raw: {}
    };
  }

  const body = {
    external_id: options.orderId,
    amount: options.amount,
    customer_name: options.customerName || options.customerPhone,
    callback_url: options.callbackUrl,
    expires_in: PAYMENT_EXPIRY_SECONDS
  };

  const response = await fetchWithTimeout(`${gateway.baseUrl}/api/payments`, {
    method: "POST",
    headers: buildVerscanHeaders(gateway, true),
    body: normalizeBody(body)
  });

  const payload = await parseJson<VerscanPaymentResponse & { error?: string }>(response);
  if (!response.ok || !payload.payment_id) {
    throw new Error(payload.error || "Gagal membuat pembayaran ke Verscan Gateway.");
  }

  return {
    provider: "verscan",
    providerRef: payload.payment_id,
    qrUrl: payload.qr_image_url || (payload.qr_string ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payload.qr_string)}` : null),
    paymentLink: null,
    virtualAccount: null,
    amount: payload.amount,
    fee: 0,
    total: payload.amount,
    expiredAt: payload.expired_at || null,
    status: normalizeStatus(payload.status),
    raw: payload
  };
}

export async function getGatewayPaymentStatus(refId: string) {
  const gateway = await getGatewaySettings();

  if (gateway.mockPayment && refId.startsWith("MOCK-")) {
    return {
      merchant_ref_id: refId.replace("MOCK-", ""),
      invoice: refId,
      amount: 0,
      status: "PAID",
      paid_at: new Date().toISOString()
    };
  }

  const response = await fetchWithTimeout(`${gateway.baseUrl}/api/payments/${encodeURIComponent(refId)}`, {
    method: "GET",
    headers: buildVerscanHeaders(gateway)
  });

  const payload = await parseJson<VerscanPaymentResponse & { error?: string }>(response);
  if (!response.ok || !payload.payment_id) {
    throw new PaymentGatewayStatusError(payload.error || "Gagal mengambil status pembayaran Verscan Gateway.", {
      code: payload.error,
      statusCode: response.status || 502
    });
  }

  return {
    merchant_ref_id: payload.external_id,
    invoice: payload.payment_id,
    amount: payload.amount,
    status: normalizeStatus(payload.status),
    paid_at: payload.paid_at || undefined
  };
}

export async function verifyVerscanSignature(rawBody: string, providedSignature?: string | string[]) {
  if (!providedSignature || Array.isArray(providedSignature)) {
    return false;
  }

  const gateway = await getGatewaySettings();
  if (!gateway.secretKey) {
    return false;
  }

  const expected = signPayload(rawBody, gateway.secretKey);
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(providedSignature);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
