"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl, formatRupiah, withCredentials } from "../../../lib/api";
import { useIsMobile } from "../../../lib/hooks/useIsMobile";

type AffiliateItem = {
  id: string;
  email: string;
  username: string;
  voucherCode: string;
  voucherDiscountPercent: number;
  commissionAmount: number;
  isActive: boolean;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  createdAt: string;
  stats: {
    totalVoucherUsages: number;
    totalCommission: number;
    totalRevenue: number;
  };
  recentOrders: Array<{
    id: string;
    finalAmount: number;
    affiliateCommissionAmount: number;
    discountCode: string | null;
    createdAt: string;
    user: {
      fullName: string;
      email: string;
    };
  }>;
  withdrawals: Array<{
    id: string;
    amount: number;
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    status: string;
    createdAt: string;
  }>;
};

type AffiliatesPayload = {
  success: boolean;
  summary: {
    totalAffiliates: number;
    totalVoucherUsages: number;
    totalAffiliateCommission: number;
  };
  data: AffiliateItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  message?: string;
};

function formatAccountSummary(item: AffiliateItem) {
  if (!item.bankName && !item.bankAccountName && !item.bankAccountNumber) {
    return "-";
  }

  return [item.bankName, item.bankAccountName, item.bankAccountNumber].filter(Boolean).join(" • ");
}

function formatWithdrawalSummary(item: AffiliateItem) {
  const latest = item.withdrawals[0];
  if (!latest) {
    return "-";
  }

  return [
    formatRupiah(latest.amount),
    latest.bankName || "-",
    latest.bankAccountNumber || "-",
    latest.status
  ].join(" • ");
}

function formatOrderSummary(item: AffiliateItem) {
  const latest = item.recentOrders[0];
  if (!latest) {
    return "-";
  }

  return `${latest.user.fullName} • ${formatRupiah(latest.finalAmount)}`;
}

