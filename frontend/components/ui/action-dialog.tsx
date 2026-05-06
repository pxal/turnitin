"use client";

import { ReactNode, useEffect } from "react";

type ActionDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
  confirmTone?: "primary" | "danger";
  busy?: boolean;
};

const toneStyles = {
  primary: {
    background: "#0f172a",
    color: "white",
    border: "1px solid #0f172a"
  },
  danger: {
    background: "#dc2626",
    color: "white",
    border: "1px solid #dc2626"
  }
} as const;

export default function ActionDialog({
  open,
  title,
  description,
  children,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  onConfirm,
  onClose,
  confirmTone = "primary",
  busy = false
}: ActionDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(15, 23, 42, 0.56)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px"
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "min(640px, calc(100vw - 24px))",
          maxHeight: "calc(100dvh - 24px)",
          background: "white",
          borderRadius: "clamp(16px, 4vw, 24px)",
          border: "1px solid #e2e8f0",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div style={{ padding: "clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px) 18px", borderBottom: "1px solid #eef2f7", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: "clamp(18px, 5vw, 22px)", lineHeight: 1.2, fontWeight: 900, color: "#0f172a", overflowWrap: "anywhere" }}>{title}</h3>
              {description ? (
                <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.7, color: "#64748b" }}>
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                border: "none",
                background: "#f8fafc",
                color: "#475569",
                width: "40px",
                height: "40px",
                flexShrink: 0,
                borderRadius: "12px",
                fontSize: "20px",
                cursor: busy ? "not-allowed" : "pointer"
              }}
            >
              ×
            </button>
          </div>
        </div>

        {children ? (
          <div
            style={{
              padding: "clamp(16px, 4vw, 24px)",
              overflowY: "auto",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch"
            }}
          >
            {children}
          </div>
        ) : null}

        {onConfirm ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              padding: "18px clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px)",
              borderTop: children ? "1px solid #eef2f7" : "none",
              flexWrap: "wrap",
              flexShrink: 0
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                minWidth: "110px",
                padding: "12px 18px",
                borderRadius: "12px",
                background: "white",
                color: "#334155",
                border: "1px solid #cbd5e1",
                fontWeight: 800,
                cursor: busy ? "not-allowed" : "pointer"
              }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => void onConfirm()}
              disabled={busy}
              style={{
                minWidth: "140px",
                padding: "12px 18px",
                borderRadius: "12px",
                fontWeight: 800,
                cursor: busy ? "not-allowed" : "pointer",
                ...toneStyles[confirmTone]
              }}
            >
              {busy ? "Memproses..." : confirmLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
