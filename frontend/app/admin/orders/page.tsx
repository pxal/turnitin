"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl, clearAdminSession, formatRupiah, withCredentials } from "../../../lib/api";
import { useRouter } from "next/navigation";
import { useIsMobile } from "../../../lib/hooks/useIsMobile";
import ActionDialog from "../../../components/ui/action-dialog";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminSelect,
  AdminTableShell,
  StatTile,
  StatusBadge,
  adminTableStyles,
  adminTokens,
  type AdminTone
} from "../../../components/admin/ui";

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

const PAYMENT_TONE: Record<string, AdminTone> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "danger"
};

const CHECK_TONE: Record<string, AdminTone> = {
  COMPLETED: "success",
  PROCESSING: "brand",
  FAILED: "danger",
  PAID: "violet",
  WAITING_PAYMENT: "neutral"
};

function paymentTone(status: string): AdminTone {
  return PAYMENT_TONE[status] ?? "neutral";
}

function checkTone(status: string): AdminTone {
  return CHECK_TONE[status] ?? "neutral";
}

const AVATAR_PALETTE: Array<[string, string]> = [
  ["#dbeafe", "#1d4ed8"],
  ["#fef3c7", "#b45309"],
  ["#dcfce7", "#15803d"],
  ["#fae8ff", "#a21caf"],
  ["#fee2e2", "#b91c1c"],
  ["#e0e7ff", "#4338ca"]
];

