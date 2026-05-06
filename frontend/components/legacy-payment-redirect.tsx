"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyPaymentRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("checkRequestId");

  useEffect(() => {
    if (id) {
      router.replace(`/payment/${encodeURIComponent(id)}`);
    } else {
      router.replace("/upload");
    }
  }, [id, router]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text-muted)" }}>Mengarahkan ke halaman pembayaran...</p>
    </div>
  );
}
