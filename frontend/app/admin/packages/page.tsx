"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiBaseUrl, clearAdminSession, formatRupiah, withCredentials } from "../../../lib/api";
import { useIsMobile } from "../../../lib/hooks/useIsMobile";
import ActionDialog from "../../../components/ui/action-dialog";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminInput,
  AdminPageHeader,
  AdminPagination,
  AdminSectionHeader,
  StatTile,
  StatusBadge,
  adminTokens
} from "../../../components/admin/ui";

type PackageItem = {
  id: string;
  name: string;
  maxFileSizeMb: number;
  price: number;
  isActive: boolean;
};

type VoucherItem = {
  id: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
};

type PackagesPageData = {
  packages: PackageItem[];
  vouchers: VoucherItem[];
  packagesPagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  vouchersPagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

const emptyPackageForm = {
  name: "",
  maxFileSizeMb: 0,
  price: 0,
  isActive: true
};

const emptyVoucherForm = {
  code: "",
  discountPercent: 10,
  isActive: true
};

const PackagesIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 2.2 5.6 2.8L12 10.8 6.4 8 12 5.2Zm-6 4.4 5 2.5v6.5l-5-2.5V9.6Zm7 8.9v-6.5l5-2.5v6.5l-5 2.5Z" fill="currentColor" />
  </svg>
);

const VoucherIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Zm6 1v6h2V9H9Zm4 0v6h2V9h-2Z" fill="currentColor" />
  </svg>
);

