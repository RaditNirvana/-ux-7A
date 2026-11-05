"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import type { CustomerVehicle } from "@/components/customer/types";

type VehicleManagerProps = {
  initialVehicles: CustomerVehicle[];
};

type VehicleScreen = "list" | "detail" | "create" | "edit" | "delete";

type ApiResult = {
  message?: string;
  vehicle?: CustomerVehicle;
};

function isVehicle(value: unknown): value is CustomerVehicle {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id_kendaraan === "string" &&
    typeof record.merek === "string" &&
    typeof record.tipe_kendaraan === "string" &&
    typeof record.tahun_kendaraan === "number" &&
    typeof record.nomor_plat === "string" &&
    (typeof record.nomor_rangka === "string" || record.nomor_rangka === null) &&
    (typeof record.kilometer === "number" || record.kilometer === null)
  );
}

async function readApiResult(response: Response): Promise<ApiResult> {
  const result: unknown = await response.json();

  if (typeof result !== "object" || result === null) {
    throw new Error("Respons server tidak valid.");
  }

  const record = result as Record<string, unknown>;

  return {
    message:
      typeof record.message === "string" ? record.message : undefined,
    vehicle: isVehicle(record.vehicle) ? record.vehicle : undefined,
  };
}

function vehicleLabel(vehicle: CustomerVehicle) {
  return `${vehicle.merek} ${vehicle.tipe_kendaraan} • ${vehicle.nomor_plat}`;
}

function sortedVehicles(vehicles: CustomerVehicle[]) {
  return [...vehicles].sort((a, b) =>
    a.id_kendaraan.localeCompare(b.id_kendaraan),
  );
}

