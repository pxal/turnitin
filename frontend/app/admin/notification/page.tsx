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
  StatusBadge,
  adminTokens
} from "../../../components/admin/ui";

const NotificationIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 4a4 4 0 0 0-4 4v1.3c0 .7-.24 1.38-.67 1.92L6 13v1h12v-1l-1.33-1.78A3.2 3.2 0 0 1 16 9.3V8a4 4 0 0 0-4-4Zm0 16a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 20Z"
      fill="currentColor"
    />
  </svg>
);

const TelegramIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M21.5 4.5 2.6 11.4c-.9.4-.9 1.6.1 1.8l4.7 1.5 1.7 5.5c.2.7 1 .9 1.5.4l2.8-2.6 4.6 3.4c.7.5 1.7.1 1.9-.7l3.5-15.4c.3-1.1-.8-2-1.9-1.6Zm-3.7 4.4-9 8c-.3.3-.5.7-.6 1.1l-.4 2.6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const guideSteps = [
  { title: "Buat bot baru", text: "Buka @BotFather di Telegram, jalankan /newbot, lalu salin token yang diberikan." },
  { title: "Undang bot", text: "Tambahkan bot ke chat pribadi atau grup yang ingin menerima notifikasi." },
  { title: "Ambil chat ID", text: "Gunakan @userinfobot atau @getidsbot untuk mengetahui chat ID tujuan." },
  { title: "Simpan & test", text: "Isi form lalu klik 'Kirim Test Telegram' untuk memverifikasi bot bisa mengirim pesan." }
];

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
    return (
      <AdminCard padding="32px">
        <div style={{ color: adminTokens.textMuted, fontWeight: 600 }}>Memuat konfigurasi notifikasi…</div>
      </AdminCard>
    );
  }

  const isReady = form.enabled && meta.hasBotToken && Boolean(form.chatId);

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <AdminPageHeader
        eyebrow="Modul Komunikasi"
        title="Notifikasi"
        subtitle="Hubungkan bot Telegram untuk menerima alert otomatis setiap order sukses dibayar."
        icon={NotificationIcon}
        actions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <StatusBadge tone={form.enabled ? "success" : "neutral"}>
              {form.enabled ? "Notifikasi aktif" : "Notifikasi nonaktif"}
            </StatusBadge>
            <StatusBadge tone={meta.hasBotToken ? "brand" : "warning"}>
              {meta.hasBotToken ? "Bot tersambung" : "Bot belum diisi"}
            </StatusBadge>
          </div>
        }
      />

      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}
      {error ? <AdminAlert tone="danger">{error}</AdminAlert> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.4fr) minmax(280px, 0.9fr)",
          gap: "20px",
          alignItems: "start"
        }}
      >
        <form onSubmit={handleSave}>
          <AdminCard padding={isMobile ? "20px" : "26px"}>
            <AdminSectionHeader
              title="Telegram Bot"
              subtitle="Kirim alert otomatis ke Telegram saat pesanan sukses dibayar."
              icon={TelegramIcon}
              actions={
                <AdminButton type="submit" disabled={saving}>
                  {saving ? "Menyimpan…" : "Simpan Notifikasi"}
                </AdminButton>
              }
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <AdminCheckbox
                label="Aktifkan notifikasi Telegram"
                description="Jika nonaktif, semua bot Telegram tidak akan menerima pesan dari sistem."
                checked={form.enabled}
                onChange={(next) => setForm((prev) => ({ ...prev, enabled: next }))}
              />

              <AdminInput
                label="Bot Token"
                type="password"
                value={form.botToken}
                onChange={(e) => setForm((prev) => ({ ...prev, botToken: e.target.value }))}
                placeholder={meta.hasBotToken ? "Kosongkan jika tidak ingin mengganti token bot" : "Masukkan token bot Telegram"}
                inputStyle={{ fontFamily: "monospace" }}
                hint={
                  meta.hasBotToken
                    ? `Token tersimpan aman di server: ${meta.botTokenMasked}`
                    : "Belum ada token bot yang tersimpan."
                }
              />

              <AdminInput
                label="Chat ID"
                value={form.chatId}
                onChange={(e) => setForm((prev) => ({ ...prev, chatId: e.target.value }))}
                placeholder="Contoh: 123456789 atau -1001234567890"
                inputStyle={{ fontFamily: "monospace" }}
                hint="Bisa berupa ID user atau ID grup Telegram (boleh diawali tanda minus)."
              />

              <AdminCheckbox
                label="Kirim notifikasi saat order sudah dibayar"
                description="Jika dimatikan, notifikasi otomatis order PAID tidak akan terkirim."
                checked={form.notifyPaidOrders}
                onChange={(next) => setForm((prev) => ({ ...prev, notifyPaidOrders: next }))}
              />

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <AdminButton
                  type="button"
                  variant="ghost"
                  onClick={() => void handleSendTest()}
                  disabled={sendingTest}
                >
                  {sendingTest ? "Mengirim test…" : "Kirim Test Telegram"}
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        </form>

        <div style={{ display: "grid", gap: "16px" }}>
          <AdminCard padding={isMobile ? "20px" : "24px"}>
            <AdminSectionHeader
              title="Status Saat Ini"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z" fill="currentColor" />
                </svg>
              }
            />
            <div
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: isReady ? "#ecfdf5" : adminTokens.surfaceMuted,
                border: `1px solid ${isReady ? "#bbf7d0" : adminTokens.border}`
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: adminTokens.textMuted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px"
                }}
              >
                Konektivitas
              </div>
              <div style={{ fontWeight: 800, fontSize: "16px", color: isReady ? adminTokens.success : adminTokens.textSubtle }}>
                {isReady ? "Siap mengirim notifikasi" : "Konfigurasi belum lengkap"}
              </div>
              <div style={{ fontSize: "12px", color: adminTokens.textMuted, marginTop: "4px", lineHeight: 1.55 }}>
                {isReady
                  ? "Setiap order yang berstatus PAID akan mengirim pesan ke chat Telegram terkonfigurasi."
                  : "Aktifkan notifikasi, isi token bot, dan pastikan chat ID sudah terisi."}
              </div>
            </div>
          </AdminCard>

          <AdminCard padding={isMobile ? "20px" : "24px"}>
            <AdminSectionHeader
              title="Panduan Singkat"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-2h2v2Zm2-7.4-.9.9c-.7.7-1.1 1.3-1.1 2.5h-2v-.5c0-.9.4-1.7 1.1-2.4l1.2-1.3c.4-.4.7-.9.7-1.5a2 2 0 1 0-4 0H7a4 4 0 1 1 8 0 3.2 3.2 0 0 1-1 2.3Z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
            <ol style={{ display: "grid", gap: "12px", padding: 0, margin: 0, listStyle: "none" }}>
              {guideSteps.map((step, index) => (
                <li
                  key={step.title}
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: `1px solid ${adminTokens.border}`,
                    background: adminTokens.surfaceMuted,
                    alignItems: "flex-start"
                  }}
                >
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "8px",
                      background: adminTokens.brandSoft,
                      color: adminTokens.brand,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "12px",
                      flexShrink: 0
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: adminTokens.textPrimary, fontSize: "13px" }}>{step.title}</div>
                    <div style={{ fontSize: "12.5px", color: adminTokens.textMuted, marginTop: "2px", lineHeight: 1.55 }}>
                      {step.text}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
