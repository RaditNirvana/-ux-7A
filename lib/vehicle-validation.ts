export type VehicleInput = {
  merek: string;
  tipe_kendaraan: string;
  tahun_kendaraan: number;
  nomor_plat: string;
  nomor_rangka: string | null;
  kilometer: number | null;
};

export class VehicleIdPoolExhaustedError extends Error {
  constructor() {
    super("Tidak ada ID kendaraan yang tersedia.");
    this.name = "VehicleIdPoolExhaustedError";
  }
}

type VehicleValidationResult =
  | { success: true; data: VehicleInput }
  | { success: false; message: string };

export function validateVehicleInput(value: unknown): VehicleValidationResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { success: false, message: "Data kendaraan tidak valid." };
  }

  const fields = value as Record<string, unknown>;
  const merek =
    typeof fields.merek === "string" ? fields.merek.trim() : "";
  const tipeKendaraan =
    typeof fields.tipe_kendaraan === "string"
      ? fields.tipe_kendaraan.trim()
      : "";
  const nomorPlat =
    typeof fields.nomor_plat === "string"
      ? fields.nomor_plat.trim().toUpperCase()
      : "";
  const nomorRangka =
    typeof fields.nomor_rangka === "string"
      ? fields.nomor_rangka.trim().toUpperCase() || null
      : fields.nomor_rangka === null || fields.nomor_rangka === undefined
        ? null
        : undefined;
  const tahunKendaraan = fields.tahun_kendaraan;
  const kilometer = fields.kilometer === "" ? null : fields.kilometer;

  if (!merek || merek.length > 50) {
    return {
      success: false,
      message: "Merek wajib diisi dan maksimal 50 karakter.",
    };
  }

  if (!tipeKendaraan || tipeKendaraan.length > 50) {
    return {
      success: false,
      message: "Tipe kendaraan wajib diisi dan maksimal 50 karakter.",
    };
  }

  if (!nomorPlat || nomorPlat.length > 15) {
    return {
      success: false,
      message: "Nomor pelat wajib diisi dan maksimal 15 karakter.",
    };
  }

  if (nomorRangka === undefined || (nomorRangka && nomorRangka.length > 30)) {
    return {
      success: false,
      message: "Nomor rangka maksimal 30 karakter.",
    };
  }

  if (
    typeof tahunKendaraan !== "number" ||
    !Number.isInteger(tahunKendaraan) ||
    tahunKendaraan < 1980 ||
    tahunKendaraan > 2100
  ) {
    return {
      success: false,
      message: "Tahun kendaraan harus antara 1980 dan 2100.",
    };
  }

  if (
    kilometer !== null &&
    kilometer !== undefined &&
    (typeof kilometer !== "number" ||
      !Number.isInteger(kilometer) ||
      kilometer < 0)
  ) {
    return {
      success: false,
      message: "Kilometer harus berupa bilangan bulat nol atau lebih.",
    };
  }

  return {
    success: true,
    data: {
      merek,
      tipe_kendaraan: tipeKendaraan,
      tahun_kendaraan: tahunKendaraan,
      nomor_plat: nomorPlat,
      nomor_rangka: nomorRangka,
      kilometer:
        typeof kilometer === "number" ? kilometer : null,
    },
  };
}

export function getKnownRequestErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}