function pickPalette(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const OrdersIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M7 4h10l2 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8l2-4Zm0 4v10h10V8H7Zm2-2-.5 1h7L15 6H9Zm1 5h4v2h-4v-2Z"
      fill="currentColor"
    />
  </svg>
);

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
        headers: { "Content-Type": "application/json" },
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

  const stats = useMemo(() => {
    const paid = orders.filter((order) => order.paymentStatus === "PAID").length;
    const completed = orders.filter((order) => order.checkStatus === "COMPLETED").length;
    const processing = orders.filter((order) => order.checkStatus === "PROCESSING").length;
    const failed = orders.filter((order) => order.checkStatus === "FAILED").length;
    return { paid, completed, processing, failed };
  }, [orders]);

  const noticeTone: AdminTone = notice
    ? notice.toLowerCase().includes("berhasil")
      ? "success"
      : "danger"
    : "neutral";

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <ActionDialog
        open={Boolean(selectedOrder)}
        title={selectedOrder ? `Detail Order ${selectedOrder.publicId}` : "Detail Order"}
        description={selectedOrder ? "Ringkasan order, pembayaran, dan hasil pengecekan untuk kebutuhan operasional admin." : ""}
        cancelLabel="Tutup"
        onClose={() => setSelectedOrder(null)}
      >
        {selectedOrder ? (
          <div style={{ display: "grid", gap: isMobile ? "14px" : "18px", minWidth: 0 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "10px"
              }}
            >
              {[
                ["Invoice", selectedOrder.payments[0]?.providerRef || "-"],
                ["Public ID", selectedOrder.publicId],
                ["Customer", selectedOrder.user.fullName],
                ["Email", selectedOrder.user.email],
                ["Dokumen", selectedOrder.originalName],
                ["Paket", selectedOrder.package.name]
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: adminTokens.surfaceMuted,
                    border: `1px solid ${adminTokens.border}`,
                    borderRadius: "12px",
                    padding: "12px 14px",
                    minWidth: 0
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: adminTokens.textSubtle,
                      textTransform: "uppercase",
                      marginBottom: "4px"
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      lineHeight: 1.55,
                      color: adminTokens.textPrimary,
                      fontWeight: 600,
                      overflowWrap: "anywhere"
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: "10px"
              }}
            >
              <div
                style={{
                  background: adminTokens.surfaceMuted,
                  border: `1px solid ${adminTokens.border}`,
                  borderRadius: "12px",
                  padding: "14px",
                  minWidth: 0
                }}
              >
                <div style={{ fontSize: "11px", color: adminTokens.textMuted, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Pembayaran
                </div>
                <StatusBadge tone={paymentTone(selectedOrder.paymentStatus)}>{selectedOrder.paymentStatus}</StatusBadge>
              </div>
              <div
                style={{
                  background: adminTokens.surfaceMuted,
                  border: `1px solid ${adminTokens.border}`,
                  borderRadius: "12px",
                  padding: "14px",
                  minWidth: 0
                }}
              >
                <div style={{ fontSize: "11px", color: adminTokens.textMuted, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Status Cek
                </div>
                <StatusBadge tone={checkTone(selectedOrder.checkStatus)}>{selectedOrder.checkStatus}</StatusBadge>
              </div>
              <div
                style={{
                  background: adminTokens.surfaceMuted,
                  border: `1px solid ${adminTokens.border}`,
                  borderRadius: "12px",
                  padding: "14px",
                  minWidth: 0
                }}
              >
                <div style={{ fontSize: "11px", color: adminTokens.textMuted, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Nominal Final
                </div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: adminTokens.brand, overflowWrap: "anywhere" }}>
                  {formatRupiah(selectedOrder.finalAmount || selectedOrder.package.price)}
                </div>
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${adminTokens.border}`,
                background: adminTokens.surfaceMuted,
                borderRadius: "12px",
                padding: "14px",
                minWidth: 0
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700, color: adminTokens.textMuted, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Catatan Hasil
              </div>
              <div style={{ color: adminTokens.textSecondary, lineHeight: 1.7, fontSize: "13.5px" }}>
                {selectedOrder.resultSummary || "Belum ada ringkasan hasil. Order mungkin masih menunggu pembayaran atau proses pengecekan."}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                flexDirection: isMobile ? "column" : "row"
              }}
            >
              <AdminButton
                variant="secondary"
                fullWidth={isMobile}
                onClick={async () => {
                  await navigator.clipboard.writeText(selectedOrder.publicId);
                  setNotice(`Public ID ${selectedOrder.publicId} berhasil disalin.`);
                }}
              >
                Salin Public ID
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={() => void retryOrder(selectedOrder)}
                disabled={retryingOrderId === selectedOrder.id || !canRetryOrder(selectedOrder)}
                title={canRetryOrder(selectedOrder) ? "Kirim ulang dokumen ke proses checker" : getRetryBlockedReason(selectedOrder)}
                fullWidth={isMobile}
              >
                {retryingOrderId === selectedOrder.id ? "Mengirim Ulang…" : "Proses Ulang Dokumen"}
              </AdminButton>
              {selectedOrder.resultReportUrl ? (
                <a
                  href={selectedOrder.resultReportUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: isMobile ? "100%" : "auto",
                    textAlign: "center",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: adminTokens.success,
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "13px",
                    textDecoration: "none"
                  }}
                >
                  Buka Report
                </a>
              ) : null}
              {selectedOrder.payments[0]?.qrUrl ? (
                <a
                  href={selectedOrder.payments[0].qrUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: isMobile ? "100%" : "auto",
                    textAlign: "center",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: adminTokens.surface,
                    color: adminTokens.textPrimary,
                    fontWeight: 600,
                    fontSize: "13px",
                    textDecoration: "none",
                    border: `1px solid ${adminTokens.border}`
                  }}
                >
                  Lihat QR Payment
                </a>
              ) : null}
            </div>
            {!canRetryOrder(selectedOrder) ? (
              <AdminAlert tone="warning" title="Tidak bisa diproses ulang">
                {getRetryBlockedReason(selectedOrder)}
              </AdminAlert>
            ) : null}
          </div>
        ) : null}
      </ActionDialog>

      <AdminPageHeader
        eyebrow="Modul Pesanan"
        title="Daftar Pesanan"
        subtitle="Kelola transaksi user, status pembayaran, dan kirim ulang dokumen ke pipeline pengecekan."
        icon={OrdersIcon}
        actions={
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              flexDirection: isMobile ? "column" : "row",
              width: isMobile ? "100%" : "auto"
            }}
          >
            <AdminSelect
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              containerStyle={{ minWidth: isMobile ? "auto" : "180px" }}
            >
              <option value="">Semua Pembayaran</option>
              <option value="PAID">Lunas</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Gagal</option>
            </AdminSelect>
            <AdminSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              containerStyle={{ minWidth: isMobile ? "auto" : "180px" }}
            >
              <option value="">Semua Status Cek</option>
              <option value="WAITING_PAYMENT">Menunggu Bayar</option>
              <option value="PAID">Siap Proses</option>
              <option value="PROCESSING">Diproses</option>
              <option value="FAILED">Gagal</option>
              <option value="COMPLETED">Selesai</option>
            </AdminSelect>
          </div>
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
            gap: "12px"
          }}
        >
          <StatTile label="Total di Halaman Ini" value={orders.length.toString()} hint={`Total ${pagination.totalItems} pesanan`} tone="brand" />
          <StatTile label="Sudah Dibayar" value={stats.paid.toString()} hint="Status PAID di halaman ini" tone="success" />
          <StatTile label="Sedang Diproses" value={stats.processing.toString()} hint="Antrean pipeline saat ini" tone="violet" />
          <StatTile label="Gagal" value={stats.failed.toString()} hint="Perlu intervensi admin" tone="danger" />
        </div>
      </AdminPageHeader>

      {notice ? <AdminAlert tone={noticeTone}>{notice}</AdminAlert> : null}

      {loading ? (
        <AdminCard padding="40px">
          <div style={{ textAlign: "center", color: adminTokens.textMuted, fontWeight: 600 }}>Memuat pesanan…</div>
        </AdminCard>
      ) : orders.length === 0 ? (
        <AdminCard padding="0">
          <AdminEmptyState
            title="Tidak ada pesanan"
            description="Tidak ada pesanan yang sesuai dengan filter saat ini. Coba ubah filter pembayaran atau status."
          />
        </AdminCard>
      ) : isMobile ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {orders.map((order) => {
            const palette = pickPalette(order.user.fullName);
            return (
              <AdminCard key={order.id} padding="14px">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    marginBottom: "12px"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", minWidth: 0 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: palette[0],
                        color: palette[1],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "12px",
                        flexShrink: 0
                      }}
                    >
                      {getInitials(order.user.fullName)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: adminTokens.textPrimary, fontSize: "13.5px" }}>
                        {order.payments[0]?.providerRef || "N/A"}
                      </div>
                      <div style={{ fontSize: "11px", color: adminTokens.textMuted }}>{order.publicId}</div>
                    </div>
                  </div>
                  <AdminButton size="sm" variant="secondary" onClick={() => setSelectedOrder(order)}>
                    Detail
                  </AdminButton>
                </div>

                <div style={{ display: "grid", gap: "10px" }}>
                  <div>
                    <div
                      style={{
                        color: adminTokens.textSubtle,
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "2px",
                        fontWeight: 700
                      }}
                    >
                      Customer
                    </div>
                    <div style={{ color: adminTokens.textPrimary, fontWeight: 600, fontSize: "13.5px" }}>
                      {order.user.fullName}
                    </div>
                    <div style={{ color: adminTokens.textMuted, fontSize: "12px", marginTop: "2px", wordBreak: "break-word" }}>
                      {order.user.email}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        color: adminTokens.textSubtle,
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "2px",
                        fontWeight: 700
                      }}
                    >
                      Dokumen & Paket
                    </div>
                    <div style={{ color: adminTokens.textSecondary, fontSize: "13px", lineHeight: 1.5, wordBreak: "break-word" }}>
                      {order.originalName}
                    </div>
                    <div style={{ fontSize: "12px", color: adminTokens.brand, fontWeight: 700, marginTop: "2px" }}>
                      {order.package.name}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <div
                        style={{
                          color: adminTokens.textSubtle,
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "2px",
                          fontWeight: 700
                        }}
                      >
                        Waktu
                      </div>
                      <div style={{ color: adminTokens.textSecondary, fontWeight: 500, fontSize: "12px", lineHeight: 1.4 }}>
                        {formatWibDateTime(order.createdAt)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          color: adminTokens.textSubtle,
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "2px",
                          fontWeight: 700
                        }}
                      >
                        Nominal
                      </div>
                      <div style={{ color: adminTokens.textPrimary, fontWeight: 700 }}>{formatRupiah(order.package.price)}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <StatusBadge tone={paymentTone(order.paymentStatus)} size="sm">
                      {order.paymentStatus}
                    </StatusBadge>
                    <StatusBadge tone={checkTone(order.checkStatus)} size="sm">
                      {order.checkStatus}
                    </StatusBadge>
                  </div>

                  <AdminButton
                    variant={canRetryOrder(order) ? "primary" : "secondary"}
                    onClick={() => void retryOrder(order)}
                    disabled={retryingOrderId === order.id || !canRetryOrder(order)}
                    title={canRetryOrder(order) ? "Kirim ulang dokumen ke proses checker" : getRetryBlockedReason(order)}
                    fullWidth
                  >
                    {retryingOrderId === order.id ? "Memproses…" : "Proses Ulang"}
                  </AdminButton>
                </div>
              </AdminCard>
            );
          })}
        </div>
      ) : (
        <AdminTableShell minWidth={920}>
          <thead>
            <tr>
              <th style={adminTableStyles.th}>Invoice / Customer</th>
              <th style={adminTableStyles.th}>Dokumen & Paket</th>
              <th style={adminTableStyles.th}>Waktu</th>
              <th style={adminTableStyles.th}>Nominal</th>
              <th style={adminTableStyles.th}>Pembayaran</th>
              <th style={adminTableStyles.th}>Proses Cek</th>
              <th style={adminTableStyles.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const palette = pickPalette(order.user.fullName);
              return (
                <tr key={order.id} style={{ background: adminTokens.surface }}>
                  <td style={adminTableStyles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: palette[0],
                          color: palette[1],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "12px",
                          flexShrink: 0
                        }}
                      >
                        {getInitials(order.user.fullName)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "13.5px",
                            color: adminTokens.textPrimary
                          }}
                        >
                          {order.user.fullName}
                        </div>
                        <div style={{ fontSize: "12px", color: adminTokens.textMuted }}>{order.user.email}</div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: adminTokens.textSubtle,
                            fontFamily: "monospace",
                            marginTop: "2px"
                          }}
                        >
                          {order.payments[0]?.providerRef || "N/A"} • {order.publicId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={adminTableStyles.td}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: adminTokens.textSecondary, wordBreak: "break-word" }}>
                      {order.originalName}
                    </div>
                    <div style={{ fontSize: "12px", color: adminTokens.brand, fontWeight: 700, marginTop: "2px" }}>
                      {order.package.name}
                    </div>
                  </td>
                  <td style={{ ...adminTableStyles.td, color: adminTokens.textSecondary, fontWeight: 500, whiteSpace: "nowrap" }}>
                    {formatWibDateTime(order.createdAt)}
                  </td>
                  <td style={{ ...adminTableStyles.td, fontWeight: 700, color: adminTokens.textPrimary, whiteSpace: "nowrap" }}>
                    {formatRupiah(order.package.price)}
                  </td>
                  <td style={adminTableStyles.td}>
                    <StatusBadge tone={paymentTone(order.paymentStatus)}>{order.paymentStatus}</StatusBadge>
                  </td>
                  <td style={adminTableStyles.td}>
                    <StatusBadge tone={checkTone(order.checkStatus)}>{order.checkStatus}</StatusBadge>
                  </td>
                  <td style={adminTableStyles.td}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <AdminButton size="sm" variant="secondary" onClick={() => setSelectedOrder(order)}>
                        Detail
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        variant={canRetryOrder(order) ? "primary" : "secondary"}
                        onClick={() => void retryOrder(order)}
                        disabled={retryingOrderId === order.id || !canRetryOrder(order)}
                        title={canRetryOrder(order) ? "Kirim ulang dokumen ke proses checker" : getRetryBlockedReason(order)}
                      >
                        {retryingOrderId === order.id ? "Memproses…" : "Proses Ulang"}
                      </AdminButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTableShell>
      )}

      {!loading && pagination.totalItems > 0 ? (
        <AdminPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          onPrevious={() => void fetchOrders(Math.max(1, pagination.page - 1))}
          onNext={() => void fetchOrders(Math.min(pagination.totalPages, pagination.page + 1))}
          itemLabel="pesanan"
        />
      ) : null}
    </div>
  );
}
