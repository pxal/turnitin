import crypto from "node:crypto";
import { fetchWithTimeout } from "../lib/http";
import { config } from "../config";
import { getGatewaySettings } from "./runtime-settings.service";

type CreateSekalipayPaymentOptions = {
  orderId: string;
  amount: number;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  callbackUrl: string;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
};

type SekalipayPaymentResponse = {
  merchant_ref_id: string;
  invoice: string;
  amount: number;
  fee: number;
  total: number;
  payment_code: string;
  payment_link?: string | null;
  qr_link?: string | null;
  virtual_account?: string | null;
  checkout_url?: string | null;
  payment_guide?: unknown;
  expired_at?: string;
  status: string;
  is_sandbox?: boolean;
};

type VersanPaymentResponse = {
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

export class SekalipayPaymentStatusError extends Error {
  code?: string;
  statusCode: number;

  constructor(message: string, options?: { code?: string; statusCode?: number }) {
    super(message);
    this.name = "SekalipayPaymentStatusError";
    this.code = options?.code;
    this.statusCode = options?.statusCode ?? 502;
  }
}

function requireGatewayValue(value: string, label: string) {
  if (!value) {
    throw new Error(`${label} wajib diisi untuk integrasi Sekalipay.`);
  }

  return value;
}

function signPayload(payload: string, secretKey: string) {
  const secret = requireGatewayValue(secretKey, "Secret Key Sekalipay");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function normalizeGatewayPath(pathname: string) {
  return pathname.replace(/^\/+/, "");
}

function createSekalipayHmacSignature(options: {
  method: "GET" | "POST";
  pathname: string;
  body: string;
  timestamp: string;
  secretKey: string;
}) {
  const stringToSign = [
    options.method,
    normalizeGatewayPath(options.pathname),
    options.body,
    options.timestamp
  ].join("|");

  return signPayload(stringToSign, options.secretKey);
}

function buildSekalipayHeaders(options: {
  gateway: Awaited<ReturnType<typeof getGatewaySettings>>;
  method: "GET" | "POST";
  pathname: string;
  body?: string;
}) {
  const headers: Record<string, string> = {
    "X-API-Key": requireGatewayValue(options.gateway.apiKey, "API Key Sekalipay")
  };

  if (options.method === "POST") {
    headers["Content-Type"] = "application/json";
  }

  if (options.gateway.useHmac) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    headers["X-Timestamp"] = timestamp;
    headers["X-Signature"] = createSekalipayHmacSignature({
      method: options.method,
      pathname: options.pathname,
      body: options.body || "",
      timestamp,
      secretKey: options.gateway.secretKey
    });
  } else if (options.method === "POST" && options.gateway.secretKey) {
    headers["X-Signature"] = signPayload(options.body || "", options.gateway.secretKey);
  }

  return headers;
}

function normalizeBody(body: Record<string, unknown>) {
  return JSON.stringify(body);
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respons Sekalipay tidak valid: ${text}`);
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

function requireVersanValue(value: string, label: string) {
  if (!value) {
    throw new Error(`${label} wajib diisi untuk integrasi Versan Gateway.`);
  }

  return value;
}

async function createVersanPayment(options: CreateSekalipayPaymentOptions, gateway: Awaited<ReturnType<typeof getGatewaySettings>>) {
  const body = {
    external_id: options.orderId,
    amount: options.amount,
    customer_name: options.customerName || options.customerPhone,
    callback_url: options.callbackUrl,
    expires_in: 1800
  };

  const response = await fetchWithTimeout(`${gateway.baseUrl}/api/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireVersanValue(gateway.apiKey, "API Key Versan Gateway")}`,
      "Content-Type": "application/json"
    },
    body: normalizeBody(body)
  });

  const payload = await parseJson<VersanPaymentResponse & { error?: string }>(response);
  if (!response.ok || !payload.payment_id) {
    throw new Error(payload.error || "Gagal membuat pembayaran ke Versan Gateway.");
  }

  return {
    provider: "versan",
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

export async function createPaymentQr(options: CreateSekalipayPaymentOptions) {
  const gateway = await getGatewaySettings();

  if (gateway.mockPayment) {
    console.log("🛠️ Using MOCK_PAYMENT mode for order:", options.orderId);
    return {
      provider: "mock",
      providerRef: `MOCK-${options.orderId}`,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MOCK-PAYMENT-FOR-${options.orderId}`,
      paymentLink: null,
      virtualAccount: null,
      amount: options.amount,
      fee: 0,
      total: options.amount,
      expiredAt: new Date(Date.now() + 30 * 60000).toISOString(),
      status: "PENDING",
      raw: {}
    };
  }

  if (gateway.provider === "versan") {
    return createVersanPayment(options, gateway);
  }

  const body = {
    merchant_ref_id: options.orderId,
    amount: options.amount,
    payment_code: gateway.paymentCode,
    customer_name: options.customerName || options.customerPhone,
    customer_phone: options.customerPhone,
    customer_email: options.customerEmail || undefined,
    callback_url: options.callbackUrl,
    return_url: options.returnUrl || undefined,
    metadata: options.metadata || {}
  };

  const rawBody = normalizeBody(body);
  const paymentPath = "/api/v1/gateway/payment";
  const headers = buildSekalipayHeaders({
    gateway,
    method: "POST",
    pathname: paymentPath,
    body: rawBody
  });

  const response = await fetchWithTimeout(`${gateway.baseUrl}/payment`, {
    method: "POST",
    headers,
    body: rawBody
  });

  const payload = await parseJson<{
    status: boolean;
    message: string;
    data?: SekalipayPaymentResponse;
  }>(response);

  if (!response.ok || !payload.status || !payload.data) {
    throw new Error(payload.message || "Gagal membuat pembayaran ke Sekalipay.");
  }

  return {
    provider: "sekalipay",
    providerRef: payload.data.invoice,
    qrUrl: payload.data.qr_link || payload.data.payment_link || payload.data.checkout_url || null,
    paymentLink: payload.data.payment_link || payload.data.checkout_url || null,
    virtualAccount: payload.data.virtual_account || null,
    amount: payload.data.amount,
    fee: payload.data.fee,
    total: payload.data.total,
    expiredAt: payload.data.expired_at || null,
    status: payload.data.status,
    raw: payload.data
  };
}

