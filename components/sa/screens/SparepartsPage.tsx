"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deactivateSparepart,
  saveSparepart,
} from "@/app/sa/actions";
import type { ServiceAdvisorSparepart } from "@/components/sa/service-advisor-types";
import {
  formatServiceAdvisorDate,
  saPrimaryButton,
  saSecondaryButton,
  ServiceAdvisorEmpty,
  ServiceAdvisorHero,
  ServiceAdvisorModal,
  ServiceAdvisorNotice,
  ServiceAdvisorPanel,
  ServiceAdvisorStatus,
} from "@/components/sa/ServiceAdvisorUi";

function stockStatus(part: ServiceAdvisorSparepart) {
  if (part.stock === 0) return "Habis";
  if (part.stock < part.minimum) return "Stok menipis";
  return "Tersedia";
}

export default function SparepartsPage({
  spareparts,
}: {
  spareparts: ServiceAdvisorSparepart[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(spareparts[0]?.id ?? "");
  const [dialog, setDialog] = useState<"add" | "edit" | "delete" | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selected = spareparts.find((part) => part.id === selectedId);
  const isForm = dialog === "add" || dialog === "edit";
  const filteredSpareparts = spareparts.filter((part) =>
    [part.id, part.name, part.category]
      .join(" ")
      .toLocaleLowerCase("id-ID")
      .includes(search.trim().toLocaleLowerCase("id-ID")),
  );
  const lowStockParts = spareparts.filter(
    (part) => part.stock < part.minimum,
  );
  const pageSize = 7;
  const pageCount = Math.max(1, Math.ceil(filteredSpareparts.length / pageSize));
  const activePage = Math.min(currentPage, pageCount);
  const paginatedSpareparts = filteredSpareparts.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );

  async function submitSparepart(formData: FormData) {
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const result = await saveSparepart(formData);
      if (!result.success) {
        setError(result.message);
        return;
      }

      setDialog(null);
      setNotice(
        dialog === "add"
          ? "Sparepart berhasil ditambahkan. Daftar sudah diperbarui."
          : "Data sparepart berhasil diperbarui. Daftar sudah diperbarui.",
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeactivate() {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const result = await deactivateSparepart(selected.id);
      if (!result.success) {
        setError(result.message);
        return;
      }

      setDialog(null);
      setNotice(`${selected.name} dinonaktifkan. Daftar sudah diperbarui.`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="sa-spareparts mx-auto w-full max-w-[1160px]">
      <ServiceAdvisorHero
        title={
          isForm
            ? dialog === "add"
              ? "TAMBAH STOK SPAREPART"
              : "UPDATE STOK SPAREPART"
            : "STOK SPAREPART"
        }
        subtitle={
          isForm
            ? "Masukkan data sparepart dan jumlah stok yang sesuai dengan kondisi gudang."
            : "Pantau persediaan, perbarui jumlah stok, dan kelola kebutuhan sparepart servis."
        }
      />
      {error && !dialog ? (
        <div className="mb-3">
          <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice>
        </div>
      ) : null}
      {isForm ? (
        <div className="sa-spareparts-grid sa-spareparts-form-grid">
          <ServiceAdvisorPanel
            className="sa-spareparts-form-panel"
            title={
              dialog === "add"
                ? "Formulir Tambah Sparepart"
                : "Formulir Update Sparepart"
            }
            subtitle="Kolom bertanda * wajib diisi"
          >
            <form
              action={submitSparepart}
              className="sa-spareparts-form"
              id="sa-sparepart-form"
            >
              {dialog === "edit" && selected ? (
                <input name="id_sparepart" type="hidden" value={selected.id} />
              ) : null}
              <div className="sa-spareparts-form-fields">
                <label className="sa-spareparts-label">
                  Kode sparepart
                  <input
                    className="sa-spareparts-input"
                    readOnly
                    value={
                      dialog === "edit"
                        ? selected?.id ?? ""
                        : "Dibuat otomatis setelah disimpan"
                    }
                  />
                </label>
                <label className="sa-spareparts-label">
                  Nama sparepart *
                  <input
                    className="sa-spareparts-input"
                    defaultValue={dialog === "edit" ? selected?.name ?? "" : ""}
                    maxLength={100}
                    name="nama_sparepart"
                    required
                  />
                </label>
                <label className="sa-spareparts-label">
                  Jumlah stok *
                  <input
                    className="sa-spareparts-input"
                    defaultValue={dialog === "edit" ? selected?.stock ?? 0 : 0}
                    min={0}
                    name="stok"
                    required
                    type="number"
                  />
                </label>
                <label className="sa-spareparts-label">
                  Satuan *
                  <select
                    className="sa-spareparts-input"
                    defaultValue={dialog === "edit" ? selected?.unit ?? "pcs" : "pcs"}
                    name="satuan"
                  >
                    {Array.from(
                      new Set([
                        "pcs",
                        "liter",
                        "set",
                        "tabung",
                        "botol",
                        ...(selected ? [selected.unit] : []),
                      ]),
                    ).map((unit) => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </select>
                </label>
                <label className="sa-spareparts-label">
                  Kategori *
                  <input
                    className="sa-spareparts-input"
                    defaultValue={dialog === "edit" ? selected?.category ?? "" : ""}
                    maxLength={30}
                    name="kategori"
                    required
                  />
                </label>
                <label className="sa-spareparts-label">
                  Batas stok minimum *
                  <input
                    className="sa-spareparts-input"
                    defaultValue={dialog === "edit" ? selected?.minimum ?? 0 : 0}
                    min={0}
                    name="batas_minimum"
                    required
                    type="number"
                  />
                </label>
                <label className="sa-spareparts-label sa-spareparts-note-field">
                  Catatan perubahan
                  <input
                    className="sa-spareparts-input"
                    maxLength={255}
                    name="catatan"
                    placeholder="Contoh: stok awal atau hasil stok opname"
                  />
                </label>
              </div>
              <details className="sa-spareparts-location-settings">
                <summary>Lokasi penyimpanan (opsional)</summary>
                <label className="sa-spareparts-label">
                  Lokasi penyimpanan
                  <input
                    className="sa-spareparts-input"
                    defaultValue={dialog === "edit" ? selected?.location ?? "" : ""}
                    maxLength={50}
                    name="lokasi_penyimpanan"
                  />
                </label>
              </details>
              {error ? <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice> : null}
              <div className="sa-spareparts-form-actions">
                <button
                  className={saSecondaryButton}
                  onClick={() => {
                    setDialog(null);
                    setError("");
                  }}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className={saPrimaryButton}
                  disabled={submitting}
                  type="submit"
                >
                  {submitting
                    ? "Menyimpan..."
                    : dialog === "add"
                      ? "Simpan sparepart"
                      : "Simpan perubahan"}
                </button>
              </div>
            </form>
          </ServiceAdvisorPanel>
          <ServiceAdvisorPanel
            className="sa-spareparts-info-panel"
            title="Informasi Stok"
            subtitle="Pastikan jumlah stok sesuai satuan"
          >
            <div className="sa-spareparts-info-content">
              <dl>
                <div>
                  <dt>Status otomatis</dt>
                  <dd>Ditentukan dari jumlah stok dan batas minimum</dd>
                </div>
                <div>
                  <dt>Stok kosong</dt>
                  <dd>Jumlah 0 ditandai Habis</dd>
                </div>
                <div>
                  <dt>Stok menipis</dt>
                  <dd>Jumlah stok &lt; batas minimum</dd>
                </div>
              </dl>
              <p>Pemesanan yang belum diterima tidak menambah stok gudang.</p>
              <button
                className={`${saSecondaryButton} sa-spareparts-return`}
                onClick={() => {
                  setDialog(null);
                  setError("");
                }}
                type="button"
              >
                Kembali ke stok
              </button>
            </div>
          </ServiceAdvisorPanel>
        </div>
      ) : (
      <div className="sa-spareparts-grid">
        <ServiceAdvisorPanel
          className="sa-spareparts-list-panel"
        >
          <div className="sa-spareparts-list-heading">
            <div>
              <h2>Daftar Stok Sparepart</h2>
              <p>
                {spareparts.length} jenis sparepart •{" "}
                {spareparts.filter((part) => part.stock > 0).length} aktif
              </p>
            </div>
            <div className="sa-spareparts-list-actions">
              <label className="sa-spareparts-search">
              <span className="sr-only">Cari stok sparepart</span>
              <input
                className="sa-spareparts-search-input"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari kode, nama, atau kategori sparepart"
                value={search}
              />
            </label>
              <button
                className={`${saPrimaryButton} sa-spareparts-add`}
                onClick={() => {
                  setError("");
                  setDialog("add");
                }}
                type="button"
              >
                + Tambah
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="sa-spareparts-table">
              <thead>
                <tr className="border-b border-[#8e8b9e]">
                  {["Kode", "Nama sparepart", "Stok", "Kategori", "Status", "Aksi"].map(
                    (label) => (
                      <th className="px-2 py-2 font-bold" key={label}>
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedSpareparts.map((part) => (
                  <tr
                    className={part.id === selectedId ? "is-selected" : ""}
                    key={part.id}
                  >
                    <td className="is-code">{part.id}</td>
                    <td>{part.name}</td>
                    <td>
                      {part.stock} {part.unit}
                    </td>
                    <td>{part.category}</td>
                    <td className={`is-status ${stockStatus(part) === "Tersedia" ? "is-available" : stockStatus(part) === "Habis" ? "is-empty" : "is-low"}`}>
                      {stockStatus(part)}
                    </td>
                    <td className="is-actions">
                      <button
                        className="font-bold text-[#493cdf] hover:underline"
                        onClick={() => setSelectedId(part.id)}
                        type="button"
                      >
                        Detail
                      </button>
                      {" · "}
                      <button
                        className="font-bold text-[#493cdf] hover:underline"
                        onClick={() => {
                          setSelectedId(part.id);
                          setError("");
                          setDialog("edit");
                        }}
                        type="button"
                      >
                        Ubah
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paginatedSpareparts.length === 0 ? (
              <ServiceAdvisorEmpty>
                {spareparts.length
                  ? "Tidak ada sparepart yang cocok dengan pencarian."
                  : "Belum ada data sparepart."}
              </ServiceAdvisorEmpty>
            ) : null}
          </div>
          <div className="sa-spareparts-list-footer">
            <span>
              Menampilkan {paginatedSpareparts.length} dari {filteredSpareparts.length} data
            </span>
            <nav aria-label="Halaman stok sparepart">
              <button
                aria-label="Halaman sebelumnya"
                disabled={activePage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                type="button"
              >
                ‹
              </button>
              <span>{activePage}</span>
              <button
                aria-label="Halaman selanjutnya"
                disabled={activePage >= pageCount}
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                type="button"
              >
                ›
              </button>
            </nav>
          </div>
          {lowStockParts.length ? (
            <p className="sa-spareparts-low-stock">
              Perlu perhatian:{" "}
              {lowStockParts.map((part) => part.name).join(", ")}.
            </p>
          ) : null}
        </ServiceAdvisorPanel>

        <div className="sa-spareparts-right-stack">
        {notice ? (
          <ServiceAdvisorNotice onDismiss={() => setNotice("")}>
            <svg
              aria-hidden="true"
              className="sa-spareparts-toast-icon"
              fill="none"
              viewBox="0 0 20 20"
            >
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="m6.5 10 2.2 2.2 4.8-4.8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
            <span>{notice}</span>
          </ServiceAdvisorNotice>
        ) : null}
        <ServiceAdvisorPanel
          className="sa-spareparts-detail-panel"
          title="Detail Sparepart"
          subtitle={selected ? `${selected.id} • ${selected.name}` : undefined}
        >
          {selected ? (
            <>
              <div className="mb-4">
                <ServiceAdvisorStatus value={stockStatus(selected)} />
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
                <div>
                  <dt className="text-[10px] text-[#68667a]">Jumlah stok</dt>
                  <dd className="mt-1 font-bold">
                    {selected.stock} {selected.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-[#68667a]">Batas minimum</dt>
                  <dd className="mt-1 font-bold">
                    {selected.minimum} {selected.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-[#68667a]">Kategori</dt>
                  <dd className="mt-1 font-bold">{selected.category}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] text-[#68667a]">Lokasi penyimpanan</dt>
                  <dd className="mt-1 font-bold">{selected.location ?? "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] text-[#68667a]">Terakhir diperbarui</dt>
                  <dd className="mt-1 font-bold">
                    {formatServiceAdvisorDate(selected.updatedAt)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <button
                  className={saPrimaryButton}
                  onClick={() => {
                    setError("");
                    setDialog("edit");
                  }}
                  type="button"
                >
                  Update stok
                </button>
                <button
                  className={saSecondaryButton}
                  onClick={() => {
                    setError("");
                    setDialog("delete");
                  }}
                  type="button"
                >
                  Hapus
                </button>
              </div>
            </>
          ) : (
            <ServiceAdvisorEmpty>Pilih sparepart untuk melihat detail.</ServiceAdvisorEmpty>
          )}
        </ServiceAdvisorPanel>
        </div>
      </div>
      )}

      {dialog === "delete" && selected ? (
        <ServiceAdvisorModal
          className="sa-spareparts-delete-modal"
          onClose={() => setDialog(null)}
          title="Hapus data sparepart?"
        >
          <p className="sa-spareparts-delete-copy">
            {selected.id} • {selected.name} akan dihapus dari daftar stok. Data ini
            tidak dapat dikembalikan setelah dihapus.
          </p>
          <div className="sa-spareparts-delete-selected">
            <p>Data yang dipilih</p>
            <strong>
              {selected.name} • {selected.stock} {selected.unit} •{" "}
              {stockStatus(selected)}
            </strong>
          </div>
          <div className="sa-spareparts-delete-notice">
            <ServiceAdvisorNotice tone="info">
              <svg
                aria-hidden="true"
                className="sa-spareparts-delete-info-icon"
                fill="none"
                viewBox="0 0 20 20"
              >
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10 9v5m0-8h.01"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
              <span>
                <strong>Riwayat tetap tersimpan</strong>
                <span>
                  Menonaktifkan sparepart tidak menghapus riwayat stok dan transaksi.
                </span>
              </span>
            </ServiceAdvisorNotice>
          </div>
          {error ? (
            <div className="mt-3">
              <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice>
            </div>
          ) : null}
          <div className="sa-spareparts-delete-actions">
            <button
              className={saSecondaryButton}
              onClick={() => setDialog(null)}
              type="button"
            >
              Batal
            </button>
            <button
              className="sa-spareparts-delete-confirm"
              disabled={submitting}
              onClick={confirmDeactivate}
              type="button"
            >
              {submitting ? "Memproses..." : "Ya, hapus"}
            </button>
          </div>
        </ServiceAdvisorModal>
      ) : null}
    </section>
  );
}
