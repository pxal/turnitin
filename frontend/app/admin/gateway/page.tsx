"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiBaseUrl, clearAdminSession, withCredentials } from "../../../lib/api";
import { useIsMobile } from "../../../lib/hooks/useIsMobile";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminCheckbox,
  AdminInput,
  AdminPageHeader,
  AdminSectionHeader,
  adminTokens
} from "../../../components/admin/ui";

const GatewayIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2 1.5v2h12V8H6Zm0 5v4h5v-4H6Z"
      fill="currentColor"
    />
  </svg>
);

export default function AdminGatewayPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    baseUrl: "",
    apiKey: "",
    secretKey: "",
    merchantCode: "",
    mockPayment: false
  });
  const [templates, setTemplates] = useState({
    callbackUrlTemplate: ""
  });
  const [meta, setMeta] = useState({
    hasApiKey: false,
    hasSecretKey: false,
    apiKeyMasked: "",
    secretKeyMasked: ""
  });

  function normalizeTemplateUrl(value: string) {
    if (!value) {
      return "";
    }

    if (!/localhost/i.test(value) || typeof window === "undefined") {
      return value;
    }

    const origin = apiBaseUrl || window.location.origin;
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
          baseUrl: json.baseUrl || "",
          apiKey: "",
          secretKey: "",
          merchantCode: json.merchantCode || "",
          mockPayment: Boolean(json.mockPayment)
        });
        setMeta({
          hasApiKey: Boolean(json.hasApiKey),
          hasSecretKey: Boolean(json.hasSecretKey),
          apiKeyMasked: json.apiKeyMasked || "",
          secretKeyMasked: json.secretKeyMasked || ""
        });
        setTemplates({
          callbackUrlTemplate: normalizeTemplateUrl(json.callbackUrlTemplate || "")
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat gateway.");
      } finally {
        setLoading(false);
      }
    }

    void loadGateway();
  }, [router]);

  const providerName = "Verscan Gateway";

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
        callbackUrlTemplate: normalizeTemplateUrl(json.data.callbackUrlTemplate || "")
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan gateway.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminCard padding="32px">
        <div style={{ color: adminTokens.textMuted, fontWeight: 600 }}>Memuat konfigurasi gateway…</div>
      </AdminCard>
    );
  }

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <AdminPageHeader
        eyebrow="Modul Pembayaran"
        title="Payment Gateway"
        subtitle="Konfigurasi koneksi ke provider pembayaran beserta callback URL untuk integrasi otomatis."
        icon={GatewayIcon}
      />

      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}
      {error ? <AdminAlert tone="danger">{error}</AdminAlert> : null}

      <form onSubmit={handleSave}>
        <AdminCard padding={isMobile ? "20px" : "26px"}>
          <AdminSectionHeader
            title={providerName}
            subtitle={`Konfigurasi koneksi ke ${providerName}.`}
            icon={GatewayIcon}
            actions={
              <AdminButton type="submit" disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan Gateway"}
              </AdminButton>
            }
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "16px"
            }}
          >
            <AdminInput
              label="Base URL"
              value={form.baseUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="http://localhost:1000"
              inputStyle={{ fontFamily: "monospace" }}
            />
            <AdminInput
              label="Merchant ID"
              value={form.merchantCode}
              onChange={(e) => setForm((prev) => ({ ...prev, merchantCode: e.target.value }))}
              placeholder="VER-XXXXX"
              inputStyle={{ fontFamily: "monospace" }}
            />
            <AdminInput
              label="API Key"
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder={meta.hasApiKey ? "Kosongkan jika tidak ingin mengganti" : "Masukkan API key"}
              inputStyle={{ fontFamily: "monospace" }}
              hint={meta.hasApiKey ? `Tersimpan: ${meta.apiKeyMasked}` : "Belum ada API key tersimpan."}
            />
            <AdminInput
              label="Secret Key"
              type="password"
              value={form.secretKey}
              onChange={(e) => setForm((prev) => ({ ...prev, secretKey: e.target.value }))}
              placeholder={meta.hasSecretKey ? "Kosongkan jika tidak ingin mengganti" : "Masukkan secret key"}
              inputStyle={{ fontFamily: "monospace" }}
              hint={meta.hasSecretKey ? `Tersimpan: ${meta.secretKeyMasked}` : "Webhook secret untuk validasi callback."}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "12px",
              marginTop: "18px"
            }}
          >
            <AdminCheckbox
              label="Mock Payment (Testing)"
              description="Pembayaran disimulasikan tanpa request ke provider. Cocok untuk staging/QA."
              checked={form.mockPayment}
              onChange={(next) => setForm((prev) => ({ ...prev, mockPayment: next }))}
            />
          </div>
        </AdminCard>
      </form>

      {templates.callbackUrlTemplate ? (
        <AdminCard padding={isMobile ? "20px" : "24px"}>
          <AdminSectionHeader
            title="URL Templates"
            subtitle="Salin URL berikut ke dashboard provider untuk callback pembayaran."
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M11 17H7a4 4 0 0 1 0-8h2v2H7a2 2 0 1 0 0 4h4v2Zm-2-7h6v2H9v-2Zm4 7v-2h2a2 2 0 1 0 0-4h-2V9h2a4 4 0 0 1 0 8h-2Z"
                  fill="currentColor"
                />
              </svg>
            }
          />
          <div style={{ display: "grid", gap: "10px" }}>
            {templates.callbackUrlTemplate ? (
              <UrlRow label="Callback URL" value={templates.callbackUrlTemplate} />
            ) : null}
          </div>
        </AdminCard>
      ) : null}
    </div>
  );
}

function UrlRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: "8px",
        padding: "12px 14px",
        borderRadius: "12px",
        border: `1px solid ${adminTokens.border}`,
        background: adminTokens.surfaceMuted
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "11px", color: adminTokens.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
          }}
          style={{
            padding: "4px 10px",
            borderRadius: "999px",
            background: adminTokens.surface,
            border: `1px solid ${adminTokens.border}`,
            color: adminTokens.textSecondary,
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Salin
        </button>
      </div>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: "13px",
          color: adminTokens.brand,
          wordBreak: "break-all"
        }}
      >
        {value}
      </div>
    </div>
  );
}
