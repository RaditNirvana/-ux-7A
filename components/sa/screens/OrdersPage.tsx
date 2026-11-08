"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSparepartOrder,
  deleteSparepartOrder,
  updateSparepartOrder,
} from "@/app/sa/actions";
import type {
  ServiceAdvisorOrder,
  ServiceAdvisorSparepart,
  ServiceAdvisorSupplier,
} from "@/components/sa/service-advisor-types";
import {
  formatServiceAdvisorDate,
  saInput,
  saPrimaryButton,
  saSecondaryButton,
  ServiceAdvisorEmpty,
  ServiceAdvisorHero,
  ServiceAdvisorModal,
  ServiceAdvisorNotice,
  ServiceAdvisorPanel,
  ServiceAdvisorStatus,
} from "@/components/sa/ServiceAdvisorUi";

export default function OrdersPage({
  orders,
  spareparts,
  suppliers,
}: {
  orders: ServiceAdvisorOrder[];
  spareparts: ServiceAdvisorSparepart[];
  suppliers: ServiceAdvisorSupplier[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(orders[0]?.id ?? "");
  const [dialog, setDialog] = useState<"add" | "edit" | "delete" | null>(null);
  const [successKind, setSuccessKind] = useState<"add" | "edit" | "delete" | null>(null);
  const [search, setSearch] = useState("");
  const [selectedSparepartId, setSelectedSparepartId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selected = orders.find((order) => order.id === selectedId);
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return orders;
    return orders.filter((order) =>
      [order.id, order.sparepart, order.supplier, order.status]
        .join(" ")
        .toLocaleLowerCase("id-ID")
        .includes(query),
    );
  }, [orders, search]);
  const selectedSparepart = spareparts.find(
    (part) => part.id === selectedSparepartId,
  );
  const selectedOrderPart = spareparts.find(
    (part) => part.id === selected?.sparepartId,
  );

  function openCreateDialog() {
    setError("");
    setSelectedSparepartId(spareparts[0]?.id ?? "");
    setDialog("add");
  }

  async function submitOrder(formData: FormData) {
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const result =
        dialog === "edit" && selected
          ? await updateSparepartOrder(selected.id, formData)
          : await createSparepartOrder(formData);
      if (!result.success) {
        setError(result.message);
        return;
      }

      setDialog(null);
      setSuccessKind(dialog);
      const sparepart = spareparts.find((part) => part.id === formData.get("id_sparepart"));
      const supplier = suppliers.find((item) => item.id === formData.get("id_supplier"));
      setNotice(
        dialog === "add"
          ? `${formData.get("jumlah")} ${sparepart?.unit ?? "unit"} ${sparepart?.name ?? "sparepart"} untuk ${supplier?.name ?? "supplier"} berhasil ditambahkan.`
          : `Pemesanan ${selected?.id ?? ""} berhasil diperbarui.`,
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const result = await deleteSparepartOrder(selected.id);
      if (!result.success) {
        setError(result.message);
        return;
      }

      setDialog(null);
      setSuccessKind("delete");
      setNotice(`${selected.id} berhasil dihapus.`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="sa-orders">
      <ServiceAdvisorHero
        title="PEMESANAN SPAREPART"
        subtitle="Kelola pemesanan ke supplier dan pantau status pemenuhan kebutuhan sparepart."
      />
      {error && !dialog ? (
        <div className="sa-orders-notice">
          <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice>
        </div>
      ) : null}
      <div className="sa-orders-grid">
        <div className="sa-orders-left">
          <ServiceAdvisorPanel
            className="sa-orders-list-panel"
            title="Daftar Pemesanan Sparepart"
            subtitle={`${formatServiceAdvisorDate(new Date())} • ${orders.length} pemesanan`}
          >
            <div className="sa-orders-toolbar">
              <input
                aria-label="Cari pemesanan"
                className={saInput}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nomor pemesanan, sparepart, atau supplier"
                value={search}
              />
              <button className={saPrimaryButton} type="button">
                Cari
              </button>
              <button className={saPrimaryButton} onClick={openCreateDialog} type="button">
                + Tambah
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="sa-orders-table">
                <thead>
                  <tr className="border-b border-[#8e8b9e]">
                    {["Nomor", "Nama sparepart", "Jumlah", "Supplier", "Status", "Aksi"].map(
                      (label) => (
                        <th className="px-2 py-2 font-bold" key={label}>
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      className={`sa-orders-row border-b border-[#d1cde7] ${
                        order.id === selectedId ? "bg-[#e3e1f8]" : ""
                      }`}
                      key={order.id}
                    >
                      <td className="px-2 py-2.5 font-bold">{order.id}</td>
                      <td className="px-2 py-2.5">
                        {order.sparepart}
                        <span className="block text-[10px] text-[#77758a]">
                          {order.sparepartId}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        {order.quantity} {order.unit}
                      </td>
                      <td className="px-2 py-2.5">{order.supplier}</td>
                      <td className="px-2 py-2.5">
                        <ServiceAdvisorStatus value={order.status} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5">
                        <button
                          className="font-bold text-[#493cdf] hover:underline"
                          onClick={() => setSelectedId(order.id)}
                          type="button"
                        >
                          Detail
                        </button>
                        {order.status !== "Diterima" ? (
                          <>
                            {" · "}
                            <button
                              className="font-bold text-[#493cdf] hover:underline"
                              onClick={() => {
                                setSelectedId(order.id);
                                setSelectedSparepartId(order.sparepartId);
                                setError("");
                                setDialog("edit");
                              }}
                              type="button"
                            >
                              Ubah
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 ? (
                <ServiceAdvisorEmpty>
                  {orders.length
                    ? "Tidak ada pemesanan yang cocok dengan pencarian."
                    : "Belum ada data pemesanan sparepart."}
                </ServiceAdvisorEmpty>
              ) : null}
            </div>
            <p className="sa-orders-count">
              Menampilkan {filteredOrders.length} dari {orders.length} data
            </p>
          </ServiceAdvisorPanel>
          <ServiceAdvisorNotice className="sa-orders-info" tone="info">
            <span aria-hidden="true" className="sa-orders-info-icon" />
            <span className="sa-orders-info-copy">
              <strong>Pemesanan belum menambah stok</strong>
              <span>Stok gudang diperbarui setelah barang diterima.</span>
            </span>
          </ServiceAdvisorNotice>
        </div>

        <ServiceAdvisorPanel
          className="sa-orders-detail-panel"
          title="Detail Pemesanan"
          subtitle={selected ? `${selected.id} • ${selected.sparepart}` : undefined}
        >
          {selected ? (
            <>
              <div className="sa-orders-detail-status">
                <ServiceAdvisorStatus value={selected.status} />
              </div>
              <dl className="sa-orders-detail-grid">
                <div>
                  <dt className="text-[10px] text-[#68667a]">Kode & jumlah sparepart</dt>
                  <dd className="mt-1 font-bold">
                    {selected.sparepartId} • {selected.quantity} {selected.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-[#68667a]">Stok saat ini</dt>
                  <dd className="mt-1 font-bold">
                    {selected.stock} {selected.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-[#68667a]">Supplier</dt>
                  <dd className="mt-1 font-bold">{selected.supplier}</dd>
                </div>
                {selected.supplierPhone ? (
                  <div>
                    <dt className="text-[10px] text-[#68667a]">Kontak supplier</dt>
                    <dd className="mt-1 font-bold">{selected.supplierPhone}</dd>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[10px] text-[#68667a]">Tanggal pesan</dt>
                    <dd className="mt-1 font-bold">
                      {formatServiceAdvisorDate(selected.orderDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-[#68667a]">Estimasi tiba</dt>
                    <dd className="mt-1 font-bold">
                      {formatServiceAdvisorDate(selected.estimatedDate)}
                    </dd>
                  </div>
                </div>
                {selected.note ? (
                  <div>
                    <dt className="text-[10px] text-[#68667a]">Catatan</dt>
                    <dd className="mt-1 font-bold">{selected.note}</dd>
                  </div>
                ) : null}
              </dl>
              {selected.status !== "Diterima" ? (
                <div className="sa-orders-detail-actions">
                  <button
                    className={saPrimaryButton}
                    onClick={() => {
                      setError("");
                      setSelectedSparepartId(selected.sparepartId);
                      setDialog("edit");
                    }}
                    type="button"
                  >
                    Edit pesanan
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
              ) : null}
            </>
          ) : (
            <ServiceAdvisorEmpty>Pilih pemesanan untuk melihat detail.</ServiceAdvisorEmpty>
          )}
        </ServiceAdvisorPanel>
      </div>

      {dialog === "add" || dialog === "edit" ? (
        <ServiceAdvisorModal
          backdropClassName="sa-orders-form-backdrop"
          className="sa-orders-form-modal"
          headerAside={formatServiceAdvisorDate(new Date())}
          onClose={() => setDialog(null)}
          title={dialog === "add" ? "Tambah Pemesanan Sparepart" : "Edit Pemesanan"}
        >
          <form action={submitOrder} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">
                Sparepart *
                <select
                  className={`${saInput} mt-1.5 font-normal`}
                  name="id_sparepart"
                  onChange={(event) => setSelectedSparepartId(event.target.value)}
                  required
                  value={selectedSparepartId}
                >
                  {spareparts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.id} • {part.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                Supplier *
                <select
                  className={`${saInput} mt-1.5 font-normal`}
                  defaultValue={selected?.supplierId ?? suppliers[0]?.id ?? ""}
                  name="id_supplier"
                  required
                >
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                Jumlah ({selectedSparepart?.unit ?? selectedOrderPart?.unit ?? "pcs"}) *
                <input
                  className={`${saInput} mt-1.5 font-normal`}
                  defaultValue={dialog === "edit" ? selected?.quantity : ""}
                  min={1}
                  name="jumlah"
                  required
                  type="number"
                />
              </label>
              <label className="text-xs font-bold">
                Tanggal pemesanan *
                <input
                  className={`${saInput} mt-1.5 font-normal`}
                  defaultValue={
                    dialog === "edit"
                      ? selected?.orderDate
                      : new Date().toISOString().slice(0, 10)
                  }
                  name="tanggal_pemesanan"
                  required
                  type="date"
                />
              </label>
              <label className="text-xs font-bold">
                Estimasi tiba
                <input
                  className={`${saInput} mt-1.5 font-normal`}
                  defaultValue={dialog === "edit" ? selected?.estimatedDate ?? "" : ""}
                  name="estimasi_tiba"
                  type="date"
                />
              </label>
              {dialog === "edit" ? (
                <label className="text-xs font-bold">
                  Status pemesanan *
                  <select
                    className={`${saInput} mt-1.5 font-normal`}
                    defaultValue={selected?.status ?? "Draf"}
                    name="status_pemesanan"
                  >
                    {["Draf", "Dipesan", "Diterima", "Dibatalkan"].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            {selectedSparepart || selectedOrderPart ? (
              <p className="text-[10px] text-[#68667a]">
                Stok saat ini:{" "}
                {selectedSparepart?.stock ?? selectedOrderPart?.stock}{" "}
                {selectedSparepart?.unit ?? selectedOrderPart?.unit}. Pesanan
                baru tidak mengubah stok sampai diterima.
              </p>
            ) : null}
            <label className="block text-xs font-bold">
              Catatan
              <input
                className={`${saInput} mt-1.5 font-normal`}
                defaultValue={dialog === "edit" ? selected?.note ?? "" : ""}
                maxLength={255}
                name="catatan"
              />
            </label>
            {error ? <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice> : null}
            <div className="flex justify-end gap-2">
              <button
                className={saSecondaryButton}
                onClick={() => setDialog(null)}
                type="button"
              >
                Batal
              </button>
              <button className={saPrimaryButton} disabled={submitting} type="submit">
                {submitting
                  ? "Menyimpan..."
                  : dialog === "add"
                    ? "Simpan pemesanan"
                    : "Simpan perubahan"}
              </button>
            </div>
          </form>
        </ServiceAdvisorModal>
      ) : null}

      {dialog === "delete" && selected ? (
        <ServiceAdvisorModal
          backdropClassName="sa-orders-delete-backdrop"
          className="sa-orders-delete-modal"
          onClose={() => setDialog(null)}
          title="Hapus pemesanan sparepart?"
        >
          <p className="text-sm leading-6 text-[#68667a]">
            {selected.id} • {selected.sparepart} akan dihapus dari daftar
            pemesanan. Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="mt-4">
            <ServiceAdvisorNotice tone="info">
              Stok gudang tidak berubah karena pesanan belum diterima.
            </ServiceAdvisorNotice>
          </div>
          {error ? (
            <div className="mt-3">
              <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              className={saSecondaryButton}
              onClick={() => setDialog(null)}
              type="button"
            >
              Batal
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#ad3046] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={submitting}
              onClick={confirmDelete}
              type="button"
            >
              {submitting ? "Menghapus..." : "Ya, hapus"}
            </button>
          </div>
        </ServiceAdvisorModal>
      ) : null}

      {notice && successKind ? (
        <ServiceAdvisorModal
          backdropClassName="sa-orders-success-backdrop"
          className="sa-orders-success-modal"
          onClose={() => {
            setNotice("");
            setSuccessKind(null);
          }}
          title="Konfirmasi berhasil"
        >
          <div aria-hidden="true" className="sa-orders-success-icon">
            <span />
          </div>
          <h2 className="sa-orders-success-title">
            {successKind === "add"
              ? "Berhasil Ditambahkan"
              : successKind === "edit"
                ? "Berhasil Diperbarui"
                : "Berhasil Dihapus"}
          </h2>
          <p className="sa-orders-success-copy">{notice}</p>
          <p className="sa-orders-success-note">
            {successKind === "delete"
              ? "Stok tidak berubah karena pesanan bukan transaksi penerimaan barang."
              : "Stok tetap; belum ada penerimaan barang."}
          </p>
          <div className="sa-orders-success-actions">
            <button
              className={saPrimaryButton}
              onClick={() => {
                setNotice("");
                setSuccessKind(null);
              }}
              type="button"
            >
              Kembali
            </button>
          </div>
        </ServiceAdvisorModal>
      ) : null}
    </section>
  );
}
