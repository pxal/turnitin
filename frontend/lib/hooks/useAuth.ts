"use client";

import { useState, useEffect } from "react";
import { apiBaseUrl, clearUserSession, getStoredUserAuth, storeUserSession, withSessionRole } from "../api";

export type User = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
};

export type AuthData = {
  success: boolean;
  user: User;
};

const authChangedEvent = "turnicheck:auth-changed";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const stored = getStoredUserAuth();
      setUser(stored?.user || null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/session`, withSessionRole("user"));
        const payload = await response.json().catch(() => null);

        if (response.status === 401 || response.status === 403) {
          clearUserSession();
          setUser(null);
          return;
        }

        if (!response.ok) {
          return;
        }

        if (!payload?.success || payload.role !== "user" || !payload.user) {
          clearUserSession();
          setUser(null);
          return;
        }

        storeUserSession(payload.user);
        setUser(payload.user);
      } catch {
        if (!stored?.user) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
    const handleAuthChanged = () => {
      void checkAuth();
    };

    // Listen for storage changes (for multi-tab sync)
    window.addEventListener("storage", handleAuthChanged);
    window.addEventListener(authChangedEvent, handleAuthChanged);
    return () => {
      window.removeEventListener("storage", handleAuthChanged);
      window.removeEventListener(authChangedEvent, handleAuthChanged);
    };
  }, []);

  const logout = async () => {
    try {
      await fetch(`${apiBaseUrl}/api/auth/logout`, withSessionRole("user", { method: "POST" }));
    } catch {
      // noop
    } finally {
      clearUserSession();
      setUser(null);
      window.dispatchEvent(new Event(authChangedEvent));
    }
  };

  const login = (data: AuthData) => {
    storeUserSession(data.user);
    setUser(data.user);
    window.dispatchEvent(new Event(authChangedEvent));
  };

  return { user, loading, logout, login };
}
