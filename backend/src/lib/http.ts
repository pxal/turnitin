type FetchWithTimeoutOptions = RequestInit & {
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  retryOnStatuses?: number[];
  retryUnsafeMethods?: boolean;
};

const DEFAULT_TIMEOUT_MS = Number(process.env.EXTERNAL_REQUEST_TIMEOUT_MS || 15000);
const DEFAULT_RETRY_COUNT = Number(process.env.EXTERNAL_REQUEST_RETRY_COUNT || 3);
const DEFAULT_RETRY_DELAY_MS = Number(process.env.EXTERNAL_REQUEST_RETRY_DELAY_MS || 1000);
const DEFAULT_RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EPIPE",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET"
]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMethod(method?: string) {
  return (method || "GET").toUpperCase();
}

function isRetryableMethod(method?: string, retryUnsafeMethods?: boolean) {
  const normalized = normalizeMethod(method);
  if (retryUnsafeMethods) {
    return true;
  }

  return normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS";
}

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeErrorWithCode = error as Error & { code?: string; cause?: { code?: string } };
  const code = maybeErrorWithCode.code || maybeErrorWithCode.cause?.code;

  if (code && RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }

  if (error.name === "AbortError") {
    return true;
  }

  return error.message.toLowerCase().includes("fetch failed");
}

export async function fetchWithTimeout(input: string | URL, options: FetchWithTimeoutOptions = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryCount = Math.max(0, options.retryCount ?? DEFAULT_RETRY_COUNT);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  const retryableStatuses = new Set(options.retryOnStatuses ?? [...DEFAULT_RETRYABLE_STATUSES]);
  const allowRetry = isRetryableMethod(options.method, options.retryUnsafeMethods);

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...options,
        signal: controller.signal
      });

      if (allowRetry && attempt < retryCount && retryableStatuses.has(response.status)) {
        const nextDelayMs = retryDelayMs * (attempt + 1);
        console.warn(
          `[HTTP] Retry ${attempt + 1}/${retryCount} untuk ${normalizeMethod(options.method)} ${input.toString()} karena status ${response.status}. Menunggu ${nextDelayMs} ms.`
        );
        await wait(nextDelayMs);
        continue;
      }

      return response;
    } catch (error) {
      const canRetry = allowRetry && attempt < retryCount && isRetryableError(error);
      if (canRetry) {
        const nextDelayMs = retryDelayMs * (attempt + 1);
        const maybeErrorWithCode = error as Error & { code?: string; cause?: { code?: string } };
        const code = maybeErrorWithCode.code || maybeErrorWithCode.cause?.code || "UNKNOWN";
        console.warn(
          `[HTTP] Retry ${attempt + 1}/${retryCount} untuk ${normalizeMethod(options.method)} ${input.toString()} karena error ${code}. Menunggu ${nextDelayMs} ms.`
        );
        await wait(nextDelayMs);
        continue;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request ke layanan eksternal melebihi batas waktu ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Request eksternal gagal setelah beberapa kali percobaan.");
}