export default function VehicleManager({
  initialVehicles,
}: VehicleManagerProps) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [screen, setScreen] = useState<VehicleScreen>("list");
  const [selectedVehicle, setSelectedVehicle] =
    useState<CustomerVehicle | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogActionRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogActionRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSuccessMessage("");
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [successMessage]);

  function openVehicleScreen(
    nextScreen: VehicleScreen,
    vehicle?: CustomerVehicle,
  ) {
    setSelectedVehicle(vehicle ?? null);
    setErrorMessage("");
    setScreen(nextScreen);
  }

  function updateVehicleList(vehicle: CustomerVehicle) {
    setVehicles((current) =>
      sortedVehicles([
        ...current.filter(
          (existing) => existing.id_kendaraan !== vehicle.id_kendaraan,
        ),
        vehicle,
      ]),
    );
    setSelectedVehicle(vehicle);
  }

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const kilometerValue = String(formData.get("kilometer") ?? "").trim();
    const payload = {
      merek: String(formData.get("merek") ?? ""),
      tipe_kendaraan: String(formData.get("tipe_kendaraan") ?? ""),
      tahun_kendaraan: Number(formData.get("tahun_kendaraan")),
      nomor_plat: String(formData.get("nomor_plat") ?? ""),
      nomor_rangka: String(formData.get("nomor_rangka") ?? ""),
      kilometer: kilometerValue ? Number(kilometerValue) : null,
    };

    try {
      const isEditing = screen === "edit" && selectedVehicle;
      const response = await fetch(
        isEditing
          ? `/api/customer/vehicles/${selectedVehicle.id_kendaraan}`
          : "/api/customer/vehicles",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await readApiResult(response);

      if (!response.ok || !result.vehicle) {
        setErrorMessage(
          result.message ?? "Kendaraan belum dapat disimpan.",
        );
        return;
      }

      updateVehicleList(result.vehicle);
      setScreen("list");
      setSuccessMessage(
        isEditing
          ? "Data kendaraan berhasil diperbarui"
          : "Kendaraan berhasil ditambahkan",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kendaraan belum dapat disimpan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteVehicle() {
    if (!selectedVehicle) {
      setErrorMessage("Pilih kendaraan yang akan dihapus.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/customer/vehicles/${selectedVehicle.id_kendaraan}`,
        { method: "DELETE" },
      );
      const result = await readApiResult(response);

      if (!response.ok) {
        setErrorMessage(result.message ?? "Kendaraan belum dapat dihapus.");
        return;
      }

      setVehicles((current) =>
        current.filter(
          (vehicle) => vehicle.id_kendaraan !== selectedVehicle.id_kendaraan,
        ),
      );
      setScreen("list");
      setSuccessMessage("Kendaraan berhasil dihapus");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kendaraan belum dapat dihapus.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (screen === "create" || screen === "edit") {
    return (
      <VehicleForm
        errorMessage={errorMessage}
        isEditing={screen === "edit"}
        isSubmitting={isSubmitting}
        onCancel={() => setScreen("list")}
        onSubmit={saveVehicle}
        vehicle={screen === "edit" ? selectedVehicle : null}
      />
    );
  }

  if (screen === "detail") {
    return selectedVehicle ? (
      <VehicleDetail
        errorMessage={errorMessage}
        onBack={() => setScreen("list")}
        onDelete={() => openVehicleScreen("delete", selectedVehicle)}
        onEdit={() => openVehicleScreen("edit", selectedVehicle)}
        vehicle={selectedVehicle}
      />
    ) : (
      <VehicleList
        errorMessage="Kendaraan tidak ditemukan."
        onCreate={() => openVehicleScreen("create")}
        onSelect={openVehicleScreen}
        vehicles={vehicles}
      />
    );
  }

  if (screen === "delete" && selectedVehicle) {
    return (
      <DeleteConfirmation
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onCancel={() => setScreen("list")}
        onConfirm={deleteVehicle}
        vehicle={selectedVehicle}
      />
    );
  }

  return (
    <>
      <VehicleList
        errorMessage={errorMessage}
        onCreate={() => openVehicleScreen("create")}
        onSelect={openVehicleScreen}
        vehicles={vehicles}
      />
      {successMessage && (
        <SuccessDialog
          actionRef={dialogActionRef}
          dialogRef={dialogRef}
          message={successMessage}
          onClose={() => setSuccessMessage("")}
        />
      )}
    </>
  );
}

function VehicleList({
  vehicles,
  errorMessage,
  onCreate,
  onSelect,
}: {
  vehicles: CustomerVehicle[];
  errorMessage: string;
  onCreate: () => void;
  onSelect: (
    screen: VehicleScreen,
    vehicle?: CustomerVehicle,
  ) => void;
}) {
  return (
    <div className="customer-page-content">
      <p className="customer-eyebrow">AREA CUSTOMER</p>
      <h1 className="customer-page-title">Data kendaraan</h1>

      <section
        aria-labelledby="customer-vehicle-list-title"
        className="customer-vehicle-list-panel"
      >
        <div className="customer-vehicle-list-heading">
          <h2 id="customer-vehicle-list-title">
            Daftar kendaraan ({vehicles.length})
          </h2>
          <button
            className="customer-primary-button customer-add-vehicle"
            onClick={onCreate}
            type="button"
          >
            <Image
              alt=""
              height={20}
              src="/figma-assets/customer-vehicle-add.svg"
              width={20}
            />
            Tambah Kendaraan
          </button>
        </div>

        {errorMessage && (
          <p className="customer-form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {vehicles.length > 0 ? (
          <div className="customer-vehicle-rows">
            {vehicles.map((vehicle, index) => (
              <article
                className="customer-vehicle-row"
                key={vehicle.id_kendaraan}
              >
                <div className="customer-vehicle-summary">
                  <h3>{vehicleLabel(vehicle)}</h3>
                  <p>
                    {vehicle.tahun_kendaraan} • Nomor rangka{" "}
                    {vehicle.nomor_rangka || "Belum diisi"}
                  </p>
                  <span className="customer-vehicle-badge">
                    {index === 0 ? "KENDARAAN UTAMA" : "KENDARAAN"}
                  </span>
                </div>
                <div className="customer-vehicle-actions">
                  <button
                    className="customer-outline-button"
                    onClick={() => onSelect("detail", vehicle)}
                    type="button"
                  >
                    <Image
                      alt=""
                      height={20}
                      src="/figma-assets/customer-vehicle-view.svg"
                      width={20}
                    />
                    Read
                  </button>
                  <button
                    className="customer-outline-button"
                    onClick={() => onSelect("edit", vehicle)}
                    type="button"
                  >
                    <Image
                      alt=""
                      height={20}
                      src="/figma-assets/customer-vehicle-edit.svg"
                      width={20}
                    />
                    Update
                  </button>
                  <button
                    className="customer-outline-button customer-outline-button--danger"
                    onClick={() => onSelect("delete", vehicle)}
                    type="button"
                  >
                    <Image
                      alt=""
                      height={20}
                      src="/figma-assets/customer-vehicle-delete.svg"
                      width={20}
                    />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="customer-vehicle-empty">
            <h3>Belum ada kendaraan</h3>
            <p>Tambahkan kendaraan untuk mulai mengelola datanya.</p>
          </div>
        )}
      </section>

      <Link
        className="customer-back-dashboard"
        href="/customer/dashboard"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}

function VehicleForm({
  vehicle,
  isEditing,
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: {
  vehicle: CustomerVehicle | null;
  isEditing: boolean;
  isSubmitting: boolean;
  errorMessage: string;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="customer-page-content">
      <p className="customer-eyebrow">AREA CUSTOMER</p>
      <h1 className="customer-page-title">
        {isEditing ? "Edit data kendaraan" : "Tambah kendaraan"}
      </h1>
      {!isEditing && (
        <p className="customer-page-subtitle">
          Masukkan data sesuai dokumen kendaraan.
        </p>
      )}

      <form className="customer-vehicle-form-panel" onSubmit={onSubmit}>
        <h2>Formulir kendaraan</h2>
        <div className="customer-form-grid customer-form-grid--three">
          <label className="customer-field">
            <span>Merek</span>
            <input
              autoComplete="off"
              defaultValue={vehicle?.merek ?? ""}
              maxLength={50}
              name="merek"
              required
            />
          </label>
          <label className="customer-field">
            <span>Tipe / model</span>
            <input
              autoComplete="off"
              defaultValue={vehicle?.tipe_kendaraan ?? ""}
              maxLength={50}
              name="tipe_kendaraan"
              required
            />
          </label>
          <label className="customer-field">
            <span>Tahun</span>
            <input
              defaultValue={vehicle?.tahun_kendaraan ?? ""}
              max={2100}
              min={1980}
              name="tahun_kendaraan"
              required
              type="number"
            />
          </label>
        </div>
        <div className="customer-form-grid customer-form-grid--two">
          <label className="customer-field">
            <span>Nomor pelat</span>
            <input
              autoComplete="off"
              defaultValue={vehicle?.nomor_plat ?? ""}
              maxLength={15}
              name="nomor_plat"
              required
            />
          </label>
          <label className="customer-field">
            <span>Nomor rangka</span>
            <input
              autoComplete="off"
              defaultValue={vehicle?.nomor_rangka ?? ""}
              maxLength={30}
              name="nomor_rangka"
            />
          </label>
        </div>
        <input
          name="kilometer"
          type="hidden"
          value={vehicle?.kilometer ?? ""}
        />
        {!isEditing && (
          <p className="customer-form-note">
            Data kendaraan akan tersimpan pada akun customer Anda.
          </p>
        )}
        {errorMessage && (
          <p className="customer-form-error" role="alert">
            {errorMessage}
          </p>
        )}
        <div className="customer-form-actions">
          <button
            className="customer-outline-button customer-form-back"
            onClick={onCancel}
            type="button"
          >
            {isEditing ? "Kembali ke data" : "Kembali"}
          </button>
          <button
            className="customer-primary-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? "Menyimpan..."
              : isEditing
                ? "Simpan perubahan"
                : "Simpan kendaraan"}
          </button>
        </div>
      </form>
    </div>
  );
}

function VehicleDetail({
  vehicle,
  errorMessage,
  onBack,
  onEdit,
  onDelete,
}: {
  vehicle: CustomerVehicle;
  errorMessage: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="customer-page-content">
      <p className="customer-eyebrow">AREA CUSTOMER</p>
      <h1 className="customer-page-title">Detail kendaraan</h1>

      <section className="customer-vehicle-active-card">
        <div>
          <p>KENDARAAN AKTIF</p>
          <h2>{vehicleLabel(vehicle)}</h2>
        </div>
        <span className="customer-vehicle-badge">KENDARAAN UTAMA</span>
      </section>

      <section
        aria-labelledby="customer-vehicle-details-title"
        className="customer-vehicle-detail-panel"
      >
        <h2 id="customer-vehicle-details-title">Detail kendaraan</h2>
        <div className="customer-form-grid customer-form-grid--three">
          <ReadOnlyField label="Merek" value={vehicle.merek} />
          <ReadOnlyField label="Tipe / model" value={vehicle.tipe_kendaraan} />
          <ReadOnlyField
            label="Tahun"
            value={String(vehicle.tahun_kendaraan)}
          />
        </div>
        <div className="customer-form-grid customer-form-grid--two">
          <ReadOnlyField label="Nomor pelat" value={vehicle.nomor_plat} />
          <ReadOnlyField
            label="Nomor rangka"
            value={vehicle.nomor_rangka || "Belum diisi"}
          />
        </div>
        <p className="customer-vehicle-detail-note">
          Terdaftar di akun customer
        </p>
        {errorMessage && (
          <p className="customer-form-error" role="alert">
            {errorMessage}
          </p>
        )}
        <div className="customer-detail-actions">
          <button
            className="customer-outline-button"
            onClick={onEdit}
            type="button"
          >
            Ubah data
          </button>
          <button
            className="customer-danger-button"
            onClick={onDelete}
            type="button"
          >
            Hapus kendaraan
          </button>
          <button
            className="customer-primary-button customer-detail-back"
            onClick={onBack}
            type="button"
          >
            Kembali ke daftar
          </button>
        </div>
      </section>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="customer-field">
      <span>{label}</span>
      <input readOnly value={value} />
    </label>
  );
}

function DeleteConfirmation({
  vehicle,
  errorMessage,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  vehicle: CustomerVehicle;
  errorMessage: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="customer-page-content">
      <p className="customer-eyebrow">AREA CUSTOMER</p>
      <h1 className="customer-page-title">Konfirmasi hapus kendaraan</h1>
      <p className="customer-page-subtitle">
        Pastikan kendaraan yang dipilih sudah benar.
      </p>

      <section className="customer-delete-panel">
        <h2>Hapus kendaraan?</h2>
        <span className="customer-vehicle-badge">KONFIRMASI</span>
        <h3>{vehicleLabel(vehicle)}</h3>
        <p>Kendaraan akan dihapus dari daftar akun Anda</p>
        {errorMessage && (
          <p className="customer-form-error" role="alert">
            {errorMessage}
          </p>
        )}
        <div className="customer-delete-actions">
          <button
            className="customer-outline-button"
            onClick={onCancel}
            type="button"
          >
            Tidak, kembali
          </button>
          <button
            className="customer-danger-button"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? "Menghapus..." : "Ya, hapus kendaraan"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SuccessDialog({
  message,
  onClose,
  actionRef,
  dialogRef,
}: {
  message: string;
  onClose: () => void;
  actionRef: RefObject<HTMLButtonElement | null>;
  dialogRef: RefObject<HTMLElement | null>;
}) {
  const isAdded = message.includes("ditambahkan");
  const description = isAdded
    ? "Data kendaraan baru berhasil disimpan dan ditambahkan ke daftar kendaraan."
    : message.includes("diperbarui")
      ? "Perubahan data berhasil disimpan."
      : "Kendaraan sudah dihapus dari daftar.";

  return (
    <div
      className="customer-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="customer-vehicle-success-title"
        aria-modal="true"
        className={`customer-success-dialog${message.includes("dihapus") ? " customer-success-dialog--delete" : message.includes("diperbarui") ? " customer-success-dialog--updated" : ""}`}
        role="dialog"
        ref={dialogRef}
      >
        <button
          aria-label="Tutup notifikasi"
          className="customer-dialog-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <div aria-hidden="true" className="customer-success-mark">
          <Image
            alt=""
            height={48}
            src="/figma-assets/customer-success-icon.svg"
            width={48}
          />
          <span>✓</span>
        </div>
        <h2 id="customer-vehicle-success-title">{message}</h2>
        <p>{description}</p>
        <button
          className="customer-success-action"
          onClick={onClose}
          ref={actionRef}
          type="button"
        >
          Selesai
        </button>
      </section>
    </div>
  );
}
