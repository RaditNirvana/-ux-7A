import { prisma } from "@/lib/prisma";

export async function getMekanikInspectionData(idMekanik: string) {
  const [assignments, spareparts, recentResults] = await Promise.all([
    prisma.penugasan_mekanik.findMany({
      where: {
        id_mekanik: idMekanik,
        servis: { is: { status_servis: { in: ["Ditugaskan", "Diperiksa"] } } },
      },
      orderBy: [{ tanggal_penugasan: "desc" }, { id_data_mekanik: "desc" }],
      include: {
        servis: {
          include: {
            kendaraan: {
              include: { customer: { include: { pengguna: { select: { nama: true } } } } },
            },
            penggunaan_sparepart: { include: { sparepart: true } },
            riwayat_status_servis: {
              orderBy: { waktu: "desc" },
              take: 5,
            },
          },
        },
      },
    }),
    prisma.sparepart.findMany({
      where: { status_aktif: "Aktif" },
      orderBy: { nama_sparepart: "asc" },
      select: { id_sparepart: true, nama_sparepart: true, satuan: true, stok: true },
    }),
    prisma.riwayat_status_servis.findMany({
      where: {
        tahap: "Hasil pemeriksaan dicatat",
        servis: { is: { penugasan_mekanik: { some: { id_mekanik: idMekanik } } } },
      },
      orderBy: { waktu: "desc" },
      take: 2,
      include: { servis: { select: { id_servis: true, tanggal_daftar: true } } },
    }),
  ]);

  return {
    assignments: assignments.map(({ id_data_mekanik, servis }) => ({
      id_data_mekanik,
      id_servis: servis.id_servis,
      nomor_antrian: servis.nomor_antrian,
      tanggal_daftar: servis.tanggal_daftar.toISOString(),
      tanggal_pemeriksaan: servis.tanggal_pemeriksaan?.toISOString() ?? null,
      hasil_pemeriksaan: servis.hasil_pemeriksaan ?? "",
      kebutuhan_servis: servis.kebutuhan_servis ?? "",
      status_servis: servis.status_servis,
      keluhan: servis.keluhan,
      kendaraan: {
        merek: servis.kendaraan.merek,
        tipe_kendaraan: servis.kendaraan.tipe_kendaraan,
        tahun_kendaraan: servis.kendaraan.tahun_kendaraan,
        nomor_plat: servis.kendaraan.nomor_plat,
        kilometer: servis.kendaraan.kilometer,
        pemilik: servis.kendaraan.customer.pengguna.nama,
      },
      parts: servis.penggunaan_sparepart.map((part) => ({
        id_sparepart: part.id_sparepart,
        nama_sparepart: part.sparepart.nama_sparepart,
        satuan: part.sparepart.satuan,
        stok: part.sparepart.stok,
        jumlah_sparepart: part.jumlah_sparepart,
        bagian_diganti: part.bagian_diganti ?? "",
        status_ketersediaan_sparepart: part.sparepart.stok >= part.jumlah_sparepart
          ? "Tersedia"
          : "Tidak tersedia",
      })),
      recent: servis.riwayat_status_servis.map((item) => ({
        tahap: item.tahap,
        keterangan: item.keterangan ?? "",
        waktu: item.waktu.toISOString(),
      })),
    })),
    spareparts,
    recentResults: recentResults.map((item) => ({
      id_riwayat: item.id_riwayat,
      id_servis: item.id_servis,
      nomor_pendaftaran: item.servis.id_servis,
      tanggal_daftar: item.servis.tanggal_daftar.toISOString(),
      keterangan: item.keterangan ?? "",
      waktu: item.waktu.toISOString(),
    })),
  };
}
