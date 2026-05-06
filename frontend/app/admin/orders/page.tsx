"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl, clearAdminSession, formatRupiah, withCredentials, withSessionRole } from "../../../lib/api";
import { useRouter } from "next/navigation";
import { useIsMobile } from "../../../lib/hooks/useIsMobile";
import ActionDialog from "../../../components/ui/action-dialog";

type OrderItem = {
  id: string;
  publicId: string;
  originalName: string;
  sourceFileUrl?: string | null;
  paymentStatus: string;
  checkStatus: string;
  finalAmount: number;
  createdAt: string;
  resultSummary?: string | null;
  resultReportUrl?: string | null;
  user: {
    fullName: string;
    email: string;
  };
  package: {
    name: string;
    price: number;
  };
  payments: Array<{
    providerRef?: string | null;
    qrUrl?: string | null;
    status: string;
    paidAt?: string | null;
  }>;
};

function formatWibDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

type OrdersPayload = {
  success: boolean;
  data: OrderItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [notice, setNotice] = useState("");
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const surface = "#182235";
  const innerSurface = "#111a2d";
  const borderColor = "rgba(143, 163, 194, 0.14)";
  const textPrimary = "#f8fbff";
  const textMuted = "#8ea3c2";

  function canRetryOrder(order: OrderItem) {
    return order.paymentStatus === "PAID" && (order.checkStatus === "PAID" || order.checkStatus === "FAILED");
  }

  function getRetryBlockedReason(order: OrderItem) {
    if (order.paymentStatus !== "PAID") {
      return "Order belum lunas, jadi belum bisa diproses ulang.";
    }

    if (order.checkStatus === "PROCESSING") {
      return "Dokumen sedang diproses, jadi belum bisa dikirim ulang.";
    }

    if (order.checkStatus === "COMPLETED") {
      return "Dokumen sudah selesai diproses.";
    }

    if (order.checkStatus !== "PAID" && order.checkStatus !== "FAILED") {
      return "Tombol ini aktif untuk status cek PAID atau FAILED.";
    }

    return "";
  }

  async function retryOrder(order: OrderItem) {
    setRetryingOrderId(order.id);
    setNotice("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/orders/${order.id}/process`, {
        ...withCredentials(),
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      const payload = await res.json().catch(() => ({} as { message?: string; success?: boolean }));

      if (res.status === 401) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (res.status === 403) {
        throw new Error(payload.message || "Anda tidak berhak memproses request ini.");
      }

      if (!res.ok) {
        throw new Error(payload.message || "Gagal mengirim ulang request pemrosesan.");
      }

      setNotice(`Request ${order.publicId} berhasil dikirim ulang untuk diproses.`);
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({
          ...selectedOrder,
          checkStatus: "PROCESSING",
          resultSummary: null
        });
      }
      await fetchOrders(page);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal mengirim ulang request pemrosesan.");
    } finally {
      setRetryingOrderId(null);
    }
  }

  async function fetchOrders(nextPage = page) {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterStatus) query.append("status", filterStatus);
      if (filterPayment) query.append("payment", filterPayment);
      query.append("page", String(nextPage));
      query.append("limit", "10");
      
      const res = await fetch(`${apiBaseUrl}/api/admin/orders?${query.toString()}`, {
        ...withCredentials()
      });
      const json = (await res.json()) as OrdersPayload & { message?: string };
      if (res.status === 401) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (res.status === 403) {
        throw new Error(json.message || "Akses admin ditolak.");
      }
      if (!res.ok) {
        throw new Error(json.message || "Akses admin ditolak.");
      }
      setOrders(json.data || []);
      setPagination(json.pagination || { page: nextPage, limit: 10, totalItems: 0, totalPages: 1 });
      setPage(json.pagination?.page || nextPage);
    } catch (err) {
      console.error(err);
      setNotice(err instanceof Error ? err.message : "Gagal memuat data pesanan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    void fetchOrders(1);
  }, [filterStatus, filterPayment]);

  return (
    <div>
      <ActionDialog
        open={Boolean(selectedOrder)}
        title={selectedOrder ? `Detail Order ${selectedOrder.publicId}` : "Detail Order"}
        description={selectedOrder ? "Ringkasan order, pembayaran, dan hasil pengecekan untuk kebutuhan operasional admin." : ""}
        cancelLabel="Tutup"
        onClose={() => setSelectedOrder(null)}
      >
        {selectedOrder ? (
          <div style={{ display: "grid", gap: isMobile ? "14px" : "18px", minWidth: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px" }}>
              {[
                ["Invoice", selectedOrder.payments[0]?.providerRef || "-"],
                ["Public ID", selectedOrder.publicId],
                ["Customer", selectedOrder.user.fullName],
                ["Email", selectedOrder.user.email],
                ["Dokumen", selectedOrder.originalName],
                ["Paket", selectedOrder.package.name]
              ].map(([label, value]) => (
                <div key={label} style={{ background: innerSurface, border: `1px solid ${borderColor}`, borderRadius: isMobile ? "14px" : "16px", padding: isMobile ? "12px 14px" : "14px 16px", minWidth: 0 }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.7px", color: textMuted, textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
                  <div style={{ fontSize: "14px", lineHeight: 1.6, color: textPrimary, fontWeight: 700, overflowWrap: "anywhere" }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "16px" }}>
              <div style={{ background: innerSurface, border: `1px solid ${borderColor}`, borderRadius: isMobile ? "14px" : "16px", padding: isMobile ? "14px" : "16px", minWidth: 0 }}>
                <div style={{ fontSize: "12px", color: textMuted, fontWeight: 700, marginBottom: "6px" }}>Pembayaran</div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#69ebc0", overflowWrap: "anywhere" }}>{selectedOrder.paymentStatus}</div>
              </div>
              <div style={{ background: innerSurface, border: `1px solid ${borderColor}`, borderRadius: isMobile ? "14px" : "16px", padding: isMobile ? "14px" : "16px", minWidth: 0 }}>
                <div style={{ fontSize: "12px", color: textMuted, fontWeight: 700, marginBottom: "6px" }}>Status Cek</div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: textPrimary, overflowWrap: "anywhere" }}>{selectedOrder.checkStatus}</div>
              </div>
              <div style={{ background: innerSurface, border: `1px solid ${borderColor}`, borderRadius: isMobile ? "14px" : "16px", padding: isMobile ? "14px" : "16px", minWidth: 0 }}>
                <div style={{ fontSize: "12px", color: textMuted, fontWeight: 700, marginBottom: "6px" }}>Nominal Final</div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#69a8ff", overflowWrap: "anywhere" }}>{formatRupiah(selectedOrder.finalAmount || selectedOrder.package.price)}</div>
              </div>
            </div>

            <div style={{ border: `1px solid ${borderColor}`, background: innerSurface, borderRadius: isMobile ? "14px" : "18px", padding: isMobile ? "14px" : "18px", minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: textMuted, marginBottom: "10px" }}>Catatan Hasil</div>
              <div style={{ color: "#d7e4f3", lineHeight: 1.7, fontSize: "14px" }}>
                {selectedOrder.resultSummary || "Belum ada ringkasan hasil. Order mungkin masih menunggu pembayaran atau proses pengecekan."}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(selectedOrder.publicId);
                  setNotice(`Public ID ${selectedOrder.publicId} berhasil disalin.`);
                }}
                style={{ width: isMobile ? "100%" : "auto", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontWeight: 800, cursor: "pointer" }}
              >
                Salin Public ID
              </button>
              <button
                type="button"
                onClick={() => void retryOrder(selectedOrder)}
                disabled={retryingOrderId === selectedOrder.id || !canRetryOrder(selectedOrder)}
                title={canRetryOrder(selectedOrder) ? "Kirim ulang dokumen ke proses checker" : getRetryBlockedReason(selectedOrder)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: canRetryOrder(selectedOrder) ? "#69ebc0" : "#44536c",
                  color: canRetryOrder(selectedOrder) ? "#0b1d28" : "#dce7f5",
                  fontWeight: 800,
                  cursor: retryingOrderId === selectedOrder.id || !canRetryOrder(selectedOrder) ? "not-allowed" : "pointer",
                  opacity: retryingOrderId === selectedOrder.id ? 0.7 : 1,
                  width: isMobile ? "100%" : "auto"
                }}
              >
                {retryingOrderId === selectedOrder.id ? "Mengirim Ulang..." : "Proses Ulang Dokumen"}
              </button>
              {selectedOrder.resultReportUrl ? (
                <a
                  href={selectedOrder.resultReportUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ width: isMobile ? "100%" : "auto", textAlign: "center", padding: "12px 16px", borderRadius: "12px", background: "#69a8ff", color: "#0d2030", fontWeight: 800, textDecoration: "none" }}
                >
                  Buka Report
                </a>
              ) : null}
              {selectedOrder.payments[0]?.qrUrl ? (
                <a
                  href={selectedOrder.payments[0].qrUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={{ width: isMobile ? "100%" : "auto", textAlign: "center", padding: "12px 16px", borderRadius: "12px", background: "#2b3851", color: "#cfe0ff", fontWeight: 800, textDecoration: "none" }}
                >
                  Lihat QR Payment
                </a>
              ) : null}
            </div>
            {!canRetryOrder(selectedOrder) ? (
              <div style={{ borderRadius: "14px", background: innerSurface, border: `1px solid ${borderColor}`, padding: "14px 16px", color: "#c2d1e6", fontSize: "13px", fontWeight: 700 }}>
                {getRetryBlockedReason(selectedOrder)}
              </div>
            ) : null}
          </div>
        ) : null}
      </ActionDialog>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: "32px", gap: "16px", flexDirection: isMobile ? "column" : "row" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: textPrimary }}>Daftar Pesanan</h1>
          <p style={{ color: textMuted }}>Kelola semua transaksi dan proses pengecekan.</p>
        </div>
        
        <div style={{ display: "flex", gap: "12px", width: isMobile ? "100%" : "auto", flexDirection: isMobile ? "column" : "row" }}>
          <select 
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontWeight: 600, width: isMobile ? "100%" : "auto" }}
          >
            <option value="">Semua Pembayaran</option>
            <option value="PAID">Lunas</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Gagal</option>
          </select>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontWeight: 600, width: isMobile ? "100%" : "auto" }}
          >
            <option value="">Semua Status Cek</option>
            <option value="WAITING_PAYMENT">Menunggu Bayar</option>
            <option value="PAID">Siap Proses</option>
            <option value="PROCESSING">Diproses</option>
            <option value="FAILED">Gagal</option>
            <option value="COMPLETED">Selesai</option>
          </select>
        </div>
      </div>

      {notice ? (
        <div style={{ marginBottom: "20px", padding: "14px 16px", borderRadius: "14px", background: "rgba(105, 235, 192, 0.09)", color: "#9deed3", border: "1px solid rgba(105, 235, 192, 0.16)", fontWeight: 800 }}>
          {notice}
        </div>
      ) : null}

      <div style={{ background: surface, borderRadius: "20px", border: `1px solid ${borderColor}`, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: textMuted }}>Memuat pesanan...</div>
        ) : isMobile ? (
          <div style={{ display: "grid", gap: "12px", padding: "14px" }}>
            {orders.map((order) => {
              const paymentTone =
                order.paymentStatus === "PAID"
                  ? { background: "#dcfce7", color: "#166534" }
                  : { background: "#fee2e2", color: "#991b1b" };

              const checkTone =
                order.checkStatus === "COMPLETED"
                  ? { background: "#dcfce7", color: "#166534" }
                  : order.checkStatus === "PROCESSING"
                    ? { background: "#dbeafe", color: "#1e40af" }
                    : order.checkStatus === "FAILED"
                      ? { background: "#fee2e2", color: "#991b1b" }
                      : { background: "#e2e8f0", color: "#475569" };

              return (
                <article
                  key={order.id}
                  style={{
                    borderRadius: "16px",
                    border: `1px solid ${borderColor}`,
                    background: innerSurface,
                    padding: "14px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: textPrimary, fontSize: "14px" }}>{order.payments[0]?.providerRef || "N/A"}</div>
                      <div style={{ fontSize: "11px", color: textMuted, marginTop: "4px" }}>{order.id}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        border: `1px solid ${borderColor}`,
                        background: "#162136",
                        color: textPrimary,
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Detail
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <div>
                      <div style={{ color: "#6f86a8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Customer</div>
                      <div style={{ color: textPrimary, fontWeight: 700 }}>{order.user.fullName}</div>
                      <div style={{ color: textMuted, fontSize: "13px", marginTop: "2px", wordBreak: "break-word" }}>{order.user.email}</div>
                    </div>

                    <div>
                      <div style={{ color: "#6f86a8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>File & Paket</div>
                      <div style={{ color: "#dbe7f4", fontSize: "13px", lineHeight: 1.5, wordBreak: "break-word" }}>{order.originalName}</div>
                      <div style={{ fontSize: "12px", color: "#8fc1ff", fontWeight: 700, marginTop: "4px" }}>{order.package.name}</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <div style={{ color: "#6f86a8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Waktu</div>
                        <div style={{ color: "#c8d7ea", fontWeight: 600, fontSize: "13px", lineHeight: 1.4 }}>
                          {formatWibDateTime(order.createdAt)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#6f86a8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Nominal</div>
                        <div style={{ color: textPrimary, fontWeight: 800 }}>{formatRupiah(order.package.price)}</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <div style={{ color: "#6f86a8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Pembayaran</div>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            minHeight: "28px",
                            padding: "0 10px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 800,
                            background: paymentTone.background,
                            color: paymentTone.color
                          }}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                      <div>
                        <div style={{ color: "#6f86a8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Proses Cek</div>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            minHeight: "28px",
                            padding: "0 10px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 800,
                            background: checkTone.background,
                            color: checkTone.color
                          }}
                        >
                          {order.checkStatus}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void retryOrder(order)}
                      disabled={retryingOrderId === order.id || !canRetryOrder(order)}
                      title={canRetryOrder(order) ? "Kirim ulang dokumen ke proses checker" : getRetryBlockedReason(order)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "none",
                        background: canRetryOrder(order) ? "#69ebc0" : "#44536c",
                        color: canRetryOrder(order) ? "#0b1d28" : "#dce7f5",
                        fontSize: "13px",
                        fontWeight: 800,
                        cursor: retryingOrderId === order.id || !canRetryOrder(order) ? "not-allowed" : "pointer",
                        opacity: retryingOrderId === order.id ? 0.7 : 1,
                        width: "100%"
                      }}
                    >
                      {retryingOrderId === order.id ? "Memproses..." : "Proses Ulang"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `1px solid ${borderColor}`, background: "#1c273c" }}>
                <th style={{ padding: "16px", color: textMuted, fontWeight: 600 }}>Invoice / Order ID</th>
                <th style={{ padding: "16px", color: textMuted, fontWeight: 600 }}>Customer</th>
                <th style={{ padding: "16px", color: textMuted, fontWeight: 600 }}>File & Paket</th>
                <th style={{ padding: "16px", color: textMuted, fontWeight: 600 }}>Waktu Pengecekan</th>
                <th style={{ padding: "16px", color: textMuted, fontWeight: 600 }}>Pembayaran</th>
                <th style={{ padding: "16px", color: textMuted, fontWeight: 600 }}>Proses Cek</th>
                <th style={{ padding: "16px", color: textMuted, fontWeight: 600 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: textPrimary }}>{order.payments[0]?.providerRef || "N/A"}</div>
                    <div style={{ fontSize: "11px", color: textMuted }}>{order.id}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: textPrimary }}>{order.user.fullName}</div>
                    <div style={{ fontSize: "12px", color: textMuted }}>{order.user.email}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#dbe7f4" }}>{order.originalName}</div>
                    <div style={{ fontSize: "12px", color: "#8fc1ff", fontWeight: 700 }}>{order.package.name}</div>
                  </td>
                  <td style={{ padding: "16px", color: "#c8d7ea", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {formatWibDateTime(order.createdAt)}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontWeight: 800, fontSize: "14px", marginBottom: "4px", color: textPrimary }}>{formatRupiah(order.package.price)}</div>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 800,
                      background: order.paymentStatus === "PAID" ? "#dcfce7" : "#fee2e2",
                      color: order.paymentStatus === "PAID" ? "#166534" : "#991b1b"
                    }}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 800,
                      background:
                        order.checkStatus === "COMPLETED"
                          ? "#dcfce7"
                          : order.checkStatus === "PROCESSING"
                            ? "#dbeafe"
                            : order.checkStatus === "FAILED"
                              ? "#fee2e2"
                              : "#f1f5f9",
                      color:
                        order.checkStatus === "COMPLETED"
                          ? "#166534"
                          : order.checkStatus === "PROCESSING"
                            ? "#1e40af"
                            : order.checkStatus === "FAILED"
                              ? "#991b1b"
                              : "#64748b"
                    }}>
                      {order.checkStatus}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${borderColor}`,
                        background: innerSurface,
                        color: textPrimary,
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                      onClick={() => setSelectedOrder(order)}
                      >
                        Detail
                      </button>
                      <button
                        type="button"
                        onClick={() => void retryOrder(order)}
                        disabled={retryingOrderId === order.id || !canRetryOrder(order)}
                        title={canRetryOrder(order) ? "Kirim ulang dokumen ke proses checker" : getRetryBlockedReason(order)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "none",
                          background: canRetryOrder(order) ? "#69ebc0" : "#44536c",
                          color: canRetryOrder(order) ? "#0b1d28" : "#dce7f5",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: retryingOrderId === order.id || !canRetryOrder(order) ? "not-allowed" : "pointer",
                          opacity: retryingOrderId === order.id ? 0.7 : 1
                        }}
                      >
                        {retryingOrderId === order.id ? "Memproses..." : "Proses Ulang"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && orders.length === 0 && (
          <div style={{ padding: "80px", textAlign: "center", color: textMuted }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
            <p>Tidak ada pesanan yang ditemukan.</p>
          </div>
        )}
      </div>
      {!loading && pagination.totalItems > 0 ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "13px", color: textMuted, fontWeight: 700 }}>
            Halaman {pagination.page} dari {Math.max(1, pagination.totalPages)}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => void fetchOrders(Math.max(1, pagination.page - 1))}
              style={{ padding: "10px 14px", borderRadius: "12px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontWeight: 800, cursor: pagination.page <= 1 ? "not-allowed" : "pointer", opacity: pagination.page <= 1 ? 0.5 : 1 }}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => void fetchOrders(Math.min(pagination.totalPages, pagination.page + 1))}
              style={{ padding: "10px 14px", borderRadius: "12px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontWeight: 800, cursor: pagination.page >= pagination.totalPages ? "not-allowed" : "pointer", opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}
            >
              Berikutnya
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
