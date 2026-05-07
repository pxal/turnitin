"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl, formatRupiah, withCredentials } from "../../../lib/api";
import { useIsMobile } from "../../../lib/hooks/useIsMobile";
import {
  AdminAlert,
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminTableShell,
  StatTile,
  StatusBadge,
  adminTableStyles,
  adminTokens
} from "../../../components/admin/ui";

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

const AFFILIATE_PALETTE: Array<[string, string]> = [
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
  return AFFILIATE_PALETTE[hash % AFFILIATE_PALETTE.length];
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

function formatAccountSummary(item: AffiliateItem) {
  if (!item.bankName && !item.bankAccountName && !item.bankAccountNumber) {
    return "—";
  }
  return [item.bankName, item.bankAccountName, item.bankAccountNumber].filter(Boolean).join(" • ");
}

function formatWithdrawalSummary(item: AffiliateItem) {
  const latest = item.withdrawals[0];
  if (!latest) {
    return "—";
  }
  return `${formatRupiah(latest.amount)} • ${latest.bankName || "-"} • ${latest.status}`;
}

function formatLatestOrder(item: AffiliateItem) {
  const latest = item.recentOrders[0];
  if (!latest) {
    return "—";
  }
  return `${latest.user.fullName} • ${formatRupiah(latest.finalAmount)}`;
}

const AffiliateIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 19a5 5 0 0 1 10 0H4Zm11 0a4 4 0 0 1 5-3.87V19h-5Z"
      fill="currentColor"
    />
  </svg>
);

