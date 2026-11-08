"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deactivateMechanic,
  saveMechanic,
} from "@/app/sa/actions";
import type { ServiceAdvisorMechanic } from "@/components/sa/service-advisor-types";
import {
  saPrimaryButton,
  saSecondaryButton,
  ServiceAdvisorEmpty,
  ServiceAdvisorHero,
  ServiceAdvisorModal,
  ServiceAdvisorNotice,
  ServiceAdvisorPanel,
  ServiceAdvisorStatus,
  ServiceAdvisorTabs,
} from "@/components/sa/ServiceAdvisorUi";

export default function MechanicsPage({
  mechanics,
}: {
  mechanics: ServiceAdvisorMechanic[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(mechanics[0]?.id ?? "");
  const [dialog, setDialog] = useState<"add" | "edit" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selected = mechanics.find((mechanic) => mechanic.id === selectedId);
  const isForm = dialog === "add" || dialog === "edit";
  const inactiveCount = mechanics.filter(
    (mechanic) => mechanic.login !== "Aktif",
  ).length;

  async function submitMechanic(formData: FormData) {
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const result = await saveMechanic(formData);
      if (!result.success) {
        setError(result.message);
        return;
      }

      setDialog(null);
      setNotice(
        dialog === "add"
          ? "Data mekanik berhasil ditambahkan. Daftar sudah diperbarui."
          : "Data mekanik berhasil diperbarui. Daftar sudah diperbarui.",
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
      const result = await deactivateMechanic(selected.id);
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
    <section className="sa-mechanics mx-auto w-full max-w-[1160px]">
      <ServiceAdvisorHero
        title={isForm
          ? dialog === "add"
            ? "TAMBAH DATA MEKANIK"
            : "UBAH DATA MEKANIK"
          : "DATA MEKANIK"}
        subtitle={
          isForm
            ? "Lengkapi identitas, keahlian, dan status ketersediaan mekanik."
            : "Kelola data dan ketersediaan mekanik melalui area Penugasan Mekanik."
        }
      />
      <ServiceAdvisorTabs
        active="/sa/data-mekanik"
        links={[
          { href: "/sa/penugasan", label: "Daftar penugasan" },
          { href: "/sa/data-mekanik", label: "Data Mekanik" },
        ]}
      />
      {error && !dialog ? (
        <div className="mb-3">
          <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice>
        </div>
      ) : null}

      {isForm ? (
        <div className="sa-mechanics-grid">
          <ServiceAdvisorPanel
            className="sa-mechanics-form-panel"
            title={
              dialog === "add"
                ? "Formulir Tambah Mekanik"
                : "Formulir Perubahan Mekanik"
            }
            subtitle="Kolom bertanda * wajib diisi"
          >
            <form
              action={submitMechanic}
              className="sa-mechanics-form"
              id="sa-mechanics-form"
            >
              {dialog === "edit" && selected ? (
                <>
                  <input name="id_mekanik" type="hidden" value={selected.id} />
                  <input name="username" type="hidden" value="-" />
                  <input name="password" type="hidden" value="-" />
                </>
              ) : null}
              <div className="sa-mechanics-form-fields">
                <label className="sa-mechanics-label">
                  Kode mekanik
                  <input
                    className="sa-mechanics-input"
                    readOnly
                    value={
                      dialog === "edit"
                        ? selected?.displayId ?? ""
                        : "Dibuat otomatis setelah disimpan"
                    }
                  />
                </label>
                <label className="sa-mechanics-label">
                  Nama mekanik *
                  <input
                    className="sa-mechanics-input"
                    defaultValue={dialog === "edit" ? selected?.name ?? "" : ""}
                    maxLength={100}
                    name="nama"
                    required
                  />
                </label>
                <label className="sa-mechanics-label">
                  Nomor telepon *
                  <input
                    className="sa-mechanics-input"
                    defaultValue={dialog === "edit" ? selected?.phone ?? "" : ""}
                    maxLength={15}
                    name="no_hp"
                    required
                  />
                </label>
                <label className="sa-mechanics-label">
                  Keahlian
                  <input
                    className="sa-mechanics-input"
                    readOnly
                    value="Belum tersedia pada data mekanik"
                  />
                </label>
                <label className="sa-mechanics-label">
                  Jadwal kerja
                  <input
                    className="sa-mechanics-input"
                    readOnly
                    value="Belum tersedia pada data mekanik"
                  />
                </label>
                <label className="sa-mechanics-label">
                  Status ketersediaan *
                  <select
                    className="sa-mechanics-input"
                    defaultValue={
                      dialog === "edit" ? selected?.availability ?? "Tersedia" : "Tersedia"
                    }
                    name="status_ketersediaan"
                  >
                    <option>Tersedia</option>
                    <option>Sedang Bekerja</option>
                  </select>
                </label>
              </div>
              {error ? <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice> : null}
              <div className="sa-mechanics-form-actions">
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
                      ? "Simpan data mekanik"
                      : "Simpan perubahan"}
                </button>
              </div>
            </form>
          </ServiceAdvisorPanel>
          <ServiceAdvisorPanel
            className="sa-mechanics-info-panel"
            title="Informasi Pengisian"
            subtitle="Data mekanik digunakan saat penugasan"
          >
            <div className="sa-mechanics-info-content">
              <dl className="sa-mechanics-info-list">
                <div>
                  <dt>Kode mekanik</dt>
                  <dd>Dibuat otomatis dan tidak dapat diubah</dd>
                </div>
                <div>
                  <dt>Status tersedia</dt>
                  <dd>Mekanik dapat dipilih untuk penugasan baru</dd>
                </div>
              </dl>
              <p className="sa-mechanics-info-copy">
                Perubahan data tidak mengubah riwayat servis yang sudah selesai.
              </p>
              <button
                className={`${saSecondaryButton} sa-mechanics-return`}
                onClick={() => {
                  setDialog(null);
                  setError("");
                }}
                type="button"
              >
                Kembali ke Data Mekanik
              </button>
              <details className="sa-mechanics-account-settings">
                <summary>Pengaturan akun (wajib dilengkapi)</summary>
                <div className="sa-mechanics-account-fields">
                  <label className="sa-mechanics-label">
                    Status akun *
                    <select
                      className="sa-mechanics-input"
                      defaultValue={
                        dialog === "edit" ? selected?.login ?? "Aktif" : "Aktif"
                      }
                      form="sa-mechanics-form"
                      name="login"
                    >
                      <option>Aktif</option>
                      <option>Tidak Aktif</option>
                    </select>
                  </label>
                  {dialog === "add" ? (
                    <>
                      <label className="sa-mechanics-label">
                        Username *
                        <input
                          autoComplete="username"
                          className="sa-mechanics-input"
                          form="sa-mechanics-form"
                          maxLength={50}
                          name="username"
                          required
                        />
                      </label>
                      <label className="sa-mechanics-label">
                        Kata sandi awal *
                        <input
                          autoComplete="new-password"
                          className="sa-mechanics-input"
                          form="sa-mechanics-form"
                          minLength={8}
                          name="password"
                          required
                          type="password"
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              </details>
            </div>
          </ServiceAdvisorPanel>
        </div>
      ) : (
        <div className="sa-mechanics-grid">
          <ServiceAdvisorPanel className="sa-mechanics-list-panel">
            <div className="sa-mechanics-list-heading">
              <div>
                <h2>Daftar Data Mekanik</h2>
                <p>
                  {mechanics.length} mekanik •{" "}
                  {
                    mechanics.filter(
                      (mechanic) =>
                        mechanic.availability === "Tersedia" &&
                        mechanic.login === "Aktif",
                    ).length
                  }{" "}
                  tersedia •{" "}
                  {
                    mechanics.filter(
                      (mechanic) => mechanic.availability === "Sedang Bekerja",
                    ).length
                  }{" "}
                  sedang bertugas • {inactiveCount} tidak aktif
                </p>
              </div>
              <button
                className={`${saPrimaryButton} sa-mechanics-add`}
                onClick={() => {
                  setError("");
                  setDialog("add");
                }}
                type="button"
              >
                + Tambah
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="sa-mechanics-table">
                <thead>
                  <tr>
                    {["Kode", "Nama", "Keahlian", "Status", "Aksi"].map(
                      (label) => (
                        <th key={label}>{label}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {mechanics.map((mechanic) => {
                    const status =
                      mechanic.login === "Aktif"
                        ? mechanic.availability
                        : "Tidak aktif";
                    const statusClass =
                      status === "Tersedia"
                        ? "is-available"
                        : status === "Tidak aktif"
                          ? "is-inactive"
                          : "is-busy";

                    return (
                      <tr
                        className={mechanic.id === selectedId ? "is-selected" : ""}
                        key={mechanic.id}
                      >
                        <td className="is-code">{mechanic.displayId}</td>
                        <td>{mechanic.name}</td>
                        <td className="is-unavailable">Belum tersedia</td>
                        <td className={statusClass}>{status}</td>
                        <td className="is-actions">
                          <button
                            onClick={() => setSelectedId(mechanic.id)}
                            type="button"
                          >
                            Detail
                          </button>
                          {mechanic.login === "Aktif" ? (
                            <>
                              {" · "}
                              <button
                                onClick={() => {
                                  setSelectedId(mechanic.id);
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
                    );
                  })}
                  {mechanics.length === 0 ? (
                    <tr>
                      <td className="sa-mechanics-empty" colSpan={5}>
                        Belum ada data mekanik.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="sa-mechanics-list-footer">
              <span>
                Menampilkan {mechanics.length} dari {mechanics.length} data
              </span>
              <nav aria-label="Halaman data mekanik">
                <button aria-label="Halaman sebelumnya" disabled type="button">
                  ‹
                </button>
                <span>1</span>
                <button aria-label="Halaman selanjutnya" disabled type="button">
                  ›
                </button>
              </nav>
            </div>
          </ServiceAdvisorPanel>

          <div className="sa-mechanics-right-stack">
            {notice ? (
              <ServiceAdvisorNotice className="sa-mechanics-toast" onDismiss={() => setNotice("")}>
                <span aria-hidden="true" className="sa-mechanics-toast-icon" />
                <span className="sa-mechanics-toast-copy">
                  <strong>{notice.split(". ")[0]}</strong>
                  <span>{notice.split(". ").slice(1).join(". ")}</span>
                </span>
              </ServiceAdvisorNotice>
            ) : null}
            <ServiceAdvisorPanel
              className="sa-mechanics-detail-panel"
              title="Detail Mekanik"
              subtitle={
                selected ? `${selected.displayId} • ${selected.name}` : undefined
              }
            >
              {selected ? (
                <>
                  <div className="sa-mechanics-detail-status">
                    <ServiceAdvisorStatus
                      value={
                        selected.login === "Aktif"
                          ? selected.availability
                          : "Tidak aktif"
                      }
                    />
                  </div>
                  <dl className="sa-mechanics-detail-list">
                    <div>
                      <dt>Nomor telepon</dt>
                      <dd>{selected.phone}</dd>
                    </div>
                    <div>
                      <dt>Keahlian</dt>
                      <dd>Belum tersedia pada data mekanik</dd>
                    </div>
                    <div>
                      <dt>Jadwal kerja</dt>
                      <dd>Belum tersedia pada data mekanik</dd>
                    </div>
                    <div>
                      <dt>Penugasan aktif</dt>
                      <dd>
                        {selected.activeAssignment
                          ? `Servis ${selected.activeAssignment}`
                          : "Tidak ada"}
                      </dd>
                    </div>
                  </dl>
                  <div className="sa-mechanics-detail-actions">
                    {selected.login === "Aktif" ? (
                      <>
                        <button
                          className={saPrimaryButton}
                          onClick={() => {
                            setError("");
                            setDialog("edit");
                          }}
                          type="button"
                        >
                          Ubah
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
                      </>
                    ) : null}
                  </div>
                </>
              ) : (
                <ServiceAdvisorEmpty>Pilih mekanik untuk melihat detail.</ServiceAdvisorEmpty>
              )}
            </ServiceAdvisorPanel>
          </div>
        </div>
      )}

      {dialog === "delete" && selected ? (
        <ServiceAdvisorModal
          className="sa-mechanics-delete-modal"
          backdropClassName="sa-content-modal-backdrop"
          onClose={() => setDialog(null)}
          title="Hapus data mekanik?"
        >
          <p className="sa-mechanics-delete-copy">
            {selected.displayId} • {selected.name} akan dihapus dari daftar mekanik.
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="sa-mechanics-delete-selected">
            <p className="sa-mechanics-delete-label">Data yang dipilih</p>
            <p className="sa-mechanics-delete-value">
              {selected.name} • Keahlian belum tersedia •{" "}
              {selected.login === "Aktif" ? "Aktif" : "Tidak aktif"}
            </p>
          </div>
          <div className="sa-mechanics-delete-notice">
            <ServiceAdvisorNotice
              tone="info"
            >
              <svg
                aria-hidden="true"
                className="sa-mechanics-delete-info-icon"
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
              <span className="sa-mechanics-delete-message">
                <strong>
                  {selected.activeAssignmentCount > 0
                    ? "Tidak dapat dihapus"
                    : "Aman untuk dihapus"}
                </strong>
                <span>
                  {selected.activeAssignmentCount > 0
                    ? "Mekanik masih memiliki penugasan aktif."
                    : "Mekanik tidak memiliki penugasan aktif. Pilih Batal untuk mempertahankan data."}
                </span>
              </span>
            </ServiceAdvisorNotice>
          </div>
          {error ? (
            <div className="mt-3">
              <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice>
            </div>
          ) : null}
          <div className="sa-mechanics-delete-actions">
            <button
              className={saSecondaryButton}
              onClick={() => setDialog(null)}
              type="button"
            >
              Batal
            </button>
            <button
              className="sa-mechanics-delete-confirm"
              disabled={submitting || selected.activeAssignmentCount > 0}
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
