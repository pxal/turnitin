"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl } from "../api";

export type BrandingData = {
  brandName: string;
  logoUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  whatsappUrl: string;
};

const defaultBranding: BrandingData = {
  brandName: "Verscan",
  logoUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  whatsappUrl: "https://wa.me/6282135489547"
};

export const BRANDING_UPDATED_EVENT = "verscan:branding-updated";
const BRANDING_STORAGE_KEY = "verscan:branding";

function readStoredBranding() {
  if (typeof window === "undefined") {
    return defaultBranding;
  }

  try {
    const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) {
      return defaultBranding;
    }

    const parsed = JSON.parse(raw) as Partial<BrandingData>;
    return {
      ...defaultBranding,
      ...parsed
    };
  } catch {
    return defaultBranding;
  }
}

export function useBranding() {
  const [branding, setBranding] = useState<BrandingData>(defaultBranding);

  useEffect(() => {
    const storedBranding = readStoredBranding();
    setBranding(storedBranding);

    async function loadBranding() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/branding`, {
          cache: "no-store"
        });
        const payload = await response.json();

        if (response.ok && payload.success && payload.data) {
          setBranding(payload.data);
          window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(payload.data));
        }
      } catch (error) {
        console.error("Failed to load branding:", error);
      }
    }

    void loadBranding();

    function handleBrandingUpdated() {
      void loadBranding();
    }

    window.addEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdated);

    return () => {
      window.removeEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdated);
    };
  }, []);

  return branding;
}
