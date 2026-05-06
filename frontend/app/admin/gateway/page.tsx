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
  const surface = "#182235";
  const innerSurface = "#111a2d";
  const borderColor = "rgba(143, 163, 194, 0.14)";
  const textPrimary = "#f8fbff";
  const textMuted = "#8ea3c2";

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
    return <div>Memuat konfigurasi gateway...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: textPrimary }}>Payment Gateway</h1>
        <p style={{ color: textMuted }}>Kelola konfigurasi dan pantau koneksi ke payment gateway.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: "32px" }}>
        {/* Active Provider */}
        <form
          onSubmit={handleSave}
          style={{ background: surface, borderRadius: "24px", border: `1px solid ${borderColor}`, padding: "32px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: innerSurface, border: `1px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>💳</div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: textPrimary }}>{providerName}</h3>
                <span style={{ fontSize: "12px", color: meta.hasApiKey && meta.hasSecretKey ? "#69ebc0" : textMuted, fontWeight: 700 }}>
                  ● {meta.hasApiKey && meta.hasSecretKey ? "SIAP DIGUNAKAN" : "PERLU KONFIGURASI"}
                </span>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: "10px 18px", borderRadius: "10px", background: "#69ebc0", color: "#0b1d28", border: "none", fontSize: "13px", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
            </button>
          </div>

          {message ? (
            <div style={{ marginBottom: "20px", padding: "14px 16px", borderRadius: "12px", background: "rgba(105, 235, 192, 0.09)", color: "#9deed3", border: "1px solid rgba(105, 235, 192, 0.16)", fontWeight: 700 }}>
              {message}
            </div>
          ) : null}

          {error ? (
            <div style={{ marginBottom: "20px", padding: "14px 16px", borderRadius: "12px", background: "rgba(255, 110, 106, 0.1)", color: "#ff9b9b", border: "1px solid rgba(255, 110, 106, 0.14)", fontWeight: 700 }}>
              {error}
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: "20px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: textMuted, fontWeight: 700 }}>PROVIDER</span>
              <select
                value={form.provider}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  provider: e.target.value,
                  baseUrl: e.target.value === "versan" && !prev.baseUrl ? "https://gateway.verscan.net" : prev.baseUrl,
                  paymentCode: e.target.value === "versan" ? "QRIS" : prev.paymentCode
                }))}
                style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px", fontWeight: 700 }}
              >
                <option value="sekalipay">Sekalipay</option>
                <option value="versan">Versan Gateway</option>
              </select>
            </label>
            {[
              { label: "BASE URL", key: "baseUrl", placeholder: form.provider === "versan" ? "https://gateway.verscan.net" : "https://sekalipay.com/api/v1/gateway" },
              { label: form.provider === "versan" ? "STORE ID / CATATAN" : "MERCHANT CODE", key: "merchantCode", placeholder: form.provider === "versan" ? "Opsional, mis. store utama" : "MCH-XXXX" },
              { label: "API KEY", key: "apiKey", placeholder: "Masukkan API key gateway" },
              { label: form.provider === "versan" ? "WEBHOOK SECRET" : "SECRET KEY", key: "secretKey", placeholder: form.provider === "versan" ? "Masukkan webhook secret gateway" : "Masukkan secret key gateway" },
              { label: "PAYMENT CODE", key: "paymentCode", placeholder: "QRIS" }
            ].filter((field) => form.provider !== "versan" || field.key !== "paymentCode").map((field) => (
              <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: textMuted, fontWeight: 700 }}>{field.label}</span>
                <input
                  type={field.key.toLowerCase().includes("secret") ? "password" : "text"}
                  value={form[field.key as keyof typeof form] as string}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={
                    field.key === "apiKey"
                      ? meta.hasApiKey
                        ? "Kosongkan jika tidak ingin mengganti API key"
                        : field.placeholder
                      : field.key === "secretKey"
                        ? meta.hasSecretKey
                          ? "Kosongkan jika tidak ingin mengganti secret key"
                          : field.placeholder
                        : field.placeholder
                  }
                  style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px", fontFamily: field.key === "apiKey" || field.key === "secretKey" ? "monospace" : "inherit" }}
                />
                {field.key === "apiKey" && meta.hasApiKey ? (
                  <span style={{ fontSize: "12px", color: textMuted }}>
                    API key tersimpan di server: {meta.apiKeyMasked}
                  </span>
                ) : null}
                {field.key === "secretKey" && meta.hasSecretKey ? (
                  <span style={{ fontSize: "12px", color: textMuted }}>
                    Secret key tersimpan di server: {meta.secretKeyMasked}
                  </span>
                ) : null}
              </label>
            ))}
            <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: textMuted, fontWeight: 700 }}>CALLBACK URL TEMPLATE</span>
              <input value={templates.callbackUrlTemplate} readOnly style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: `1px solid ${borderColor}`, fontSize: "14px", fontFamily: "monospace", background: innerSurface, color: "#c8d7ea" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: textMuted, fontWeight: 700 }}>RETURN URL TEMPLATE</span>
              <input value={templates.returnUrlTemplate} readOnly style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: `1px solid ${borderColor}`, fontSize: "14px", fontFamily: "monospace", background: innerSurface, color: "#c8d7ea" }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: "24px", marginTop: "24px", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 600, color: "#dce7f5" }}>
              <input
                type="checkbox"
                checked={form.useHmac}
                onChange={(e) => setForm((prev) => ({ ...prev, useHmac: e.target.checked }))}
              />
              Aktifkan Enhanced HMAC mode (`X-Timestamp`)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 600, color: "#dce7f5" }}>
              <input
                type="checkbox"
                checked={form.mockPayment}
                onChange={(e) => setForm((prev) => ({ ...prev, mockPayment: e.target.checked }))}
              />
              Gunakan mock payment mode
            </label>
          </div>

          <div style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "12px", background: innerSurface, border: `1px solid ${borderColor}`, color: "#c8d7ea", fontSize: "13px", lineHeight: 1.6 }}>
            {form.provider === "versan"
              ? "Versan Gateway memakai Authorization Bearer API key untuk membuat/cek pembayaran dan X-Gateway-Signature untuk callback pembayaran."
              : form.useHmac
              ? "Gunakan mode ini hanya bila akun merchant Anda memang memakai Enhanced HMAC dengan header X-Timestamp. Uji live terakhir menunjukkan akun ini tidak menerima mode tersebut."
              : "Mode aktif yang cocok untuk akun ini adalah IP whitelist + raw body signature. Disarankan biarkan Enhanced HMAC tetap nonaktif."}
          </div>
        </form>

        {/* Info Card */}
        <div style={{ background: surface, borderRadius: "24px", padding: "32px", color: "white", border: `1px solid ${borderColor}` }}>
          <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>Tips Keamanan</h3>
          <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
            Pastikan Secret Key Anda tidak pernah dibagikan kepada siapapun. Setelah menyimpan konfigurasi baru, order pembayaran berikutnya akan memakai nilai terbaru dari dashboard ini.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ color: form.useHmac ? "#38bdf8" : "#64748b" }}>✔</span>
              <span style={{ fontSize: "14px", color: "#cbd5e1" }}>
                {form.useHmac ? "Enhanced HMAC mode aktif" : "IP whitelist + raw body signature aktif"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ color: form.mockPayment ? "#64748b" : "#38bdf8" }}>✔</span>
              <span style={{ fontSize: "14px", color: "#cbd5e1" }}>
                {form.mockPayment ? "Mock payment aktif untuk pengujian internal" : "Live payment mode aktif"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ color: meta.hasApiKey && meta.hasSecretKey ? "#69ebc0" : "#64748b" }}>✔</span>
              <span style={{ fontSize: "14px", color: "#cbd5e1" }}>
                {meta.hasApiKey && meta.hasSecretKey ? "Secret gateway tersimpan aman di server" : "Secret gateway belum lengkap"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
