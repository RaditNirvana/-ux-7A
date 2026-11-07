import { prisma } from "@/lib/prisma";

export async function getMekanikConfirmationData(idMekanik: string) {
  const assignments = await prisma.penugasan_mekanik.findMany({
    where: {
      id_mekanik: idMekanik,
      status_penugasan: { in: ["Ditugaskan", "Diproses"] },
      servis: { is: { status_servis: { in: ["Diperiksa", "Menunggu Persetujuan", "Siap Dikerjakan"] } } },
    },
    orderBy: [{ tanggal_penugasan: "desc" }, { id_data_mekanik: "desc" }],
    include: {
      servis: {
        include: {
          kendaraan: true,
          penggunaan_sparepart: { include: { sparepart: true } },
          rincian_biaya: {
            include: {
              persetujuan_biaya: true,
              pembayaran: { select: { konfirmasi_pembayaran: true, status_pembayaran: true } },
            },
          },
        },
      },
    },
  });

  const eligible = assignments.filter(({ servis }) =>
    Boolean(servis.rincian_biaya && servis.rincian_biaya.persetujuan_biaya?.status_persetujuan === "Setuju"),
  );

  return {
    services: eligible.map(({ id_data_mekanik, servis }) => ({
      id_data_mekanik,
      id_servis: servis.id_servis,
      nomor_antrian: servis.nomor_antrian,
      tanggal_daftar: servis.tanggal_daftar.toISOString(),
      tanggal_mulai: servis.tanggal_mulai?.toISOString() ?? null,
      status_servis: servis.status_servis,
      keluhan: servis.keluhan,
      kebutuhan_servis: servis.kebutuhan_servis ?? "",
      hasil_pemeriksaan: servis.hasil_pemeriksaan ?? "",
      kendaraan: {
        merek: servis.kendaraan.merek,
        tipe_kendaraan: servis.kendaraan.tipe_kendaraan,
        tahun_kendaraan: servis.kendaraan.tahun_kendaraan,
        nomor_plat: servis.kendaraan.nomor_plat,
        kilometer: servis.kendaraan.kilometer,
      },
      paymentStatus: servis.rincian_biaya?.pembayaran.some((payment) => payment.konfirmasi_pembayaran === "Terkonfirmasi")
        ? "Terkonfirmasi"
        : "Belum Dikonfirmasi",
      approvalStatus: servis.rincian_biaya?.persetujuan_biaya?.status_persetujuan ?? "Menunggu",
      parts: servis.penggunaan_sparepart.map((part) => ({
        nama_sparepart: part.sparepart.nama_sparepart,
        jumlah_sparepart: part.jumlah_sparepart,
        satuan: part.sparepart.satuan,
      })),
    })),
    hasBlocked: assignments.some(({ servis }) =>
      !servis.rincian_biaya || servis.rincian_biaya.persetujuan_biaya?.status_persetujuan !== "Setuju",
    ),
  };
}
