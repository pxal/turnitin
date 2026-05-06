"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiBaseUrl, clearAdminSession, formatRupiah, withCredentials } from "../../../lib/api";
import { useIsMobile } from "../../../lib/hooks/useIsMobile";
import ActionDialog from "../../../components/ui/action-dialog";

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

const shellStyles = {
  card: {
    background: "#182235",
    border: "1px solid rgba(143, 163, 194, 0.14)",
    borderRadius: "20px",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)"
  } as const,
  title: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#f8fbff"
  } as const,
  muted: {
    color: "#8196b4"
  } as const,
  button: {
    border: "none",
    borderRadius: "12px",
    padding: "11px 16px",
    fontWeight: 700,
    cursor: "pointer"
  } as const,
  input: {
    width: "100%",
    height: "46px",
    borderRadius: "12px",
    border: "1px solid rgba(143, 163, 194, 0.18)",
    background: "#111a2d",
    color: "#eff6ff",
    padding: "0 14px",
    fontFamily: "inherit"
  } as const
};

function SectionHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginBottom: "18px",
        flexWrap: "wrap"
      }}
    >
      <div>
        <h3 style={{ ...shellStyles.title, fontSize: "22px" }}>{title}</h3>
        {subtitle ? <p style={{ ...shellStyles.muted, fontSize: "14px", marginTop: "4px" }}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function AdminPagination({
  page,
  totalPages,
  totalItems,
  onPrevious,
  onNext
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalItems <= 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginTop: "18px",
        flexWrap: "wrap"
      }}
    >
      <div style={{ fontSize: "13px", color: "#8196b4", fontWeight: 700 }}>
        Halaman {page} dari {Math.max(1, totalPages)}
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrevious}
          style={{
            ...shellStyles.button,
            background: "#111a2d",
            color: "#d8e4f2",
            border: "1px solid rgba(143, 163, 194, 0.14)",
            opacity: page <= 1 ? 0.45 : 1
          }}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          style={{
            ...shellStyles.button,
            background: "#111a2d",
            color: "#d8e4f2",
            border: "1px solid rgba(143, 163, 194, 0.14)",
            opacity: page >= totalPages ? 0.45 : 1
          }}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

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
    return <div style={{ color: "#cfe0f4", fontWeight: 700 }}>Loading data paket...</div>;
  }

  if (!data) {
    return <div style={{ color: "#cfe0f4" }}>Gagal memuat data paket.</div>;
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
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

      {message ? (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "16px",
            background: "rgba(105, 235, 192, 0.09)",
            border: "1px solid rgba(105, 235, 192, 0.16)",
            color: "#9deed3",
            fontWeight: 700
          }}
        >
          {message}
        </div>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: "18px",
          alignItems: "stretch"
        }}
      >
        <article style={{ ...shellStyles.card, padding: isMobile ? "18px 14px" : "22px", height: "100%" }}>
          <SectionHeader
            title="Kelola Paket Harga"
            subtitle="Atur daftar paket yang tampil di halaman publik."
            action={
              <button
                type="button"
                onClick={() => {
                  setEditingPackageId(null);
                  setPackageForm(emptyPackageForm);
                }}
                style={{
                  ...shellStyles.button,
                  background: "rgba(105, 168, 255, 0.14)",
                  color: "#8fc1ff",
                  border: "1px solid rgba(105, 168, 255, 0.18)",
                  width: isMobile ? "100%" : "auto"
                }}
              >
                + Paket Baru
              </button>
            }
          />

          <form
            onSubmit={handlePackageSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.4fr) repeat(2, minmax(110px, 0.7fr)) minmax(120px, auto)",
              gap: "12px",
              marginBottom: "16px",
              alignItems: "end"
            }}
          >
            <label style={{ display: "grid", gap: "8px", color: "#dce7f5", fontWeight: 700, fontSize: "13px" }}>
              Nama Paket
              <input value={packageForm.name} onChange={(e) => setPackageForm((prev) => ({ ...prev, name: e.target.value }))} style={shellStyles.input} />
            </label>
            <label style={{ display: "grid", gap: "8px", color: "#dce7f5", fontWeight: 700, fontSize: "13px" }}>
              Maks MB
              <input type="number" value={packageForm.maxFileSizeMb} onChange={(e) => setPackageForm((prev) => ({ ...prev, maxFileSizeMb: Number(e.target.value) }))} style={shellStyles.input} />
            </label>
            <label style={{ display: "grid", gap: "8px", color: "#dce7f5", fontWeight: 700, fontSize: "13px" }}>
              Harga
              <input type="number" value={packageForm.price} onChange={(e) => setPackageForm((prev) => ({ ...prev, price: Number(e.target.value) }))} style={shellStyles.input} />
            </label>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...shellStyles.button,
                height: "46px",
                background: "#69ebc0",
                color: "#0b1d28",
                opacity: saving ? 0.7 : 1,
                width: isMobile ? "100%" : "auto"
              }}
            >
              {editingPackageId ? "Simpan" : "Tambah"}
            </button>
          </form>

          <label style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "#dce7f5", fontWeight: 700, marginBottom: "18px" }}>
            <input type="checkbox" checked={packageForm.isActive} onChange={(e) => setPackageForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
            Paket aktif
          </label>

          <div style={{ display: "grid", gap: "12px" }}>
            {data.packages.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  borderRadius: "18px",
                  border: "1px solid rgba(143, 163, 194, 0.12)",
                  background: "#111a2d",
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: isMobile ? "stretch" : "center",
                  gap: "14px",
                  flexDirection: isMobile ? "column" : "row"
                }}
              >
                <div>
                  <div style={{ color: "#f8fbff", fontWeight: 800 }}>{pkg.name}</div>
                  <div style={{ color: "#86a0c1", fontSize: "13px", marginTop: "4px" }}>
                    Maks {pkg.maxFileSizeMb} MB • {formatRupiah(pkg.price)} • {pkg.isActive ? "Aktif" : "Nonaktif"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPackageId(pkg.id);
                      setPackageForm({
                        name: pkg.name,
                        maxFileSizeMb: pkg.maxFileSizeMb,
                        price: pkg.price,
                        isActive: pkg.isActive
                      });
                    }}
                    style={{ ...shellStyles.button, background: "rgba(105, 168, 255, 0.14)", color: "#8fc1ff" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: "packages", id: pkg.id, label: pkg.name })}
                    style={{ ...shellStyles.button, background: "rgba(255, 110, 106, 0.12)", color: "#ff8d8d" }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>

          <AdminPagination
            page={data.packagesPagination.page}
            totalPages={data.packagesPagination.totalPages}
            totalItems={data.packagesPagination.totalItems}
            onPrevious={() => void fetchData(Math.max(1, data.packagesPagination.page - 1), voucherPage)}
            onNext={() => void fetchData(Math.min(data.packagesPagination.totalPages, data.packagesPagination.page + 1), voucherPage)}
          />
        </article>

        <article style={{ ...shellStyles.card, padding: isMobile ? "18px 14px" : "22px", height: "100%" }}>
          <SectionHeader
            title="Voucher Diskon"
            subtitle="Kelola kode promo untuk user. Voucher affiliate yang nonaktif dibersihkan otomatis."
            action={
              <button
                type="button"
                onClick={() => {
                  setEditingVoucherId(null);
                  setVoucherForm(emptyVoucherForm);
                }}
                style={{
                  ...shellStyles.button,
                  background: "rgba(155, 140, 255, 0.14)",
                  color: "#b7aaff",
                  border: "1px solid rgba(155, 140, 255, 0.18)",
                  width: isMobile ? "100%" : "auto"
                }}
              >
                + Voucher Baru
              </button>
            }
          />

          <form
            onSubmit={handleVoucherSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(110px, 0.75fr)",
              gap: "12px",
              alignItems: "end"
            }}
          >
            <label style={{ display: "grid", gap: "8px", color: "#dce7f5", fontWeight: 700, fontSize: "13px" }}>
              Kode Voucher
              <input value={voucherForm.code} onChange={(e) => setVoucherForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} style={shellStyles.input} />
            </label>
            <label style={{ display: "grid", gap: "8px", color: "#dce7f5", fontWeight: 700, fontSize: "13px" }}>
              Diskon %
              <input type="number" value={voucherForm.discountPercent} onChange={(e) => setVoucherForm((prev) => ({ ...prev, discountPercent: Number(e.target.value) }))} style={shellStyles.input} />
            </label>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...shellStyles.button,
                background: "#9b8cff",
                color: "#130d2a",
                gridColumn: isMobile ? "auto" : "1 / -1",
                opacity: saving ? 0.7 : 1,
                width: "100%"
              }}
            >
              {editingVoucherId ? "Simpan Voucher" : "Tambah Voucher"}
            </button>
          </form>

          <label style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "#dce7f5", fontWeight: 700, margin: "16px 0 18px" }}>
            <input type="checkbox" checked={voucherForm.isActive} onChange={(e) => setVoucherForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
            Voucher aktif
          </label>

          <div style={{ display: "grid", gap: "12px" }}>
            {data.vouchers.map((voucher) => (
              <div
                key={voucher.id}
                style={{
                  borderRadius: "18px",
                  border: "1px solid rgba(143, 163, 194, 0.12)",
                  background: "#111a2d",
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: isMobile ? "stretch" : "center",
                  gap: "14px",
                  flexDirection: isMobile ? "column" : "row"
                }}
              >
                <div>
                  <div style={{ color: "#f8fbff", fontWeight: 800 }}>{voucher.code}</div>
                  <div style={{ color: "#86a0c1", fontSize: "13px", marginTop: "4px" }}>
                    Diskon {voucher.discountPercent}% • {voucher.isActive ? "Aktif" : "Nonaktif"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVoucherId(voucher.id);
                      setVoucherForm({
                        code: voucher.code,
                        discountPercent: voucher.discountPercent,
                        isActive: voucher.isActive
                      });
                    }}
                    style={{ ...shellStyles.button, background: "rgba(105, 168, 255, 0.14)", color: "#8fc1ff" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: "vouchers", id: voucher.id, label: voucher.code })}
                    style={{ ...shellStyles.button, background: "rgba(255, 110, 106, 0.12)", color: "#ff8d8d" }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>

          <AdminPagination
            page={data.vouchersPagination.page}
            totalPages={data.vouchersPagination.totalPages}
            totalItems={data.vouchersPagination.totalItems}
            onPrevious={() => void fetchData(packagePage, Math.max(1, data.vouchersPagination.page - 1))}
            onNext={() => void fetchData(packagePage, Math.min(data.vouchersPagination.totalPages, data.vouchersPagination.page + 1))}
          />
        </article>
      </section>
    </div>
  );
}
