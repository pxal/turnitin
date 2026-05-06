import type { Metadata } from "next";
import { Suspense } from "react";
import LegacyPaymentRedirect from "../../components/legacy-payment-redirect";

export const metadata: Metadata = {
  title: "Pembayaran QRIS",
  description: "Selesaikan pembayaran QRIS untuk memulai pengecekan dokumen Turnitin.",
  robots: {
    index: false,
    follow: false
  }
};

export default function PaymentPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
      <LegacyPaymentRedirect />
    </Suspense>
  );
}