export default function AdminAffiliatesPage() {
  const isMobile = useIsMobile();
  const surface = "#182235";
  const innerSurface = "#111a2d";
  const borderColor = "rgba(143, 163, 194, 0.14)";
  const textPrimary = "#f8fbff";
  const textMuted = "#8ea3c2";
  const [affiliates, setAffiliates] = useState<AffiliateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({
    totalAffiliates: 0,
    totalVoucherUsages: 0,
    totalAffiliateCommission: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1
  });

  async function loadAffiliates(nextPage = page) {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(nextPage),
        limit: "10"
      });
      const response = await fetch(`${apiBaseUrl}/api/admin/affiliates?${query.toString()}`, withCredentials());
      const payload = (await response.json()) as AffiliatesPayload;

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Gagal memuat data affiliate.");
      }

      setAffiliates(payload.data || []);
      setSummary(payload.summary || {
        totalAffiliates: 0,
        totalVoucherUsages: 0,
        totalAffiliateCommission: 0
      });
      setPagination(payload.pagination || {
        page: nextPage,
        limit: 10,
        totalItems: 0,
        totalPages: 1
      });
      setPage(payload.pagination?.page || nextPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat data affiliate.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAffiliates(1);
  }, []);

  if (loading) {
    return <div>Memuat data affiliate...</div>;
  }

  const totalAffiliates = summary.totalAffiliates;
  const totalVoucherUsages = summary.totalVoucherUsages;
  const totalAffiliateCommission = summary.totalAffiliateCommission;

  return (
    <div>
      <div
        style={{
          background: surface,
          borderRadius: "24px",
          border: `1px solid ${borderColor}`,
          padding: isMobile ? "24px" : "32px",
          marginBottom: "24px"
        }}
      >
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: textPrimary, marginBottom: "8px" }}>Kelola Affiliate</h1>
        <p style={{ color: textMuted, lineHeight: 1.7, marginBottom: "20px" }}>
          Tabel ini menampilkan affiliate yang sudah terdaftar beserta jumlah penggunaan kode voucher mereka, sehingga tetap rapi saat datanya semakin banyak.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <div style={{ background: innerSurface, border: `1px solid ${borderColor}`, borderRadius: "18px", padding: "18px 20px" }}>
            <div style={{ fontSize: "13px", color: textMuted, marginBottom: "6px" }}>Total Affiliate</div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#69a8ff" }}>{totalAffiliates}</div>
          </div>
          <div style={{ background: innerSurface, border: `1px solid ${borderColor}`, borderRadius: "18px", padding: "18px 20px" }}>
            <div style={{ fontSize: "13px", color: textMuted, marginBottom: "6px" }}>Total Pemakaian Voucher</div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#69ebc0" }}>{totalVoucherUsages}</div>
          </div>
          <div style={{ background: innerSurface, border: `1px solid ${borderColor}`, borderRadius: "18px", padding: "18px 20px" }}>
            <div style={{ fontSize: "13px", color: textMuted, marginBottom: "6px" }}>Total Komisi Affiliate</div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#ffd66b" }}>{formatRupiah(totalAffiliateCommission)}</div>
          </div>
        </div>
      </div>

      {message ? (
        <div style={{ marginBottom: "18px", padding: "14px 16px", borderRadius: "16px", background: "rgba(255, 110, 106, 0.1)", border: "1px solid rgba(255, 110, 106, 0.14)", color: "#ff9b9b", fontWeight: 700 }}>
          {message}
        </div>
      ) : null}

      <div
        style={{
          background: surface,
          borderRadius: "24px",
          border: `1px solid ${borderColor}`,
          overflow: "hidden"
        }}
      >
        {affiliates.length === 0 ? (
          <div style={{ padding: "28px", color: textMuted }}>Belum ada affiliate yang terdaftar.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "1280px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1c273c", borderBottom: `1px solid ${borderColor}` }}>
                  {[
                    "Affiliate",
                    "Status",
                    "Kode Voucher",
                    "Dipakai",
                    "Diskon",
                    "Komisi / Order",
                    "Total Komisi",
                    "Revenue",
                    "Rekening",
                    "Order Terbaru",
                    "Withdraw Terbaru",
                    "Terdaftar"
                  ].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: "16px 18px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: 800,
                        color: textMuted,
                        letterSpacing: "0.7px",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.map((affiliate, index) => (
                  <tr
                    key={affiliate.id}
                    style={{
                      borderBottom: index === affiliates.length - 1 ? "none" : `1px solid ${borderColor}`,
                      verticalAlign: "top"
                    }}
                  >
                    <td style={{ padding: "18px", minWidth: "220px" }}>
                      <div style={{ fontWeight: 900, color: textPrimary, fontSize: "16px", marginBottom: "6px" }}>{affiliate.username}</div>
                      <div style={{ color: textMuted, fontSize: "14px", lineHeight: 1.6 }}>{affiliate.email}</div>
                    </td>
                    <td style={{ padding: "18px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 800,
                          background: affiliate.isActive ? "rgba(105, 235, 192, 0.14)" : "rgba(143, 163, 194, 0.12)",
                          color: affiliate.isActive ? "#69ebc0" : textMuted
                        }}
                      >
                        {affiliate.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td style={{ padding: "18px", minWidth: "190px" }}>
                      <div style={{ fontWeight: 900, color: "#8fc1ff", fontSize: "16px", lineHeight: 1.5, wordBreak: "break-word" }}>
                        {affiliate.voucherCode}
                      </div>
                    </td>
                    <td style={{ padding: "18px", whiteSpace: "nowrap", fontWeight: 900, color: textPrimary }}>
                      {affiliate.stats.totalVoucherUsages}
                    </td>
                    <td style={{ padding: "18px", whiteSpace: "nowrap", fontWeight: 900, color: "#69a8ff" }}>
                      {affiliate.voucherDiscountPercent}%
                    </td>
                    <td style={{ padding: "18px", whiteSpace: "nowrap", fontWeight: 800, color: "#8fc1ff" }}>
                      {formatRupiah(affiliate.commissionAmount)}
                    </td>
                    <td style={{ padding: "18px", whiteSpace: "nowrap", fontWeight: 900, color: "#69ebc0" }}>
                      {formatRupiah(affiliate.stats.totalCommission)}
                    </td>
                    <td style={{ padding: "18px", whiteSpace: "nowrap", fontWeight: 900, color: "#ffd66b" }}>
                      {formatRupiah(affiliate.stats.totalRevenue)}
                    </td>
                    <td style={{ padding: "18px", minWidth: "220px" }}>
                      <div style={{ color: "#c8d7ea", fontSize: "13px", lineHeight: 1.7 }}>
                        {formatAccountSummary(affiliate)}
                      </div>
                    </td>
                    <td style={{ padding: "18px", minWidth: "210px" }}>
                      <div style={{ color: "#c8d7ea", fontSize: "13px", lineHeight: 1.7 }}>
                        {formatOrderSummary(affiliate)}
                      </div>
                    </td>
                    <td style={{ padding: "18px", minWidth: "180px" }}>
                      <div style={{ color: "#c8d7ea", fontSize: "13px", lineHeight: 1.7 }}>
                        {formatWithdrawalSummary(affiliate)}
                      </div>
                    </td>
                    <td style={{ padding: "18px", whiteSpace: "nowrap", color: textMuted, fontSize: "13px" }}>
                      {new Date(affiliate.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {affiliates.length > 0 ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "13px", color: textMuted, fontWeight: 700 }}>
            Halaman {pagination.page} dari {Math.max(1, pagination.totalPages)}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => void loadAffiliates(Math.max(1, pagination.page - 1))}
              style={{ padding: "10px 14px", borderRadius: "12px", border: `1px solid ${borderColor}`, background: innerSurface, color: textPrimary, fontWeight: 800, cursor: pagination.page <= 1 ? "not-allowed" : "pointer", opacity: pagination.page <= 1 ? 0.5 : 1 }}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => void loadAffiliates(Math.min(pagination.totalPages, pagination.page + 1))}
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
