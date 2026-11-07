"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { TransientNotice } from "@/components/notifications/TransientNotice";
import type {
  CustomerServiceRegistrationItem,
  CustomerVehicle,
  ServiceRegistrationDialog,
  ServiceRegistrationView,
} from "@/components/customer/types";
import {
  cancelServiceRegistrationAction,
  createServiceRegistrationAction,
  requestCancelServiceRegistrationAction,
  updateServiceRegistrationAction,
} from "@/app/customer/service-registration/actions";

type ServiceRegistrationManagerProps = {
  initialVehicles: CustomerVehicle[];
  initialServices: CustomerServiceRegistrationItem[];
  preselectedVehicleId?: string;
};

function formatIndoDate(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
  ];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatServiceCode(idServis: string): string {
  const num = parseInt(idServis.replace(/\D/g, "") || "1", 10);
  return `MJS-SRV-${10238 + num}`;
}

function parseServiceDetails(servis: {
  keluhan: string;
  catatan_kedatangan: string | null;
  tanggal_daftar: string;
}) {
  let jenisLayanan = "Servis berkala";
  let keluhanText = servis.keluhan;

  const match = servis.keluhan.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
  if (match) {
    jenisLayanan = match[1];
    keluhanText = match[2];
  }

  let waktuKedatangan = "09.00 WIB";
  if (servis.catatan_kedatangan) {
    const timeMatch = servis.catatan_kedatangan.match(
      /(?:Waktu(?: kedatangan)?:\s*)?([0-9]{1,2}[:.][0-9]{2}(?:\s*WIB)?)/i
    );
    if (timeMatch) {
      waktuKedatangan = timeMatch[1].includes("WIB")
        ? timeMatch[1]
        : `${timeMatch[1]} WIB`;
    } else {
      waktuKedatangan = servis.catatan_kedatangan;
    }
  }

  return { jenisLayanan, keluhanText, waktuKedatangan };
}

function getChipClass(status: string) {
  const s = status.trim().toLowerCase();
  if (s === "diperiksa" || s === "diproses") {
    return { label: "DIKERJAKAN", className: "customer-srv-chip--dikerjakan" };
  }
  if (
    s === "menunggu verifikasi" ||
    s === "menunggu penugasan" ||
    s === "ditugaskan" ||
    s === "siap dikerjakan"
  ) {
    return { label: "TERJADWAL", className: "customer-srv-chip--terjadwal" };
  }
  if (s === "menunggu persetujuan") {
    return { label: "KONFIRMASI", className: "customer-srv-chip--konfirmasi" };
  }
  if (s === "batal") {
    return { label: "BATAL", className: "customer-srv-chip--batal" };
  }
  if (s === "selesai") {
    return { label: "SELESAI", className: "customer-srv-chip--selesai" };
  }
  return { label: status.toUpperCase(), className: "customer-srv-chip--dikerjakan" };
}

