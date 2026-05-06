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
  const surface = "#ffffff";
  const innerSurface = "#f8fafc";
  const borderColor = "#e2e8f0";
  const textPrimary = "#0f172a";
  const textMuted = "#64748b";
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
    return <div style={{ color: textMuted, fontWeight: 600 }}>Memuat data affiliate...</div>;
  }

  const totalAffiliates = summary.totalAffiliates;
  const totalVoucherUsages = summary.totalVoucherUsages;
  const totalAffiliateCommission = summary.totalAffiliateCommission;

  return (
    <div>
      <div
        style={{
          background: surface,
          borderRadius: "16px",
          border: `1px solid ${borderColor}`,
          padding: isMobile ? "20px" : "24px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: textPrimary, marginBottom: "6px" }}>Kelola Affiliate</h1>
        <p style={{ color: textMuted, lineHeight: 1.7, marginBottom: "18px", fontSize: "14px" }}>
          Tabel ini menampilkan affiliate yang sudah terdaftar beserta jumlah penggunaan kode voucher mereka.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
          <div style={{ background: innerSurface, border: `1px solid ${borderColor}`, borderRadius: "12px", padding: "16px 18px" }}>
            <div style={{ fontSize: "12px", color: textMuted, marginBottom: "4px", fontWeight: 600 }}>Total Affiliate</div>
            <div style={{ fontSize: "26px", fontWeight: 800, color: "#2563eb" }}>{totalAffiliates}</div>
          </div>
          <div style={{ background: innerSurface, border: `1px solid ${borderColor}`, borderRadius: "12px", padding: "16px 18px" }}>
            <div style={{ fontSize: "12px", color: textMuted, marginBottom: "4px", fontWeight: 600 }}>Total Pemakaian Voucher</div>
            <div style={{ fontSize: "26px", fontWeight: 800, color: "#059669" }}>{totalVoucherUsages}</div>
          </div>
          <div style={{ background: innerSurface, border: `1px solid ${borderColor}`, borderRadius: "12px", padding: "16px 18px" }}>
            <div style={{ fontSize: "12px", color: textMuted, marginBottom: "4px", fontWeight: 600 }}>Total Komisi Affiliate</div>
            <div style={{ fontSize: "26px", fontWeight: 800, color: "#d97706" }}>{formatRupiah(totalAffiliateCommission)}</div>
          </div>
        </div>
      </div>

      {message ? (
        <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "12px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 600, fontSize: "14px" }}>
          {message}
        </div>
      ) : null}

      <div
        style={{
          background: surface,
          borderRadius: "16px",
          border: `1px solid ${borderColor}`,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
        }}
      >
        {affiliates.length === 0 ? (
          <div style={{ padding: "28px", color: textMuted, fontWeight: 600 }}>Belum ada affiliate yang terdaftar.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "1280px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: innerSurface, borderBottom: `1px solid ${borderColor}` }}>
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
                        padding: "14px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#94a3b8",
                        letterSpacing: "0.05em",
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
                      borderBottom: index === affiliates.length - 1 ? "none" : `1px solid #f1f5f9`,
                      verticalAlign: "top"
                    }}
                  >
                    <td style={{ padding: "14px 16px", minWidth: "200px" }}>
                      <div style={{ fontWeight: 700, color: textPrimary, fontSize: "14px", marginBottom: "2px" }}>{affiliate.username}</div>
                      <div style={{ color: textMuted, fontSize: "13px", lineHeight: 1.5 }}>{affiliate.email}</div>
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: affiliate.isActive ? "#dcfce7" : "#f1f5f9",
                          color: affiliate.isActive ? "#166534" : textMuted
                        }}
                      >
                        {affiliate.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", minWidth: "180px" }}>
                      <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "14px", lineHeight: 1.5, wordBreak: "break-word" }}>
                        {affiliate.voucherCode}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap", fontWeight: 700, color: textPrimary }}>
                      {affiliate.stats.totalVoucherUsages}
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap", fontWeight: 700, color: "#2563eb" }}>
                      {affiliate.voucherDiscountPercent}%
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap", fontWeight: 600, color: "#475569" }}>
                      {formatRupiah(affiliate.commissionAmount)}
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap", fontWeight: 700, color: "#059669" }}>
                      {formatRupiah(affiliate.stats.totalCommission)}
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap", fontWeight: 700, color: "#d97706" }}>
                      {formatRupiah(affiliate.stats.totalRevenue)}
                    </td>
                    <td style={{ padding: "14px 16px", minWidth: "200px" }}>
                      <div style={{ color: "#475569", fontSize: "13px", lineHeight: 1.7 }}>
                        {formatAccountSummary(affiliate)}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", minWidth: "200px" }}>
                      <div style={{ color: "#475569", fontSize: "13px", lineHeight: 1.7 }}>
                        {formatOrderSummary(affiliate)}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", minWidth: "180px" }}>
                      <div style={{ color: "#475569", fontSize: "13px", lineHeight: 1.7 }}>
                        {formatWithdrawalSummary(affiliate)}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap", color: textMuted, fontSize: "13px" }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "13px", color: textMuted, fontWeight: 600 }}>
            Halaman {pagination.page} dari {Math.max(1, pagination.totalPages)}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => void loadAffiliates(Math.max(1, pagination.page - 1))}
              style={{ padding: "8px 14px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: "#ffffff", color: textPrimary, fontWeight: 600, fontSize: "13px", cursor: pagination.page <= 1 ? "not-allowed" : "pointer", opacity: pagination.page <= 1 ? 0.5 : 1 }}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => void loadAffiliates(Math.min(pagination.totalPages, pagination.page + 1))}
              style={{ padding: "8px 14px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: "#ffffff", color: textPrimary, fontWeight: 600, fontSize: "13px", cursor: pagination.page >= pagination.totalPages ? "not-allowed" : "pointer", opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}
            >
              Berikutnya
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
