"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiBaseUrl,
  clearAdminSession,
  withCredentials
} from "../../../lib/api";
import { useIsMobile } from "../../../lib/hooks/useIsMobile";

export default function AdminNotificationPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    enabled: false,
    botToken: "",
    chatId: "",
    notifyPaidOrders: true
  });
  const [meta, setMeta] = useState({
    hasBotToken: false,
    botTokenMasked: ""
  });
  const surface = "#ffffff";
  const innerSurface = "#f8fafc";
  const borderColor = "#e2e8f0";
  const textPrimary = "#0f172a";
  const textMuted = "#64748b";

  useEffect(() => {
    async function loadSettings() {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/notifications`, withCredentials());
      const json = await res.json();
      if (res.status === 401 || res.status === 403) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) {
        throw new Error(json.message || "Gagal memuat konfigurasi notifikasi.");
      }

        setForm({
          enabled: Boolean(json.telegram?.enabled),
          botToken: "",
          chatId: json.telegram?.chatId || "",
          notifyPaidOrders: json.telegram?.notifyPaidOrders ?? true
        });
        setMeta({
          hasBotToken: Boolean(json.telegram?.hasBotToken),
          botTokenMasked: json.telegram?.botTokenMasked || ""
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat notifikasi.");
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/notifications`, {
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
        throw new Error(json.message || "Gagal menyimpan konfigurasi notifikasi.");
      }

      setMeta({
        hasBotToken: Boolean(json.data?.telegram?.hasBotToken),
        botTokenMasked: json.data?.telegram?.botTokenMasked || ""
      });
      setForm((prev) => ({
        ...prev,
        botToken: ""
      }));
      setMessage("Konfigurasi notifikasi Telegram berhasil disimpan.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan notifikasi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setSendingTest(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/notifications/test`, {
        ...withCredentials(),
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const json = await res.json();
      if (res.status === 401 || res.status === 403) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim test notifikasi.");
      }

      setMessage(json.message || "Test notifikasi berhasil dikirim.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Gagal mengirim test notifikasi.");
    } finally {
      setSendingTest(false);
    }
  }

  if (loading) {
    return <div style={{ color: textMuted, fontWeight: 600 }}>Memuat konfigurasi notifikasi...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: textPrimary }}>Notification</h1>
        <p style={{ color: textMuted, fontSize: "14px", marginTop: "4px" }}>
          Hubungkan bot Telegram untuk menerima notifikasi order yang sudah dibayar.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.4fr) minmax(280px, 0.9fr)", gap: "20px" }}>
        <form
          onSubmit={handleSave}
          style={{ background: surface, borderRadius: "16px", border: `1px solid ${borderColor}`, padding: isMobile ? "20px" : "28px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: textPrimary }}>Telegram Bot</h2>
              <p style={{ margin: "4px 0 0", color: textMuted, fontSize: "13px" }}>
                Kirim alert otomatis ke Telegram saat pesanan sukses dibayar.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: "10px 18px", borderRadius: "10px", background: "#2563eb", color: "#ffffff", border: "none", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Menyimpan..." : "Simpan Notifikasi"}
            </button>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "#334155", fontSize: "14px" }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              Aktifkan notifikasi Telegram
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>BOT TOKEN</span>
              <input
                type="password"
                value={form.botToken}
                onChange={(e) => setForm((prev) => ({ ...prev, botToken: e.target.value }))}
                placeholder={meta.hasBotToken ? "Kosongkan jika tidak ingin mengganti token bot" : "Masukkan token bot Telegram"}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px", fontFamily: "monospace" }}
              />
              <span style={{ fontSize: "12px", color: textMuted }}>
                {meta.hasBotToken
                  ? `Token tersimpan aman di server: ${meta.botTokenMasked}`
                  : "Belum ada token bot yang tersimpan."}
              </span>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>CHAT ID</span>
              <input
                type="text"
                value={form.chatId}
                onChange={(e) => setForm((prev) => ({ ...prev, chatId: e.target.value }))}
                placeholder="Contoh: 123456789 atau -1001234567890"
                style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px", fontFamily: "monospace" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "#334155", fontSize: "14px" }}>
              <input
                type="checkbox"
                checked={form.notifyPaidOrders}
                onChange={(e) => setForm((prev) => ({ ...prev, notifyPaidOrders: e.target.checked }))}
              />
              Kirim notifikasi saat order sudah dibayar
            </label>

            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={sendingTest}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  background: innerSurface,
                  color: "#2563eb",
                  border: `1px solid ${borderColor}`,
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: sendingTest ? "not-allowed" : "pointer"
                }}
              >
                {sendingTest ? "Mengirim test..." : "Kirim Test Telegram"}
              </button>
            </div>
          </div>
        </form>

        <div style={{ background: surface, borderRadius: "16px", padding: isMobile ? "20px" : "28px", color: textPrimary, border: `1px solid ${borderColor}`, boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", color: textPrimary }}>Panduan Singkat</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", color: "#475569", fontSize: "14px", lineHeight: 1.7 }}>
            <p style={{ margin: 0 }}>
              1. Buat bot baru dengan <strong>@BotFather</strong> dan salin token-nya.
            </p>
            <p style={{ margin: 0 }}>
              2. Tambahkan bot ke chat pribadi atau grup tujuan.
            </p>
            <p style={{ margin: 0 }}>
              3. Ambil <strong>chat ID</strong> lalu simpan di form ini.
            </p>
            <p style={{ margin: 0 }}>
              4. Notifikasi hanya akan dikirim sekali per order yang sukses dibayar.
            </p>
            <p style={{ margin: 0 }}>
              5. Gunakan tombol <strong>Kirim Test Telegram</strong> untuk memastikan bot dan chat ID sudah benar.
            </p>
          </div>
          <div style={{ marginTop: "20px", padding: "14px", borderRadius: "12px", background: innerSurface, border: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: "11px", color: textMuted, marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>STATUS SAAT INI</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: form.enabled && meta.hasBotToken && form.chatId ? "#059669" : "#94a3b8" }}>
              {form.enabled && meta.hasBotToken && form.chatId ? "Siap mengirim notifikasi" : "Belum lengkap"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
