import type { Metadata } from "next";
import { Suspense } from "react";
import LegacyProcessingRedirect from "../../components/legacy-processing-redirect";

export const metadata: Metadata = {
  title: "Status Pengecekan",
  description: "Pantau proses pengecekan dokumen Anda secara real-time.",
  robots: {
    index: false,
    follow: false
  }
};

export default function LegacyProcessingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
      <LegacyProcessingRedirect />
    </Suspense>
  );
}
