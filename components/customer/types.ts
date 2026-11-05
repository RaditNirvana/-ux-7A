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