export async function getSekalipayPaymentStatus(refId: string) {
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
  
  const requestStatus = async (lookupRef: string) => {
    const paymentStatusPath = `/api/v1/gateway/payment/${encodeURIComponent(lookupRef)}`;
    const response = await fetchWithTimeout(`${gateway.baseUrl}/payment/${encodeURIComponent(lookupRef)}`, {
      method: "GET",
      headers: buildSekalipayHeaders({
        gateway,
        method: "GET",
        pathname: paymentStatusPath
      })
    });

    const payload = await parseJson<{
      status: boolean;
      message?: string;
      data?: {
        merchant_ref_id: string;
        invoice: string;
        amount: number;
        status: string;
        paid_at?: string;
      };
    }>(response);

    if (!response.ok || !payload.status || !payload.data) {
      throw new SekalipayPaymentStatusError(
        payload.message || "Gagal mengambil status pembayaran Sekalipay.",
        {
          code: payload.message,
          statusCode: response.status || 502
        }
      );
    }

    return payload.data;
  };

  return requestStatus(refId);
}

export async function getVersanPaymentStatus(refId: string) {
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
    headers: {
      Authorization: `Bearer ${requireVersanValue(gateway.apiKey, "API Key Versan Gateway")}`
    }
  });

  const payload = await parseJson<VersanPaymentResponse & { error?: string }>(response);
  if (!response.ok || !payload.payment_id) {
    throw new SekalipayPaymentStatusError(payload.error || "Gagal mengambil status pembayaran Versan Gateway.", {
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

export async function getGatewayPaymentStatus(refId: string) {
  const gateway = await getGatewaySettings();
  if (gateway.provider === "versan") {
    return getVersanPaymentStatus(refId);
  }

  return getSekalipayPaymentStatus(refId);
}

export async function verifySekalipaySignature(rawBody: string, providedSignature?: string | string[]) {
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

export async function verifyVersanSignature(rawBody: string, providedSignature?: string | string[]) {
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