export default function AdminPackagesPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [data, setData] = useState<PackagesPageData | null>(null);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [packageForm, setPackageForm] = useState(emptyPackageForm);
  const [voucherForm, setVoucherForm] = useState(emptyVoucherForm);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "packages" | "vouchers";
    id: string;
    label: string;
  } | null>(null);
  const [packagePage, setPackagePage] = useState(1);
  const [voucherPage, setVoucherPage] = useState(1);

  async function fetchData(nextPackagePage = packagePage, nextVoucherPage = voucherPage) {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        packagePage: String(nextPackagePage),
        packageLimit: "8",
        voucherPage: String(nextVoucherPage),
        voucherLimit: "8"
      });
      const res = await fetch(`${apiBaseUrl}/api/admin/dashboard?${query.toString()}`, withCredentials());
      const json = await res.json();

      if (res.status === 401 || res.status === 403) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (!res.ok) {
        throw new Error(json.message || "Gagal memuat data paket.");
      }

      setData(json);
      setPackagePage(json.packagesPagination?.page || nextPackagePage);
      setVoucherPage(json.vouchersPagination?.page || nextVoucherPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat data paket.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData(1, 1);
  }, []);

  async function sendAdminRequest(url: string, options: RequestInit) {
    const extraHeaders = (options.headers || {}) as Record<string, string>;

    const response = await fetch(`${apiBaseUrl}${url}`, {
      ...withCredentials(),
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders
      }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || "Permintaan admin gagal.");
    }

    return payload;
  }

  async function handlePackageSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await sendAdminRequest(
        editingPackageId ? `/api/admin/packages/${editingPackageId}` : "/api/admin/packages",
        {
          method: editingPackageId ? "PUT" : "POST",
          body: JSON.stringify(packageForm)
        }
      );

      setPackageForm(emptyPackageForm);
      setEditingPackageId(null);
      setMessage(editingPackageId ? "Paket berhasil diperbarui." : "Paket berhasil ditambahkan.");
      await fetchData(packagePage, voucherPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan paket.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVoucherSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await sendAdminRequest(
        editingVoucherId ? `/api/admin/vouchers/${editingVoucherId}` : "/api/admin/vouchers",
        {
          method: editingVoucherId ? "PUT" : "POST",
          body: JSON.stringify(voucherForm)
        }
      );

      setVoucherForm(emptyVoucherForm);
      setEditingVoucherId(null);
      setMessage(editingVoucherId ? "Voucher berhasil diperbarui." : "Voucher berhasil ditambahkan.");
      await fetchData(packagePage, voucherPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan voucher.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(type: "packages" | "vouchers", id: string) {
    setSaving(true);
    setMessage("");

    try {
      await sendAdminRequest(`/api/admin/${type}/${id}`, {
        method: "DELETE"
      });
      setMessage(type === "packages" ? "Paket berhasil dihapus." : "Voucher berhasil dihapus.");
      setDeleteTarget(null);
      await fetchData(packagePage, voucherPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus data.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <AdminCard padding="32px">
        <div style={{ color: adminTokens.textMuted, fontWeight: 600 }}>Memuat data paket…</div>
      </AdminCard>
    );
  }

  if (!data) {
    return (
      <AdminCard padding="32px">
        <div style={{ color: adminTokens.textMuted }}>Gagal memuat data paket.</div>
      </AdminCard>
    );
  }

  const activePackages = data.packages.filter((pkg) => pkg.isActive).length;
  const activeVouchers = data.vouchers.filter((voucher) => voucher.isActive).length;
  const messageTone = message
    ? message.toLowerCase().includes("berhasil")
      ? "success"
      : "danger"
    : "neutral";

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <ActionDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.type === "packages" ? "Hapus Paket" : "Hapus Voucher"}
        description={
          deleteTarget
            ? `Anda akan menghapus ${deleteTarget.type === "packages" ? "paket" : "voucher"} ${deleteTarget.label}. Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        confirmLabel={deleteTarget?.type === "packages" ? "Ya, hapus paket" : "Ya, hapus voucher"}
        cancelLabel="Batal"
        confirmTone="danger"
        busy={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            return handleDelete(deleteTarget.type, deleteTarget.id);
          }
        }}
      />

      <AdminPageHeader
        eyebrow="Modul Paket & Voucher"
        title="Kelola Paket Harga"
        subtitle="Atur paket layanan, batas ukuran file, dan voucher diskon yang tampil di halaman publik."
        icon={PackagesIcon}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
            gap: "12px"
          }}
        >
          <StatTile
            label="Total Paket"
            value={data.packagesPagination.totalItems.toString()}
            hint={`${activePackages} aktif sekarang`}
            tone="brand"
          />
          <StatTile
            label="Total Voucher"
            value={data.vouchersPagination.totalItems.toString()}
            hint={`${activeVouchers} aktif sekarang`}
            tone="violet"
          />
          <StatTile
            label="Paket Termurah"
            value={
              data.packages.length > 0
                ? formatRupiah(Math.min(...data.packages.map((pkg) => pkg.price)))
                : "—"
            }
            hint="Harga termurah aktif/non-aktif"
            tone="success"
          />
          <StatTile
            label="Diskon Maksimum"
            value={
              data.vouchers.length > 0
                ? `${Math.max(...data.vouchers.map((voucher) => voucher.discountPercent))}%`
                : "—"
            }
            hint="Persentase diskon tertinggi"
            tone="warning"
          />
        </div>
      </AdminPageHeader>

      {message ? <AdminAlert tone={messageTone}>{message}</AdminAlert> : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: "20px",
          alignItems: "stretch"
        }}
      >
        <AdminCard padding={isMobile ? "16px" : "22px"}>
          <AdminSectionHeader
            title="Daftar Paket"
            subtitle="Kelola paket harga dan limit ukuran file."
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3 4 7v10l8 4 8-4V7l-8-4Zm-1 4.4 5-2.5L12 5.2 8 7.4 11 7.4Z"
                  fill="currentColor"
                />
              </svg>
            }
            actions={
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingPackageId(null);
                  setPackageForm(emptyPackageForm);
                }}
              >
                + Paket Baru
              </AdminButton>
            }
          />

          <form
            onSubmit={handlePackageSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.4fr) repeat(2, minmax(120px, 0.8fr))",
              gap: "12px",
              marginBottom: "12px"
            }}
          >
            <AdminInput
              label="Nama Paket"
              placeholder="Contoh: Paket Reguler"
              value={packageForm.name}
              onChange={(e) => setPackageForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <AdminInput
              label="Maks MB"
              type="number"
              min={0}
              value={packageForm.maxFileSizeMb}
              onChange={(e) => setPackageForm((prev) => ({ ...prev, maxFileSizeMb: Number(e.target.value) }))}
            />
            <AdminInput
              label="Harga"
              type="number"
              min={0}
              value={packageForm.price}
              onChange={(e) => setPackageForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
            />
          </form>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
              justifyContent: "space-between",
              marginBottom: "16px"
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: adminTokens.textSecondary,
                fontWeight: 600,
                fontSize: "13px"
              }}
            >
              <input
                type="checkbox"
                checked={packageForm.isActive}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                style={{ accentColor: adminTokens.brand }}
              />
              Paket aktif & tampil ke publik
            </label>
            <AdminButton
              type="submit"
              onClick={(e) => handlePackageSubmit(e as unknown as React.FormEvent)}
              disabled={saving}
              fullWidth={isMobile}
            >
              {editingPackageId ? "Simpan perubahan" : "Tambah paket"}
            </AdminButton>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {data.packages.length === 0 ? (
              <AdminEmptyState
                title="Belum ada paket"
                description="Tambahkan paket pertama agar muncul di halaman harga publik."
              />
            ) : (
              data.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    borderRadius: "14px",
                    border: `1px solid ${adminTokens.border}`,
                    background: adminTokens.surfaceMuted,
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "stretch" : "center",
                    gap: "12px",
                    flexDirection: isMobile ? "column" : "row"
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap"
                      }}
                    >
                      <span style={{ color: adminTokens.textPrimary, fontWeight: 700, fontSize: "14px" }}>{pkg.name}</span>
                      <StatusBadge tone={pkg.isActive ? "success" : "neutral"} size="sm">
                        {pkg.isActive ? "Aktif" : "Nonaktif"}
                      </StatusBadge>
                    </div>
                    <div
                      style={{
                        color: adminTokens.textMuted,
                        fontSize: "12.5px",
                        marginTop: "4px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px"
                      }}
                    >
                      <span>Maks {pkg.maxFileSizeMb} MB</span>
                      <span style={{ color: adminTokens.borderSoft }}>•</span>
                      <span style={{ color: adminTokens.brand, fontWeight: 700 }}>{formatRupiah(pkg.price)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <AdminButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingPackageId(pkg.id);
                        setPackageForm({
                          name: pkg.name,
                          maxFileSizeMb: pkg.maxFileSizeMb,
                          price: pkg.price,
                          isActive: pkg.isActive
                        });
                      }}
                    >
                      Edit
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteTarget({ type: "packages", id: pkg.id, label: pkg.name })}
                    >
                      Hapus
                    </AdminButton>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: "12px" }}>
            <AdminPagination
              page={data.packagesPagination.page}
              totalPages={data.packagesPagination.totalPages}
              totalItems={data.packagesPagination.totalItems}
              onPrevious={() => void fetchData(Math.max(1, data.packagesPagination.page - 1), voucherPage)}
              onNext={() =>
                void fetchData(
                  Math.min(data.packagesPagination.totalPages, data.packagesPagination.page + 1),
                  voucherPage
                )
              }
              itemLabel="paket"
            />
          </div>
        </AdminCard>

        <AdminCard padding={isMobile ? "16px" : "22px"}>
          <AdminSectionHeader
            title="Voucher Diskon"
            subtitle="Kelola kode promo manual. Voucher affiliate yang nonaktif dibersihkan otomatis."
            icon={VoucherIcon}
            actions={
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingVoucherId(null);
                  setVoucherForm(emptyVoucherForm);
                }}
                style={{ background: "#f5f3ff", color: adminTokens.violet, borderColor: "#ede9fe" }}
              >
                + Voucher Baru
              </AdminButton>
            }
          />

          <form
            onSubmit={handleVoucherSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.5fr) minmax(120px, 0.7fr)",
              gap: "12px",
              marginBottom: "12px"
            }}
          >
            <AdminInput
              label="Kode Voucher"
              placeholder="HEMAT10"
              value={voucherForm.code}
              onChange={(e) => setVoucherForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            />
            <AdminInput
              label="Diskon %"
              type="number"
              min={0}
              max={100}
              value={voucherForm.discountPercent}
              onChange={(e) => setVoucherForm((prev) => ({ ...prev, discountPercent: Number(e.target.value) }))}
            />
          </form>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
              justifyContent: "space-between",
              marginBottom: "16px"
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: adminTokens.textSecondary,
                fontWeight: 600,
                fontSize: "13px"
              }}
            >
              <input
                type="checkbox"
                checked={voucherForm.isActive}
                onChange={(e) => setVoucherForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                style={{ accentColor: adminTokens.violet }}
              />
              Voucher aktif
            </label>
            <AdminButton
              type="submit"
              onClick={(e) => handleVoucherSubmit(e as unknown as React.FormEvent)}
              disabled={saving}
              variant="violet"
              fullWidth={isMobile}
            >
              {editingVoucherId ? "Simpan voucher" : "Tambah voucher"}
            </AdminButton>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {data.vouchers.length === 0 ? (
              <AdminEmptyState
                title="Belum ada voucher"
                description="Tambahkan kode promo agar bisa dipakai user di halaman pembayaran."
              />
            ) : (
              data.vouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  style={{
                    borderRadius: "14px",
                    border: `1px solid ${adminTokens.border}`,
                    background: adminTokens.surfaceMuted,
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "stretch" : "center",
                    gap: "12px",
                    flexDirection: isMobile ? "column" : "row"
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap"
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 800,
                          fontSize: "14px",
                          color: adminTokens.violet,
                          background: "#f5f3ff",
                          border: "1px dashed #c4b5fd",
                          borderRadius: "8px",
                          padding: "2px 10px"
                        }}
                      >
                        {voucher.code}
                      </span>
                      <StatusBadge tone={voucher.isActive ? "success" : "neutral"} size="sm">
                        {voucher.isActive ? "Aktif" : "Nonaktif"}
                      </StatusBadge>
                    </div>
                    <div
                      style={{
                        color: adminTokens.textMuted,
                        fontSize: "12.5px",
                        marginTop: "4px"
                      }}
                    >
                      Potongan harga {voucher.discountPercent}%
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <AdminButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingVoucherId(voucher.id);
                        setVoucherForm({
                          code: voucher.code,
                          discountPercent: voucher.discountPercent,
                          isActive: voucher.isActive
                        });
                      }}
                    >
                      Edit
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteTarget({ type: "vouchers", id: voucher.id, label: voucher.code })}
                    >
                      Hapus
                    </AdminButton>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: "12px" }}>
            <AdminPagination
              page={data.vouchersPagination.page}
              totalPages={data.vouchersPagination.totalPages}
              totalItems={data.vouchersPagination.totalItems}
              onPrevious={() => void fetchData(packagePage, Math.max(1, data.vouchersPagination.page - 1))}
              onNext={() =>
                void fetchData(
                  packagePage,
                  Math.min(data.vouchersPagination.totalPages, data.vouchersPagination.page + 1)
                )
              }
              itemLabel="voucher"
            />
          </div>
        </AdminCard>
      </section>
    </div>
  );
}