export default function AdminAffiliatesPage() {
  const isMobile = useIsMobile();
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
      setSummary(
        payload.summary || {
          totalAffiliates: 0,
          totalVoucherUsages: 0,
          totalAffiliateCommission: 0
        }
      );
      setPagination(
        payload.pagination || {
          page: nextPage,
          limit: 10,
          totalItems: 0,
          totalPages: 1
        }
      );
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

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <AdminPageHeader
        eyebrow="Modul Pertumbuhan"
        title="Kelola Affiliate"
        subtitle="Pantau performa mitra affiliate, total komisi, dan riwayat penarikan dana."
        icon={AffiliateIcon}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: "12px"
          }}
        >
          <StatTile
            label="Total Affiliate"
            value={summary.totalAffiliates.toLocaleString("id-ID")}
            hint="Mitra terdaftar"
            tone="brand"
          />
          <StatTile
            label="Pemakaian Voucher"
            value={summary.totalVoucherUsages.toLocaleString("id-ID")}
            hint="Akumulasi dari semua mitra"
            tone="violet"
          />
          <StatTile
            label="Total Komisi"
            value={formatRupiah(summary.totalAffiliateCommission)}
            hint="Komisi terhitung dari order PAID"
            tone="warning"
          />
        </div>
      </AdminPageHeader>

      {message ? <AdminAlert tone="danger">{message}</AdminAlert> : null}

      {loading ? (
        <AdminCard padding="40px">
          <div style={{ textAlign: "center", color: adminTokens.textMuted, fontWeight: 600 }}>Memuat data affiliate…</div>
        </AdminCard>
      ) : affiliates.length === 0 ? (
        <AdminCard padding="0">
          <AdminEmptyState
            title="Belum ada affiliate"
            description="Mitra affiliate akan tampil di sini setelah mereka mendaftar dan kode voucher dipakai user."
          />
        </AdminCard>
      ) : isMobile ? (
        <div style={{ display: "grid", gap: "12px" }}>
          {affiliates.map((affiliate) => {
            const palette = pickPalette(affiliate.username);
            return (
              <AdminCard key={affiliate.id} padding="16px">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    marginBottom: "12px"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", minWidth: 0 }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: palette[0],
                        color: palette[1],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "13px",
                        flexShrink: 0
                      }}
                    >
                      {getInitials(affiliate.username)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: adminTokens.textPrimary, fontSize: "14px" }}>
                        {affiliate.username}
                      </div>
                      <div style={{ fontSize: "12px", color: adminTokens.textMuted }}>{affiliate.email}</div>
                    </div>
                  </div>
                  <StatusBadge tone={affiliate.isActive ? "success" : "neutral"} size="sm">
                    {affiliate.isActive ? "Aktif" : "Nonaktif"}
                  </StatusBadge>
                </div>

                <div
                  style={{
                    background: adminTokens.surfaceMuted,
                    border: `1px solid ${adminTokens.border}`,
                    borderRadius: "12px",
                    padding: "10px 12px",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px"
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "10.5px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: adminTokens.textMuted,
                        fontWeight: 700
                      }}
                    >
                      Kode Voucher
                    </div>
                    <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "14px", color: adminTokens.brand }}>
                      {affiliate.voucherCode}
                    </div>
                  </div>
                  <StatusBadge tone="brand" size="sm">
                    {affiliate.voucherDiscountPercent}%
                  </StatusBadge>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: adminTokens.textSubtle,
                        fontWeight: 700
                      }}
                    >
                      Dipakai
                    </div>
                    <div style={{ fontWeight: 700, color: adminTokens.textPrimary, fontSize: "14px", marginTop: "2px" }}>
                      {affiliate.stats.totalVoucherUsages}×
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: adminTokens.textSubtle,
                        fontWeight: 700
                      }}
                    >
                      Total Komisi
                    </div>
                    <div style={{ fontWeight: 700, color: adminTokens.success, fontSize: "14px", marginTop: "2px" }}>
                      {formatRupiah(affiliate.stats.totalCommission)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: adminTokens.textSubtle,
                        fontWeight: 700
                      }}
                    >
                      Revenue
                    </div>
                    <div style={{ fontWeight: 700, color: adminTokens.warning, fontSize: "14px", marginTop: "2px" }}>
                      {formatRupiah(affiliate.stats.totalRevenue)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: adminTokens.textSubtle,
                        fontWeight: 700
                      }}
                    >
                      Komisi/Order
                    </div>
                    <div style={{ fontWeight: 600, color: adminTokens.textSecondary, fontSize: "13px", marginTop: "2px" }}>
                      {formatRupiah(affiliate.commissionAmount)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "8px", fontSize: "12px", color: adminTokens.textMuted }}>
                  <div>
                    <span style={{ fontWeight: 700, color: adminTokens.textSecondary }}>Rekening: </span>
                    {formatAccountSummary(affiliate)}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, color: adminTokens.textSecondary }}>Order Terbaru: </span>
                    {formatLatestOrder(affiliate)}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, color: adminTokens.textSecondary }}>Withdraw Terbaru: </span>
                    {formatWithdrawalSummary(affiliate)}
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      ) : (
        <AdminTableShell minWidth={1280}>
          <thead>
            <tr>
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
                <th key={label} style={adminTableStyles.th}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {affiliates.map((affiliate) => {
              const palette = pickPalette(affiliate.username);
              return (
                <tr key={affiliate.id} style={{ background: adminTokens.surface }}>
                  <td style={{ ...adminTableStyles.td, minWidth: "220px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
                        {getInitials(affiliate.username)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: adminTokens.textPrimary, fontSize: "13.5px" }}>
                          {affiliate.username}
                        </div>
                        <div style={{ color: adminTokens.textMuted, fontSize: "12px" }}>{affiliate.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...adminTableStyles.td, whiteSpace: "nowrap" }}>
                    <StatusBadge tone={affiliate.isActive ? "success" : "neutral"} size="sm">
                      {affiliate.isActive ? "Aktif" : "Nonaktif"}
                    </StatusBadge>
                  </td>
                  <td style={{ ...adminTableStyles.td, minWidth: "180px" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        fontSize: "13px",
                        color: adminTokens.brand,
                        background: adminTokens.brandSoft,
                        border: "1px dashed #93c5fd",
                        borderRadius: "8px",
                        padding: "2px 10px",
                        display: "inline-block"
                      }}
                    >
                      {affiliate.voucherCode}
                    </span>
                  </td>
                  <td style={{ ...adminTableStyles.td, whiteSpace: "nowrap", fontWeight: 700, color: adminTokens.textPrimary }}>
                    {affiliate.stats.totalVoucherUsages}
                  </td>
                  <td style={{ ...adminTableStyles.td, whiteSpace: "nowrap", fontWeight: 700, color: adminTokens.brand }}>
                    {affiliate.voucherDiscountPercent}%
                  </td>
                  <td style={{ ...adminTableStyles.td, whiteSpace: "nowrap", fontWeight: 600, color: adminTokens.textSecondary }}>
                    {formatRupiah(affiliate.commissionAmount)}
                  </td>
                  <td style={{ ...adminTableStyles.td, whiteSpace: "nowrap", fontWeight: 700, color: adminTokens.success }}>
                    {formatRupiah(affiliate.stats.totalCommission)}
                  </td>
                  <td style={{ ...adminTableStyles.td, whiteSpace: "nowrap", fontWeight: 700, color: adminTokens.warning }}>
                    {formatRupiah(affiliate.stats.totalRevenue)}
                  </td>
                  <td style={{ ...adminTableStyles.td, minWidth: "200px", lineHeight: 1.6 }}>
                    {formatAccountSummary(affiliate)}
                  </td>
                  <td style={{ ...adminTableStyles.td, minWidth: "200px", lineHeight: 1.6 }}>
                    {formatLatestOrder(affiliate)}
                  </td>
                  <td style={{ ...adminTableStyles.td, minWidth: "200px", lineHeight: 1.6 }}>
                    {formatWithdrawalSummary(affiliate)}
                  </td>
                  <td style={{ ...adminTableStyles.td, whiteSpace: "nowrap", color: adminTokens.textMuted }}>
                    {new Date(affiliate.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTableShell>
      )}

      {affiliates.length > 0 ? (
        <AdminPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          onPrevious={() => void loadAffiliates(Math.max(1, pagination.page - 1))}
          onNext={() => void loadAffiliates(Math.min(pagination.totalPages, pagination.page + 1))}
          itemLabel="affiliate"
        />
      ) : null}
    </div>
  );
}
