const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";
const localApiBaseUrl =
  process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:4000";

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveApiBaseUrl() {
  if (typeof window === "undefined") {
    return configuredApiBaseUrl;
  }

  if (!isLocalHostname(window.location.hostname)) {
    return configuredApiBaseUrl;
  }

  if (!configuredApiBaseUrl) {
    return localApiBaseUrl;
  }

  try {
    const configuredHostname = new URL(configuredApiBaseUrl).hostname;
    return isLocalHostname(configuredHostname) ? configuredApiBaseUrl : localApiBaseUrl;
  } catch {
    return localApiBaseUrl;
  }
}

export const apiBaseUrl = resolveApiBaseUrl();

export const userAuthStorageKey = "turnicheck:auth";
export const adminAuthStorageKey = "turnicheck:admin-auth";
export const affiliateAuthStorageKey = "turnicheck:affiliate-auth";
export const historyVaultStorageKey = "turnicheck:history-vault";
export const historyVaultTimeoutMs =
  Number(process.env.NEXT_PUBLIC_HISTORY_VAULT_TIMEOUT_MINUTES || 15) * 60 * 1000;

type StoredUserSession = {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
  };
};

type StoredAdminSession = {
  admin: {
    id: string;
    email: string;
  };
};

type StoredAffiliateSession = {
  affiliate: {
    id: string;
    email: string;
    username: string;
    voucherCode: string;
    voucherDiscountPercent: number;
    commissionAmount: number;
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
  };
};

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount);
}

function readStorageItem<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function getStoredUserAuth() {
  return readStorageItem<StoredUserSession>(userAuthStorageKey);
}

export function getStoredAdminAuth() {
  return readStorageItem<StoredAdminSession>(adminAuthStorageKey);
}

export function getStoredAffiliateAuth() {
  return readStorageItem<StoredAffiliateSession>(affiliateAuthStorageKey);
}

export function storeUserSession(user: StoredUserSession["user"]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(userAuthStorageKey, JSON.stringify({ user }));
}

export function clearUserSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(userAuthStorageKey);
}

export function storeAdminSession(admin: StoredAdminSession["admin"]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(adminAuthStorageKey, JSON.stringify({ admin }));
}

export function clearAdminSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(adminAuthStorageKey);
}

export function storeAffiliateSession(affiliate: StoredAffiliateSession["affiliate"]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(affiliateAuthStorageKey, JSON.stringify({ affiliate }));
}

export function clearAffiliateSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(affiliateAuthStorageKey);
}

export function withCredentials(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    credentials: "include"
  };
}

export function withSessionRole(role: "user" | "admin" | "affiliate", init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers || {});
  headers.set("x-session-role", role);

  return withCredentials({
    ...init,
    headers
  });
}

type HistoryVaultSession = {
  unlocked: boolean;
  expiresAt: number;
};

function getHistoryVaultSessionKey(userId: string) {
  return `${historyVaultStorageKey}:${userId}`;
}

export function isHistoryVaultUnlocked(userId?: string) {
  if (typeof window === "undefined" || !userId) {
    return false;
  }

  const raw = window.sessionStorage.getItem(getHistoryVaultSessionKey(userId));
  if (!raw) {
    return false;
  }

  try {
    const session = JSON.parse(raw) as HistoryVaultSession;
    if (!session.unlocked || !session.expiresAt || session.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(getHistoryVaultSessionKey(userId));
      return false;
    }

    return true;
  } catch {
    window.sessionStorage.removeItem(getHistoryVaultSessionKey(userId));
    return false;
  }
}

export function unlockHistoryVault(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const session: HistoryVaultSession = {
    unlocked: true,
    expiresAt: Date.now() + historyVaultTimeoutMs
  };

  window.sessionStorage.setItem(getHistoryVaultSessionKey(userId), JSON.stringify(session));
}

export function lockHistoryVault(userId?: string) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  window.sessionStorage.removeItem(getHistoryVaultSessionKey(userId));
}
