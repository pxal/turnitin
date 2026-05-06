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
  const surface = "#182235";
  const innerSurface = "#111a2d";
  const borderColor = "rgba(143, 163, 194, 0.14)";
  const textPrimary = "#f8fbff";
  const textMuted = "#8ea3c2";

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
    return <div>Memuat konfigurasi notifikasi...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: textPrimary }}>Notification</h1>
        <p style={{ color: textMuted }}>
          Hubungkan bot Telegram untuk menerima notifikasi order yang sudah dibayar.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.4fr) minmax(280px, 0.9fr)", gap: "24px" }}>
        <form
          onSubmit={handleSave}
          style={{ background: surface, borderRadius: "24px", border: `1px solid ${borderColor}`, padding: "32px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", color: textPrimary }}>Telegram Bot</h2>
              <p style={{ margin: "8px 0 0", color: textMuted, fontSize: "14px" }}>
                Kirim alert otomatis ke Telegram saat pesanan sukses dibayar.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: "10px 18px", borderRadius: "10px", background: "#69ebc0", color: "#0b1d28", border: "none", fontSize: "13px", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Menyimpan..." : "Simpan Notifikasi"}
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

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, color: "#dce7f5" }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              Aktifkan notifikasi Telegram
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: textMuted, fontWeight: 700 }}>BOT TOKEN</span>
              <input
                type="password"
                value={form.botToken}
                onChange={(e) => setForm((prev) => ({ ...prev, botToken: e.target.value }))}
                placeholder={meta.hasBotToken ? "Kosongkan jika tidak ingin mengganti token bot" : "Masukkan token bot Telegram"}
                style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px", fontFamily: "monospace" }}
              />
              <span style={{ fontSize: "12px", color: textMuted }}>
                {meta.hasBotToken
                  ? `Token tersimpan aman di server: ${meta.botTokenMasked}`
                  : "Belum ada token bot yang tersimpan."}
              </span>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: textMuted, fontWeight: 700 }}>CHAT ID</span>
              <input
                type="text"
                value={form.chatId}
                onChange={(e) => setForm((prev) => ({ ...prev, chatId: e.target.value }))}
                placeholder="Contoh: 123456789 atau -1001234567890"
                style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontSize: "14px", fontFamily: "monospace" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, color: "#dce7f5" }}>
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
                  padding: "12px 18px",
                  borderRadius: "12px",
                  background: innerSurface,
                  color: "#8fc1ff",
                  border: `1px solid ${borderColor}`,
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: sendingTest ? "not-allowed" : "pointer"
                }}
              >
                {sendingTest ? "Mengirim test..." : "Kirim Test Telegram"}
              </button>
            </div>
          </div>
        </form>

        <div style={{ background: surface, borderRadius: "24px", padding: "32px", color: "white", border: `1px solid ${borderColor}` }}>
          <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>Panduan Singkat</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#cbd5e1", fontSize: "14px", lineHeight: 1.7 }}>
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
          <div style={{ marginTop: "24px", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px", fontWeight: 700 }}>STATUS SAAT INI</div>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>
              {form.enabled && meta.hasBotToken && form.chatId ? "Siap mengirim notifikasi" : "Belum lengkap"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
