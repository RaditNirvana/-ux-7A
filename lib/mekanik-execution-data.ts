import { prisma } from "@/lib/prisma";

export async function getMekanikExecutionData(idMekanik: string) {
  const assignments = await prisma.penugasan_mekanik.findMany({
    where: {
      id_mekanik: idMekanik,
      servis: { is: { status_servis: { in: ["Siap Dikerjakan", "Diproses", "Selesai"] } } },
    },
    orderBy: [{ tanggal_penugasan: "desc" }, { id_data_mekanik: "desc" }],
    include: {
      servis: {
        include: {
          kendaraan: true,
          penggunaan_sparepart: { include: { sparepart: true } },
          rincian_biaya: { include: { persetujuan_biaya: true } },
          riwayat_status_servis: { orderBy: { waktu: "asc" } },
        },
      },
    },
  });

  return assignments.map(({ id_data_mekanik, status_penugasan, servis }) => ({
    id_data_mekanik,
    status_penugasan,
    id_servis: servis.id_servis,
    nomor_antrian: servis.nomor_antrian,
    tanggal_daftar: servis.tanggal_daftar.toISOString(),
    tanggal_mulai: servis.tanggal_mulai?.toISOString() ?? null,
    tanggal_selesai: servis.tanggal_selesai?.toISOString() ?? null,
    status_servis: servis.status_servis,
    hasil_servis: servis.hasil_servis ?? "",
    kebutuhan_servis: servis.kebutuhan_servis ?? "",
    keluhan: servis.keluhan,
    kendaraan: {
      merek: servis.kendaraan.merek,
      tipe_kendaraan: servis.kendaraan.tipe_kendaraan,
      tahun_kendaraan: servis.kendaraan.tahun_kendaraan,
      nomor_plat: servis.kendaraan.nomor_plat,
    },
    isApproved: Boolean(
      servis.rincian_biaya && servis.rincian_biaya.persetujuan_biaya?.status_persetujuan === "Setuju",
    ),
    parts: servis.penggunaan_sparepart.map((part) => {
      const marker = `${part.id_sparepart}:`;
      const lastEvent = [...servis.riwayat_status_servis].reverse().find(
        (item) => item.tahap === "Status pemasangan sparepart" && item.keterangan?.startsWith(marker),
      );
      return {
        id_sparepart: part.id_sparepart,
        nama_sparepart: part.sparepart.nama_sparepart,
        satuan: part.sparepart.satuan,
        jumlah_sparepart: part.jumlah_sparepart,
        stok: part.sparepart.stok,
        terpasang: lastEvent?.keterangan === `${part.id_sparepart}:terpasang`,
      };
    }),
    recent: servis.riwayat_status_servis.map((item) => ({
      tahap: item.tahap,
      keterangan: item.keterangan ?? "",
      waktu: item.waktu.toISOString(),
    })),
  }));
}
