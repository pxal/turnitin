"use client";

import { useEffect, useState } from "react";
import {
  apiBaseUrl,
  clearAffiliateSession,
  getStoredAffiliateAuth,
  storeAffiliateSession,
  withSessionRole
} from "../api";

export type AffiliateUser = {
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

const affiliateAuthChangedEvent = "turnicheck:affiliate-auth-changed";

export function useAffiliateAuth() {
  const [affiliate, setAffiliate] = useState<AffiliateUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const stored = getStoredAffiliateAuth();
      setAffiliate(stored?.affiliate || null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/session`, withSessionRole("affiliate"));
        const payload = await response.json().catch(() => null);

        if (response.status === 401 || response.status === 403) {
          clearAffiliateSession();
          setAffiliate(null);
          return;
        }

        if (!response.ok) {
          return;
        }

        if (!payload?.success || payload.role !== "affiliate" || !payload.affiliate) {
          clearAffiliateSession();
          setAffiliate(null);
          return;
        }

        storeAffiliateSession(payload.affiliate);
        setAffiliate(payload.affiliate);
      } catch {
        if (!stored?.affiliate) {
          setAffiliate(null);
        }
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
    const handleAuthChanged = () => {
      void checkAuth();
    };

    window.addEventListener("storage", handleAuthChanged);
    window.addEventListener(affiliateAuthChangedEvent, handleAuthChanged);

    return () => {
      window.removeEventListener("storage", handleAuthChanged);
      window.removeEventListener(affiliateAuthChangedEvent, handleAuthChanged);
    };
  }, []);

  const logout = async () => {
    try {
      await fetch(`${apiBaseUrl}/api/auth/logout`, withSessionRole("affiliate", { method: "POST" }));
    } catch {
      // noop
    } finally {
      clearAffiliateSession();
      setAffiliate(null);
      window.dispatchEvent(new Event(affiliateAuthChangedEvent));
    }
  };

  const login = (nextAffiliate: AffiliateUser) => {
    storeAffiliateSession(nextAffiliate);
    setAffiliate(nextAffiliate);
    window.dispatchEvent(new Event(affiliateAuthChangedEvent));
  };

  return { affiliate, loading, logout, login };
}

export const AFFILIATE_AUTH_CHANGED_EVENT = affiliateAuthChangedEvent;
