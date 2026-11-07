export type CustomerVehicle = {
  id_kendaraan: string;
  merek: string;
  tipe_kendaraan: string;
  tahun_kendaraan: number;
  nomor_plat: string;
  nomor_rangka: string | null;
  kilometer: number | null;
};

export type CustomerServiceActivity = {
  id_servis: string;
  keluhan: string;
  tanggal_daftar: string;
  status_servis: string;
  hasil_pemeriksaan: string | null;
  kebutuhan_servis: string | null;
  kendaraan: {
    merek: string;
    tipe_kendaraan: string;
    tahun_kendaraan: number;
    nomor_plat: string;
  };
};

export type CustomerServiceRegistrationItem = {
  id_servis: string;
  nomor_antrian: string;
  tanggal_daftar: string;
  keluhan: string;
  catatan_kedatangan: string | null;
  status_verifikasi: string;
  estimasi_waktu_tunggu: string | null;
  tanggal_pemeriksaan: string | null;
  hasil_pemeriksaan: string | null;
  kebutuhan_servis: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  status_servis: string;
  hasil_servis: string | null;
  alasan_batal: string | null;
  id_kendaraan: string;
  kendaraan: CustomerVehicle;
  riwayat_status_servis: Array<{
    id_riwayat: number;
    tahap: string;
    keterangan: string | null;
    waktu: string;
  }>;
};

export type ServiceRegistrationView =
  | "list"
  | "form"
  | "review"
  | "detail"
  | "edit"
  | "cancel-confirm";

export type ServiceRegistrationDialog =
  | "kirim"
  | "ubah"
  | "batal"
  | "ajukan-batal"
  | null;