export default function ServiceRegistrationManager({
  initialVehicles,
  initialServices,
  preselectedVehicleId,
}: ServiceRegistrationManagerProps) {
  const router = useRouter();
  const [services, setServices] = useState<CustomerServiceRegistrationItem[]>(
    initialServices
  );
  const [vehicles] = useState<CustomerVehicle[]>(initialVehicles);

  const [view, setView] = useState<ServiceRegistrationView>(
    preselectedVehicleId ? "form" : "list"
  );
  const [selectedService, setSelectedService] =
    useState<CustomerServiceRegistrationItem | null>(null);

  // Form State
  const [formVehicleId, setFormVehicleId] = useState<string>(
    preselectedVehicleId || initialVehicles[0]?.id_kendaraan || ""
  );
  const [formJenisLayanan, setFormJenisLayanan] = useState<string>("Pemeriksaan mesin");
  const [formTanggal, setFormTanggal] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [formWaktu, setFormWaktu] = useState<string>("13.00 WIB");
  const [formKeluhan, setFormKeluhan] = useState<string>(
    "Mesin bergetar saat akselerasi dan terdengar suara tidak biasa."
  );

  // Edit Form State
  const [editJenisLayanan, setEditJenisLayanan] = useState<string>("");
  const [editTanggal, setEditTanggal] = useState<string>("");
  const [editWaktu, setEditWaktu] = useState<string>("");
  const [editKeluhan, setEditKeluhan] = useState<string>("");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [dialogState, setDialogState] = useState<ServiceRegistrationDialog>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogActionRef = useRef<HTMLButtonElement>(null);

  // Focus trap and ESC key for dialog
  useEffect(() => {
    if (!dialogState) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogActionRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setDialogState(null);
        setView("list");
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, select, textarea'
        )
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialogState]);

  // Selected vehicle for new registration
  const activeVehicle =
    vehicles.find((v) => v.id_kendaraan === formVehicleId) || vehicles[0];

  function handleStartCreate() {
    setFormVehicleId(vehicles[0]?.id_kendaraan || "");
    setFormJenisLayanan("Pemeriksaan mesin");
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setFormTanggal(d.toISOString().split("T")[0]);
    setFormWaktu("13.00 WIB");
    setFormKeluhan("Mesin bergetar saat akselerasi dan terdengar suara tidak biasa.");
    setFormErrors({});
    setActionError("");
    setView("form");
  }

  function handleValidateForm(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formVehicleId) errors.vehicle = "Pilih kendaraan terlebih dahulu.";
    if (!formJenisLayanan.trim()) errors.jenis = "Jenis layanan wajib diisi.";
    if (!formTanggal.trim()) {
      errors.tanggal = "Tanggal wajib diisi.";
    } else {
      const selected = new Date(formTanggal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        errors.tanggal = "Tanggal tidak boleh di masa lalu.";
      }
    }
    if (!formWaktu.trim()) errors.waktu = "Waktu kedatangan wajib diisi.";
    if (!formKeluhan.trim()) errors.keluhan = "Keluhan wajib diisi.";

    setFormErrors(errors);
    if (Object.keys(errors).length === 0) {
      setView("review");
    }
  }

  async function handleConfirmSubmit() {
    setIsSubmitting(true);
    setActionError("");

    try {
      const res = await createServiceRegistrationAction({
        id_kendaraan: formVehicleId,
        jenis_layanan: formJenisLayanan,
        tanggal_diinginkan: formTanggal,
        waktu_kedatangan: formWaktu,
        keluhan: formKeluhan,
      });

      if (!res.success) {
        setActionError(res.error);
        return;
      }

      // Optimistically add or refresh list
      const newServiceItem: CustomerServiceRegistrationItem = {
        id_servis: res.data.id_servis,
        nomor_antrian: "A-...",
        tanggal_daftar: new Date(formTanggal).toISOString(),
        keluhan: `[${formJenisLayanan}] ${formKeluhan}`,
        catatan_kedatangan: `Waktu kedatangan: ${formWaktu}`,
        status_verifikasi: "Menunggu",
        estimasi_waktu_tunggu: null,
        tanggal_pemeriksaan: null,
        hasil_pemeriksaan: null,
        kebutuhan_servis: null,
        tanggal_mulai: null,
        tanggal_selesai: null,
        status_servis: "Menunggu Verifikasi",
        hasil_servis: null,
        alasan_batal: null,
        id_kendaraan: formVehicleId,
        kendaraan: activeVehicle,
        riwayat_status_servis: [
          {
            id_riwayat: 0,
            tahap: "Pendaftaran diajukan",
            keterangan: "Pendaftaran servis online berhasil diajukan oleh customer",
            waktu: new Date().toISOString(),
          },
        ],
      };

      setServices((prev) => [newServiceItem, ...prev]);
      setDialogState("kirim");
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal mengirim pendaftaran servis."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRead(service: CustomerServiceRegistrationItem) {
    setSelectedService(service);
    setActionError("");
    setView("detail");
  }

  function handleOpenEdit(service: CustomerServiceRegistrationItem) {
    const details = parseServiceDetails(service);
    setSelectedService(service);
    setEditJenisLayanan(details.jenisLayanan);
    setEditTanggal(
      new Date(service.tanggal_daftar).toISOString().split("T")[0]
    );
    setEditWaktu(details.waktuKedatangan);
    setEditKeluhan(details.keluhanText);
    setEditErrors({});
    setActionError("");
    setView("edit");
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!selectedService) return;

    const errors: Record<string, string> = {};
    if (!editJenisLayanan.trim()) errors.jenis = "Jenis layanan wajib diisi.";
    if (!editTanggal.trim()) errors.tanggal = "Tanggal wajib diisi.";
    if (!editWaktu.trim()) errors.waktu = "Waktu kedatangan wajib diisi.";
    if (!editKeluhan.trim()) errors.keluhan = "Keluhan wajib diisi.";

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setActionError("");

    try {
      const res = await updateServiceRegistrationAction(selectedService.id_servis, {
        jenis_layanan: editJenisLayanan,
        tanggal_diinginkan: editTanggal,
        waktu_kedatangan: editWaktu,
        keluhan: editKeluhan,
      });

      if (!res.success) {
        setActionError(res.error);
        return;
      }

      setServices((prev) =>
        prev.map((item) =>
          item.id_servis === selectedService.id_servis
            ? {
                ...item,
                tanggal_daftar: new Date(editTanggal).toISOString(),
                keluhan: `[${editJenisLayanan}] ${editKeluhan}`,
                catatan_kedatangan: `Waktu kedatangan: ${editWaktu}`,
              }
            : item
        )
      );

      setDialogState("ubah");
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal mengubah pendaftaran servis."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenCancelConfirm(service: CustomerServiceRegistrationItem) {
    setSelectedService(service);
    setActionError("");
    setView("cancel-confirm");
  }

  async function handleConfirmCancel() {
    if (!selectedService) return;

    setIsSubmitting(true);
    setActionError("");

    try {
      const res = await cancelServiceRegistrationAction(selectedService.id_servis);
      if (!res.success) {
        setActionError(res.error);
        return;
      }

      setServices((prev) =>
        prev.map((item) =>
          item.id_servis === selectedService.id_servis
            ? {
                ...item,
                status_servis: "Batal",
                alasan_batal: "Dibatalkan oleh customer",
              }
            : item
        )
      );

      setDialogState("batal");
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal membatalkan pendaftaran servis."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestCancel() {
    if (!selectedService) return;

    setIsSubmitting(true);
    setActionError("");

    try {
      const res = await requestCancelServiceRegistrationAction(
        selectedService.id_servis
      );
      if (!res.success) {
        setActionError(res.error);
        return;
      }

      setDialogState("ajukan-batal");
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal mengajukan pembatalan servis."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCloseDialog() {
    setDialogState(null);
    setView("list");
  }

  return (
    <div className="customer-page-content">
      {/* VIEW: LIST (Kelola Pendaftaran Servis) */}
      {view === "list" && (
        <div>
          <p className="customer-eyebrow">AREA CUSTOMER</p>
          <div className="customer-srv-header">
            <h1 className="customer-page-title">Kelola Pendaftaran Servis</h1>
            <button
              className="customer-srv-create-btn"
              onClick={handleStartCreate}
              type="button"
            >
              Buat Pendaftaran
            </button>
          </div>

          {actionError && (
            <TransientNotice className="customer-form-error" onDismiss={() => setActionError("")} role="alert" style={{ marginBottom: 20 }}>
              {actionError}
            </TransientNotice>
          )}

          {services.length === 0 ? (
            <section className="customer-srv-panel" style={{ textAlign: "center" }}>
              <h2 className="customer-srv-panel-title">Belum ada pendaftaran servis</h2>
              <p style={{ color: "#6B6A80", fontSize: 16, marginBottom: 24 }}>
                Anda belum memiliki riwayat pendaftaran servis kendaraan.
              </p>
              <button
                className="customer-srv-create-btn"
                onClick={handleStartCreate}
                type="button"
              >
                Buat Pendaftaran
              </button>
            </section>
          ) : (
            <div className="customer-srv-list">
              {services.map((item) => {
                const chip = getChipClass(item.status_servis);
                const details = parseServiceDetails(item);
                const canModify = [
                  "Menunggu Verifikasi",
                  "Menunggu Penugasan",
                  "Ditugaskan",
                  "Siap Dikerjakan",
                ].includes(item.status_servis);
                const isFinishedOrCanceled =
                  item.status_servis === "Selesai" || item.status_servis === "Batal";

                return (
                  <article className="customer-srv-card" key={item.id_servis}>
                    <div className="customer-srv-card-left">
                      <h2 className="customer-srv-card-title">
                        {item.kendaraan.merek} {item.kendaraan.tipe_kendaraan} •{" "}
                        {item.kendaraan.nomor_plat}
                      </h2>
                      <p className="customer-srv-card-subtitle">
                        {formatIndoDate(item.tanggal_daftar)} • {details.jenisLayanan}
                      </p>
                    </div>

                    <div className="customer-srv-card-right">
                      <span className={`customer-srv-chip ${chip.className}`}>
                        {chip.label}
                      </span>
                      <div className="customer-srv-actions">
                        <button
                          className="customer-srv-btn-read"
                          onClick={() => handleRead(item)}
                          title="Lihat detail pendaftaran"
                          type="button"
                        >
                          <svg
                            fill="none"
                            height="14"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            viewBox="0 0 18 14"
                            width="18"
                          >
                            <path d="M0.75 6.58C0.75 6.58 3.67 0.75 9.08 0.75C14.5 0.75 17.42 6.58 17.42 6.58C17.42 6.58 14.5 12.42 9.08 12.42C3.67 12.42 0.75 6.58 0.75 6.58Z" />
                            <path d="M11.58 6.58C11.58 7.96 10.46 9.08 9.08 9.08C7.7 9.08 6.58 7.96 6.58 6.58C6.58 5.2 7.7 4.08 9.08 4.08C10.46 4.08 11.58 5.2 11.58 6.58Z" />
                          </svg>
                          <span>Read</span>
                        </button>

                        {canModify && (
                          <button
                            className="customer-srv-btn-update"
                            onClick={() => handleOpenEdit(item)}
                            title="Ubah pendaftaran servis"
                            type="button"
                          >
                            <svg
                              fill="none"
                              height="15"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              viewBox="0 0 15 15"
                              width="15"
                            >
                              <path d="M1 10.5L10.5 1L14 4.5L4.5 14H1V10.5Z" />
                              <path d="M9 2.5L12.5 6" />
                            </svg>
                            <span>Update</span>
                          </button>
                        )}

                        {!isFinishedOrCanceled && (
                          <button
                            className="customer-srv-btn-delete"
                            onClick={() => {
                              if (canModify) {
                                handleOpenCancelConfirm(item);
                              } else {
                                handleRead(item);
                              }
                            }}
                            title={
                              canModify
                                ? "Batalkan pendaftaran servis"
                                : "Ajukan pembatalan servis"
                            }
                            type="button"
                          >
                            <svg
                              fill="none"
                              height="16"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              viewBox="0 0 15 16"
                              width="15"
                            >
                              <path d="M1 3.5H2M2 3.5H5.5M2 3.5L3 15H13L14 3.5M5.5 3.5H10.5M5.5 3.5V1H10.5V3.5M10.5 3.5H14M6 7V12M10 7V12" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: FORM (Pendaftaran Servis & Keluhan) */}
      {view === "form" && (
        <div>
          <p className="customer-eyebrow">AREA CUSTOMER</p>
          <h1 className="customer-page-title" style={{ marginBottom: 28 }}>
            Pendaftaran Servis & Keluhan
          </h1>

          <form className="customer-srv-panel" onSubmit={handleValidateForm}>
            <h2 className="customer-srv-panel-title">Informasi pendaftaran</h2>

            {actionError && (
              <TransientNotice className="customer-form-error" onDismiss={() => setActionError("")} role="alert" style={{ marginBottom: 20 }}>
                {actionError}
              </TransientNotice>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 34,
              }}
            >
              <div className="customer-srv-field">
                <label className="customer-srv-label" htmlFor="field-vehicle">
                  Pilih kendaraan
                </label>
                {vehicles.length > 0 ? (
                  <select
                    className="customer-srv-select"
                    id="field-vehicle"
                    onChange={(e) => setFormVehicleId(e.target.value)}
                    value={formVehicleId}
                  >
                    {vehicles.map((v) => (
                      <option key={v.id_kendaraan} value={v.id_kendaraan}>
                        {v.merek} {v.tipe_kendaraan} • {v.nomor_plat}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="customer-srv-readonly" style={{ color: "#B01F2B" }}>
                    Belum ada kendaraan terdaftar. Silakan tambah di Data Kendaraan.
                  </div>
                )}
                {formErrors.vehicle && (
                  <p className="customer-srv-error">{formErrors.vehicle}</p>
                )}
              </div>

              <div className="customer-srv-field">
                <label className="customer-srv-label" htmlFor="field-jenis">
                  Jenis layanan
                </label>
                <input
                  className="customer-srv-input"
                  id="field-jenis"
                  onChange={(e) => setFormJenisLayanan(e.target.value)}
                  placeholder="Pemeriksaan mesin"
                  type="text"
                  value={formJenisLayanan}
                />
                {formErrors.jenis && (
                  <p className="customer-srv-error">{formErrors.jenis}</p>
                )}
              </div>

              <div className="customer-srv-field">
                <label className="customer-srv-label" htmlFor="field-tanggal">
                  Tanggal yang diinginkan
                </label>
                <input
                  className="customer-srv-input"
                  id="field-tanggal"
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  type="date"
                  value={formTanggal}
                />
                {formErrors.tanggal && (
                  <p className="customer-srv-error">{formErrors.tanggal}</p>
                )}
              </div>

              <div className="customer-srv-field">
                <label className="customer-srv-label" htmlFor="field-waktu">
                  Waktu kedatangan
                </label>
                <input
                  className="customer-srv-input"
                  id="field-waktu"
                  onChange={(e) => setFormWaktu(e.target.value)}
                  placeholder="13.00 WIB"
                  type="text"
                  value={formWaktu}
                />
                {formErrors.waktu && (
                  <p className="customer-srv-error">{formErrors.waktu}</p>
                )}
              </div>
            </div>

            <div className="customer-srv-field" style={{ marginTop: 24 }}>
              <label className="customer-srv-label" htmlFor="field-keluhan">
                Keluhan / catatan untuk mekanik
              </label>
              <textarea
                className="customer-srv-textarea"
                id="field-keluhan"
                onChange={(e) => setFormKeluhan(e.target.value)}
                placeholder="Mesin bergetar saat akselerasi dan terdengar suara tidak biasa."
                value={formKeluhan}
              />
              <p className="customer-srv-hint">
                Contoh: suara berdecit saat mengerem sejak minggu lalu.
              </p>
              {formErrors.keluhan && (
                <p className="customer-srv-error">{formErrors.keluhan}</p>
              )}
            </div>

            <p className="customer-srv-info">
              Kami mengonfirmasi jadwal melalui nomor telepon terdaftar.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 32,
              }}
            >
              <button
                className="customer-srv-btn-read"
                onClick={() => setView("list")}
                style={{ minWidth: 140, height: 52 }}
                type="button"
              >
                Kembali
              </button>
              <button
                className="customer-srv-btn-read"
                disabled={vehicles.length === 0}
                style={{ width: 238, height: 52 }}
                type="submit"
              >
                Periksa pendaftaran
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: REVIEW (Periksa pendaftaran) */}
      {view === "review" && (
        <div>
          <p className="customer-eyebrow">AREA CUSTOMER</p>
          <h1 className="customer-page-title" style={{ marginBottom: 28 }}>
            Periksa pendaftaran
          </h1>

          <section className="customer-srv-panel">
            <h2 className="customer-srv-panel-title">Ringkasan pendaftaran</h2>

            {actionError && (
              <TransientNotice className="customer-form-error" onDismiss={() => setActionError("")} role="alert" style={{ marginBottom: 20 }}>
                {actionError}
              </TransientNotice>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 34,
              }}
            >
              <div className="customer-srv-field">
                <span className="customer-srv-label">Kendaraan</span>
                <div className="customer-srv-readonly">
                  {activeVehicle
                    ? `${activeVehicle.merek} ${activeVehicle.tipe_kendaraan} • ${activeVehicle.nomor_plat}`
                    : "-"}
                </div>
              </div>

              <div className="customer-srv-field">
                <span className="customer-srv-label">Jadwal</span>
                <div className="customer-srv-readonly">
                  {formatIndoDate(formTanggal)} • {formWaktu}
                </div>
              </div>

              <div className="customer-srv-field" style={{ gridColumn: "1 / -1" }}>
                <span className="customer-srv-label">Jenis layanan</span>
                <div className="customer-srv-readonly">{formJenisLayanan}</div>
              </div>

              <div className="customer-srv-field" style={{ gridColumn: "1 / -1" }}>
                <span className="customer-srv-label">Keluhan</span>
                <div
                  className="customer-srv-readonly"
                  style={{ minHeight: 90, alignItems: "flex-start" }}
                >
                  {formKeluhan}
                </div>
              </div>
            </div>

            <p className="customer-srv-info">
              Pendaftaran akan diteruskan ke bengkel untuk konfirmasi jadwal.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 32,
              }}
            >
              <button
                className="customer-srv-btn-read"
                disabled={isSubmitting}
                onClick={() => setView("form")}
                style={{ width: 186, height: 52 }}
                type="button"
              >
                Kembali mengubah
              </button>
              <button
                className="customer-srv-create-btn"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                style={{ width: 228, height: 52 }}
                type="button"
              >
                {isSubmitting ? "Mengirim..." : "Konfirmasi & kirim"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* VIEW: DETAIL (Detail pendaftaran servis) */}
      {view === "detail" && selectedService && (
        <div>
          <p className="customer-eyebrow">AREA CUSTOMER</p>
          <h1 className="customer-page-title" style={{ marginBottom: 28 }}>
            Detail pendaftaran servis
          </h1>

          {actionError && (
            <TransientNotice className="customer-form-error" onDismiss={() => setActionError("")} role="alert" style={{ marginBottom: 20 }}>
              {actionError}
            </TransientNotice>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 26,
            }}
          >
            {/* Left Card: Kendaraan & jadwal */}
            <section className="customer-srv-panel">
              <h2 className="customer-srv-panel-title">Kendaraan & jadwal</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                  marginBottom: 18,
                }}
              >
                <div className="customer-srv-field">
                  <span className="customer-srv-label">Kendaraan</span>
                  <div className="customer-srv-readonly">
                    {selectedService.kendaraan.merek}{" "}
                    {selectedService.kendaraan.tipe_kendaraan}
                  </div>
                </div>

                <div className="customer-srv-field">
                  <span className="customer-srv-label">Nomor pelat</span>
                  <div className="customer-srv-readonly">
                    {selectedService.kendaraan.nomor_plat}
                  </div>
                </div>
              </div>

              {(() => {
                const details = parseServiceDetails(selectedService);
                const chip = getChipClass(selectedService.status_servis);

                return (
                  <>
                    <div className="customer-srv-field" style={{ marginBottom: 18 }}>
                      <span className="customer-srv-label">Jadwal servis</span>
                      <div className="customer-srv-readonly">
                        {formatIndoDate(selectedService.tanggal_daftar)} •{" "}
                        {details.waktuKedatangan}
                      </div>
                    </div>

                    <div className="customer-srv-field" style={{ marginBottom: 24 }}>
                      <span className="customer-srv-label">Jenis layanan</span>
                      <div className="customer-srv-readonly">
                        {details.jenisLayanan}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginTop: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#6B6A80",
                          letterSpacing: "0.08em",
                        }}
                      >
                        STATUS SERVIS
                      </span>
                      <span className={`customer-srv-chip ${chip.className}`}>
                        {chip.label}
                      </span>
                    </div>
                  </>
                );
              })()}
            </section>

            {/* Right Card: Keluhan customer */}
            <section className="customer-srv-panel">
              <h2 className="customer-srv-panel-title">Keluhan customer</h2>
              {(() => {
                const details = parseServiceDetails(selectedService);
                const mechanicNote =
                  selectedService.kebutuhan_servis ||
                  selectedService.hasil_pemeriksaan ||
                  "Pemeriksaan kampas rem dijadwalkan.";

                return (
                  <>
                    <p
                      style={{
                        fontSize: 17,
                        color: "#0B0A1E",
                        lineHeight: "26px",
                        minHeight: 80,
                        margin: 0,
                      }}
                    >
                      {details.keluhanText}
                    </p>

                    <div
                      style={{
                        borderTop: "1px solid #E5E4F0",
                        margin: "24px 0",
                      }}
                    />

                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#6B6A80",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      CATATAN MEKANIK
                    </span>

                    <p style={{ fontSize: 16, color: "#6B6A80", margin: 0, lineHeight: "24px" }}>
                      {mechanicNote}
                    </p>
                  </>
                );
              })()}
            </section>
          </div>

          {/* Action buttons below cards */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 28,
            }}
          >
            {(() => {
              const canModify = [
                "Menunggu Verifikasi",
                "Menunggu Penugasan",
                "Ditugaskan",
                "Siap Dikerjakan",
              ].includes(selectedService.status_servis);
              const isWorking = ["Diperiksa", "Diproses"].includes(
                selectedService.status_servis
              );
              const isFinishedOrCanceled =
                selectedService.status_servis === "Selesai" ||
                selectedService.status_servis === "Batal";

              return (
                <>
                  <div>
                    {canModify && (
                      <button
                        className="customer-srv-btn-read"
                        onClick={() => handleOpenEdit(selectedService)}
                        style={{ height: 52, padding: "0 24px" }}
                        type="button"
                      >
                        Ubah pendaftaran
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 16 }}>
                    {!isFinishedOrCanceled && (
                      <button
                        className="customer-srv-create-btn"
                        disabled={isSubmitting}
                        onClick={() => {
                          if (canModify) {
                            handleOpenCancelConfirm(selectedService);
                          } else if (isWorking) {
                            handleRequestCancel();
                          }
                        }}
                        style={{
                          width: 216,
                          height: 52,
                          backgroundColor: canModify ? "#B01F2B" : "#493CDF",
                        }}
                        type="button"
                      >
                        {isSubmitting
                          ? "Memproses..."
                          : canModify
                          ? "Batalkan pendaftaran"
                          : "Ajukan pembatalan"}
                      </button>
                    )}

                    <button
                      className="customer-srv-btn-read"
                      onClick={() => setView("list")}
                      style={{ width: 153, height: 52 }}
                      type="button"
                    >
                      Kembali
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* VIEW: EDIT (Ubah pendaftaran servis) */}
      {view === "edit" && selectedService && (
        <div>
          <p className="customer-eyebrow">AREA CUSTOMER</p>
          <h1 className="customer-page-title" style={{ marginBottom: 28 }}>
            Ubah pendaftaran servis
          </h1>

          <form
            className="customer-srv-panel customer-srv-panel--narrow"
            onSubmit={handleSaveEdit}
          >
            <h2 className="customer-srv-panel-title">
              Formulir perubahan pendaftaran
            </h2>

            {actionError && (
              <TransientNotice className="customer-form-error" onDismiss={() => setActionError("")} role="alert" style={{ marginBottom: 20 }}>
                {actionError}
              </TransientNotice>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 28,
              }}
            >
              <div className="customer-srv-field">
                <span className="customer-srv-label">Kendaraan</span>
                <div className="customer-srv-readonly">
                  {selectedService.kendaraan.merek}{" "}
                  {selectedService.kendaraan.tipe_kendaraan} •{" "}
                  {selectedService.kendaraan.nomor_plat}
                </div>
              </div>

              <div className="customer-srv-field">
                <label className="customer-srv-label" htmlFor="edit-tanggal">
                  Jadwal servis
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    className="customer-srv-input"
                    id="edit-tanggal"
                    onChange={(e) => setEditTanggal(e.target.value)}
                    type="date"
                    value={editTanggal}
                  />
                  <input
                    className="customer-srv-input"
                    onChange={(e) => setEditWaktu(e.target.value)}
                    placeholder="09.00"
                    style={{ width: 130 }}
                    type="text"
                    value={editWaktu}
                  />
                </div>
                {editErrors.tanggal && (
                  <p className="customer-srv-error">{editErrors.tanggal}</p>
                )}
                {editErrors.waktu && (
                  <p className="customer-srv-error">{editErrors.waktu}</p>
                )}
              </div>

              <div className="customer-srv-field" style={{ gridColumn: "1 / -1" }}>
                <label className="customer-srv-label" htmlFor="edit-jenis">
                  Jenis layanan
                </label>
                <input
                  className="customer-srv-input"
                  id="edit-jenis"
                  onChange={(e) => setEditJenisLayanan(e.target.value)}
                  type="text"
                  value={editJenisLayanan}
                />
                {editErrors.jenis && (
                  <p className="customer-srv-error">{editErrors.jenis}</p>
                )}
              </div>

              <div className="customer-srv-field" style={{ gridColumn: "1 / -1" }}>
                <label className="customer-srv-label" htmlFor="edit-keluhan">
                  Keluhan / catatan mekanik
                </label>
                <textarea
                  className="customer-srv-textarea"
                  id="edit-keluhan"
                  onChange={(e) => setEditKeluhan(e.target.value)}
                  value={editKeluhan}
                />
                {editErrors.keluhan && (
                  <p className="customer-srv-error">{editErrors.keluhan}</p>
                )}
              </div>
            </div>

            <p className="customer-srv-info">
              Perubahan divalidasi oleh sistem sebelum disimpan.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 32,
              }}
            >
              <button
                className="customer-srv-btn-read"
                disabled={isSubmitting}
                onClick={() => setView("detail")}
                style={{ width: 184, height: 52 }}
                type="button"
              >
                Kembali
              </button>
              <button
                className="customer-srv-create-btn"
                disabled={isSubmitting}
                style={{ width: 198, height: 52 }}
                type="submit"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan perubahan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: CANCEL CONFIRM (Konfirmasi pembatalan pendaftaran) */}
      {view === "cancel-confirm" && selectedService && (
        <div>
          <p className="customer-eyebrow">AREA CUSTOMER</p>
          <h1 className="customer-page-title" style={{ marginBottom: 28 }}>
            Konfirmasi pembatalan pendaftaran
          </h1>

          <section className="customer-srv-panel customer-srv-panel--narrow">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h2 className="customer-srv-panel-title" style={{ margin: 0 }}>
                Batalkan pendaftaran servis?
              </h2>
              <span className="customer-srv-chip customer-srv-chip--konfirmasi">
                KONFIRMASI
              </span>
            </div>

            {actionError && (
              <TransientNotice className="customer-form-error" onDismiss={() => setActionError("")} role="alert" style={{ marginBottom: 20 }}>
                {actionError}
              </TransientNotice>
            )}

            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#0B0A1E",
                margin: "24px 0 10px",
                lineHeight: "36px",
              }}
            >
              {formatServiceCode(selectedService.id_servis)} •{" "}
              {selectedService.kendaraan.merek}{" "}
              {selectedService.kendaraan.tipe_kendaraan} •{" "}
              {selectedService.kendaraan.nomor_plat}
            </p>

            <p style={{ fontSize: 17, color: "#6B6A80", margin: 0 }}>
              Jadwal dan keluhan akan dibatalkan.
            </p>

            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                marginTop: 36,
              }}
            >
              <button
                className="customer-srv-btn-read"
                disabled={isSubmitting}
                onClick={() => setView("list")}
                style={{ minWidth: 180, height: 52 }}
                type="button"
              >
                Tidak, kembali
              </button>
              <button
                className="customer-srv-btn-delete"
                disabled={isSubmitting}
                onClick={handleConfirmCancel}
                style={{
                  minWidth: 240,
                  height: 52,
                  backgroundColor: "#B01F2B",
                  borderColor: "#B01F2B",
                  color: "#ffffff",
                }}
                type="button"
              >
                {isSubmitting ? "Membatalkan..." : "Ya, batalkan pendaftaran"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* DIALOG SUKSES (4 VARIAN) */}
      {dialogState && (
        <div
          className="customer-srv-dialog-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDialog();
          }}
          role="dialog"
        >
          <div
            aria-labelledby="srv-dialog-title"
            aria-modal="true"
            className="customer-srv-dialog-box"
            ref={dialogRef}
          >
            <button
              aria-label="Tutup dialog"
              className="customer-srv-dialog-close"
              onClick={handleCloseDialog}
              type="button"
            >
              ✕
            </button>

            <div className="customer-srv-dialog-icon">
              <svg
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                width="24"
              >
                <path d="M20 6L9 17L4 12" />
              </svg>
            </div>

            {dialogState === "kirim" && (
              <>
                <h2 className="customer-srv-dialog-title" id="srv-dialog-title">
                  Pendaftaran berhasil dikirim
                </h2>
                <p className="customer-srv-dialog-desc">
                  Permintaan servis sudah dikirim. Bengkel akan menghubungi Anda
                  untuk konfirmasi jadwal.
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 36,
                  }}
                >
                  <button
                    className="customer-srv-dialog-btn"
                    onClick={handleCloseDialog}
                    ref={dialogActionRef}
                    type="button"
                  >
                    Lihat daftar servis
                  </button>
                </div>
              </>
            )}

            {dialogState === "ubah" && (
              <>
                <h2 className="customer-srv-dialog-title" id="srv-dialog-title">
                  Pendaftaran berhasil diperbarui
                </h2>
                <p className="customer-srv-dialog-desc">
                  Perubahan pendaftaran servis berhasil disimpan.
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 48,
                  }}
                >
                  <button
                    className="customer-srv-dialog-btn"
                    onClick={handleCloseDialog}
                    ref={dialogActionRef}
                    type="button"
                  >
                    Selesai
                  </button>
                </div>
              </>
            )}

            {dialogState === "batal" && (
              <>
                <h2 className="customer-srv-dialog-title" id="srv-dialog-title">
                  Pendaftaran berhasil dibatalkan
                </h2>
                <p className="customer-srv-dialog-desc">
                  Pendaftaran servis sudah dibatalkan. Daftar pendaftaran telah
                  diperbarui.
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 48,
                  }}
                >
                  <button
                    className="customer-srv-dialog-btn"
                    onClick={handleCloseDialog}
                    ref={dialogActionRef}
                    type="button"
                  >
                    Selesai
                  </button>
                </div>
              </>
            )}

            {dialogState === "ajukan-batal" && (
              <>
                <h2 className="customer-srv-dialog-title" id="srv-dialog-title">
                  Pengajuan pembatalan dikirim
                </h2>
                <p className="customer-srv-dialog-desc">
                  Permintaan pembatalan telah dikirim ke Service Advisor untuk
                  diverifikasi.
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 48,
                  }}
                >
                  <button
                    className="customer-srv-dialog-btn"
                    onClick={handleCloseDialog}
                    ref={dialogActionRef}
                    type="button"
                  >
                    Selesai
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
