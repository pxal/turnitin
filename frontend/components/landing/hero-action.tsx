"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "../login-modal";
import { useAuth } from "../../lib/hooks/useAuth";

export default function HeroAction() {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleAction = () => {
    if (user) {
      router.push("/upload");
      return;
    }

    setShowModal(true);
  };

  return (
    <>
      <div className="animate-fade-up delay-3" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <button
          className="button button-primary"
          onClick={handleAction}
          style={{ padding: "18px 40px", fontSize: "18px", cursor: "pointer" }}
        >
          Cek Dokumen Sekarang
        </button>
      </div>
      <LoginModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
