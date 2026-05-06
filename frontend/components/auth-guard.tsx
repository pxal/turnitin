"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/hooks/useAuth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, redirect to landing
        router.replace("/");
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "20px" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid #eef4ff", borderTopColor: "#0b4fd9", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Memeriksa sesi...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
