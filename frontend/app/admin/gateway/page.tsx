"use client";

import { useEffect, useState } from "react";
import {
  apiBaseUrl,
  clearAdminSession,
  withCredentials
} from "../../../lib/api";
import { useRouter } from "next/navigation";
import { useIsMobile } from "../../../lib/hooks/useIsMobile";

export default function AdminGatewayPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    provider: "sekalipay",
    baseUrl: "",
    apiKey: "",
    secretKey: "",
    merchantCode: "",
    paymentCode: "QRIS",
    useHmac: false,
    mockPayment: false
  });
  const [templates, setTemplates] = useState({
    callbackUrlTemplate: "",
    returnUrlTemplate: ""
  });
  const [meta, setMeta] = useState({
    hasApiKey: false,
    hasSecretKey: false,
    apiKeyMasked: "",
    secretKeyMasked: ""
  });
  const surface = "#ffffff";
  const innerSurface = "#f8fafc";
  const borderColor = "#e2e8f0";
  const textPrimary = "#0f172a";
  const textMuted = "#64748b";

  function normalizeTemplateUrl(value: string, target: "backend" | "frontend") {
    if (!value) {
      return "";
    }

    if (!/localhost/i.test(value) || typeof window === "undefined") {
      return value;
    }

    const origin =
      target === "backend"
        ? apiBaseUrl || window.location.origin
        : window.location.origin;

    return value.replace(/^https?:\/\/localhost:\d+/i, origin);
  }

  useEffect(() => {
    async function loadGateway() {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/gateway`, withCredentials());
      const json = await res.json();
      if (res.status === 401 || res.status === 403) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) {
        throw new Error(json.message || "Gagal memuat gateway.");
      }

        setForm({
          provider: json.provider || "sekalipay",
          baseUrl: json.baseUrl || "",
          apiKey: "",
          secretKey: "",
          merchantCode: json.merchantCode || "",
          paymentCode: json.paymentCode || "QRIS",
          useHmac: Boolean(json.useHmac),
          mockPayment: Boolean(json.mockPayment)
        });
        setMeta({
          hasApiKey: Boolean(json.hasApiKey),
          hasSecretKey: Boolean(json.hasSecretKey),
          apiKeyMasked: json.apiKeyMasked || "",
          secretKeyMasked: json.secretKeyMasked || ""
        });
        setTemplates({
          callbackUrlTemplate: normalizeTemplateUrl(json.callbackUrlTemplate || "", "backend"),
          returnUrlTemplate: normalizeTemplateUrl(json.returnUrlTemplate || "", "frontend")
        });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat gateway.");
    } finally {
        setLoading(false);
      }
    }

    void loadGateway();
  }, [router]);

  const providerName = form.provider === "versan" ? "Versan Gateway" : "Sekalipay";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/gateway`, {
        ...withCredentials(),
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (res.status === 401 || res.status === 403) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan konfigurasi gateway.");
      }

      setMessage("Konfigurasi gateway berhasil disimpan.");
      setMeta({
        hasApiKey: Boolean(json.data?.hasApiKey),
        hasSecretKey: Boolean(json.data?.hasSecretKey),
        apiKeyMasked: json.data?.apiKeyMasked || "",
        secretKeyMasked: json.data?.secretKeyMasked || ""
      });
      setForm((prev) => ({
        ...prev,
        apiKey: "",
        secretKey: ""
      }));
      setTemplates({
        callbackUrlTemplate: normalizeTemplateUrl(json.data.callbackUrlTemplate || "", "backend"),
        returnUrlTemplate: normalizeTemplateUrl(json.data.returnUrlTemplate || "", "frontend")
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan gateway.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ color: textMuted, fontWeight: 600 }}>Memuat konfigurasi gateway...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: textPrimary }}>Payment Gateway</h1>
        <p style={{ color: textMuted, fontSize: "14px", marginTop: "4px" }}>Kelola konfigurasi dan pantau koneksi ke payment gateway.</p>
      </div>

      {message ? (
        <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "12px", background: "#dcfce7", border: "1px solid #bbf7d0", color: "#166534", fontWeight: 600, fontSize: "14px" }}>
          {message}
        </div>
      ) : null}

      {error ? (
        <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "12px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 600, fontSize: "14px" }}>
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSave}
        style={{
          background: surface,
          borderRadius: "16px",
          border: `1px solid ${borderColor}`,
          padding: isMobile ? "20px" : "28px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: textPrimary }}>{providerName}</h2>
            <p style={{ margin: "4px 0 0", color: textMuted, fontSize: "13px" }}>Konfigurasi koneksi ke {providerName}.</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: "10px 18px", borderRadius: "10px", background: "#2563eb", color: "#ffffff", border: "none", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Menyimpan..." : "Simpan Gateway"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>BASE URL</span>
            <input
              type="text"
              value={form.baseUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="https://api.sekalipay.com"
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px", fontFamily: "monospace" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>MERCHANT CODE</span>
            <input
              type="text"
              value={form.merchantCode}
              onChange={(e) => setForm((prev) => ({ ...prev, merchantCode: e.target.value }))}
              placeholder="Merchant code dari provider"
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px", fontFamily: "monospace" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>API KEY</span>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder={meta.hasApiKey ? "Kosongkan jika tidak ingin mengganti" : "Masukkan API key"}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px", fontFamily: "monospace" }}
            />
            <span style={{ fontSize: "12px", color: textMuted }}>
              {meta.hasApiKey ? `Tersimpan: ${meta.apiKeyMasked}` : "Belum ada API key tersimpan."}
            </span>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>SECRET KEY</span>
            <input
              type="password"
              value={form.secretKey}
              onChange={(e) => setForm((prev) => ({ ...prev, secretKey: e.target.value }))}
              placeholder={meta.hasSecretKey ? "Kosongkan jika tidak ingin mengganti" : "Masukkan secret key"}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px", fontFamily: "monospace" }}
            />
            <span style={{ fontSize: "12px", color: textMuted }}>
              {meta.hasSecretKey ? `Tersimpan: ${meta.secretKeyMasked}` : "Belum ada secret key tersimpan."}
            </span>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>PAYMENT CODE</span>
            <input
              type="text"
              value={form.paymentCode}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentCode: e.target.value }))}
              placeholder="QRIS"
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: "24px", marginTop: "20px", flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "#334155", fontSize: "14px" }}>
            <input
              type="checkbox"
              checked={form.useHmac}
              onChange={(e) => setForm((prev) => ({ ...prev, useHmac: e.target.checked }))}
            />
            Gunakan HMAC
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "#334155", fontSize: "14px" }}>
            <input
              type="checkbox"
              checked={form.mockPayment}
              onChange={(e) => setForm((prev) => ({ ...prev, mockPayment: e.target.checked }))}
            />
            Mock Payment (Testing)
          </label>
        </div>

        {(templates.callbackUrlTemplate || templates.returnUrlTemplate) ? (
          <div style={{ marginTop: "20px", padding: "16px", borderRadius: "12px", background: innerSurface, border: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: "12px", color: textMuted, fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>URL Templates</div>
            {templates.callbackUrlTemplate ? (
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: textMuted }}>Callback: </span>
                <span style={{ fontSize: "13px", color: "#2563eb", fontFamily: "monospace", wordBreak: "break-all" }}>{templates.callbackUrlTemplate}</span>
              </div>
            ) : null}
            {templates.returnUrlTemplate ? (
              <div>
                <span style={{ fontSize: "12px", color: textMuted }}>Return: </span>
                <span style={{ fontSize: "13px", color: "#2563eb", fontFamily: "monospace", wordBreak: "break-all" }}>{templates.returnUrlTemplate}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
