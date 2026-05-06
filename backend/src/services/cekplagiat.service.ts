import { fetchWithTimeout } from "../lib/http";
import { config } from "../config";

type SubmitPayload = {
  fileUrl: string;
  excludeQuotes?: boolean;
  excludeBiblio?: boolean;
  excludeMatches?: string;
};

const cekplagiatUrlPattern = /^https?:\/\/.+/i;

type CekplagiatEnvelope<T> = {
  status: string;
  message?: string;
  data?: T;
};

function getHeaders() {
  if (!config.cekplagiatApiKey) {
    throw new Error("CEKPLAGIAT_API_KEY belum diisi di file .env root.");
  }

  return {
    "x-api-key": config.cekplagiatApiKey
  };
}

async function parseResponse<T>(response: Response): Promise<CekplagiatEnvelope<T>> {
  const text = await response.text();

  try {
    return JSON.parse(text) as CekplagiatEnvelope<T>;
  } catch {
    throw new Error(`Respons API cekplagiat tidak valid: ${text}`);
  }
}

export async function getCekplagiatBalance() {
  console.log(`[Cekplagiat] Requesting balance: ${config.cekplagiatBaseUrl}/balance.php`);
  const response = await fetchWithTimeout(`${config.cekplagiatBaseUrl}/balance.php`, {
    method: "GET",
    headers: getHeaders(),
    retryCount: 4,
    retryDelayMs: 1000
  });

  const payload = await parseResponse<{ balance: number; tier: string }>(response);
  if (!response.ok || payload.status !== "success" || !payload.data) {
    console.error("[Cekplagiat] Balance request failed:", payload.message || response.statusText);
    throw new Error(payload.message || "Gagal mengambil saldo API cekplagiat.");
  }

  console.log(`[Cekplagiat] Balance OK: balance=${payload.data.balance}, tier=${payload.data.tier}`);
  return payload.data;
}

export async function submitToCekplagiat(payload: SubmitPayload) {
  if (!cekplagiatUrlPattern.test(payload.fileUrl)) {
    throw new Error("fileUrl harus berupa direct URL publik yang bisa diunduh.");
  }

  console.log(`[Cekplagiat] Submitting file: ${payload.fileUrl}`);
  const response = await fetchWithTimeout(`${config.cekplagiatBaseUrl}/submit.php`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json"
    },
    retryCount: 0,
    body: JSON.stringify({
      file_url: payload.fileUrl,
      exclude_quotes: payload.excludeQuotes ?? true,
      exclude_biblio: payload.excludeBiblio ?? true,
      exclude_matches: (payload.excludeMatches || "").trim()
    })
  });

  const result = await parseResponse<{ job_id: string; status: string }>(response);
  if (!response.ok || result.status !== "success" || !result.data) {
    console.error("[Cekplagiat] Submit failed:", result.message || response.statusText);
    throw new Error(result.message || "Gagal submit dokumen ke API cekplagiat.");
  }

  console.log(`[Cekplagiat] Submit accepted: jobId=${result.data.job_id}, status=${result.data.status}`);
  return {
    provider: "cekplagiat",
    jobId: result.data.job_id,
    status: result.data.status
  };
}

export async function getCekplagiatStatus(jobId: string) {
  console.log(`[Cekplagiat] Checking status for jobId=${jobId}`);
  const response = await fetchWithTimeout(
    `${config.cekplagiatBaseUrl}/status.php?job_id=${encodeURIComponent(jobId)}`,
    {
      method: "GET",
      headers: getHeaders(),
      retryCount: 5,
      retryDelayMs: 1500
    }
  );

  const result = await parseResponse<{ status: string }>(response);
  if (!response.ok || result.status !== "success" || !result.data) {
    console.error(`[Cekplagiat] Status check failed for jobId=${jobId}:`, result.message || response.statusText);
    throw new Error(result.message || "Gagal mengecek status API cekplagiat.");
  }

  console.log(`[Cekplagiat] Status response for jobId=${jobId}: ${result.data.status}`);
  return result.data;
}

export async function getCekplagiatResult(jobId: string) {
  console.log(`[Cekplagiat] Fetching result for jobId=${jobId}`);
  const response = await fetchWithTimeout(
    `${config.cekplagiatBaseUrl}/result.php?job_id=${encodeURIComponent(jobId)}`,
    {
      method: "GET",
      headers: getHeaders(),
      retryCount: 5,
      retryDelayMs: 1500
    }
  );

  const result = await parseResponse<{ status: string; log?: string; report_url?: string }>(response);
  if (!response.ok || result.status !== "success" || !result.data) {
    console.error(`[Cekplagiat] Result fetch failed for jobId=${jobId}:`, result.message || response.statusText);
    throw new Error(result.message || "Gagal mengambil hasil API cekplagiat.");
  }

  console.log(
    `[Cekplagiat] Result response for jobId=${jobId}: status=${result.data.status}, report=${result.data.report_url ? "yes" : "no"}`
  );
  return result.data;
}
