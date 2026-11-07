export const MEKANIK_ASSIGNMENT_STATUSES = [
  "Ditugaskan",
  "Diperiksa",
  "Siap Dikerjakan",
  "Diproses",
] as const;

export type MekanikAssignmentStatus =
  (typeof MEKANIK_ASSIGNMENT_STATUSES)[number];

export type MekanikAssignmentRecord = {
  id_data_mekanik: string;
  id_servis: string;
  tanggal_daftar: string;
  keluhan: string;
  status_servis: string;
  kendaraan: {
    merek: string;
    tipe_kendaraan: string;
    tahun_kendaraan: number;
    nomor_plat: string;
    kilometer: number | null;
    pemilik: string;
  };
};

export function getMekanikDisplayServiceId(id: string, registeredAt: string) {
  const sequence = id.match(/\d+/)?.[0] ?? id;
  return `SRV-${new Date(registeredAt).getFullYear()}-${sequence.padStart(4, "0")}`;
}

export function cleanMekanikComplaint(complaint: string) {
  return complaint.replace(/[\[\]]/g, "").trim();
}
