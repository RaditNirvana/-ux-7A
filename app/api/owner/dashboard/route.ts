import { prisma } from "@/lib/prisma";
import { getOwnerContext, ownerError, ownerForbidden } from "@/lib/owner";

export async function GET() {
  if (!(await getOwnerContext())) return ownerForbidden();
  try {
    const [paid, statusRows, recent, activity] = await Promise.all([
      prisma.pembayaran.aggregate({ where: { status_pembayaran: "Lunas", konfirmasi_pembayaran: "Terkonfirmasi" }, _sum: { jumlah_bayar: true }, _count: true }),
      prisma.servis.groupBy({ by: ["status_servis"], _count: { _all: true } }),
      prisma.transaksi.findMany({ orderBy: [{ tanggal_transaksi: "desc" }, { id_transaksi: "desc" }], take: 6, include: { pembayaran: { include: { rincian_biaya: { include: { servis: { include: { kendaraan: true } } } } } } } }),
      prisma.riwayat_status_servis.findMany({ orderBy: [{ waktu: "desc" }, { id_riwayat: "desc" }], take: 6, include: { servis: { select: { nomor_antrian: true, status_servis: true } } } }),
    ]);
    return Response.json({ revenue: Number(paid._sum.jumlah_bayar ?? 0), paidCount: paid._count, statuses: statusRows.map((r) => ({ status: r.status_servis, count: r._count._all })), transactions: recent.map((r) => ({ id: r.id_transaksi, date: r.tanggal_transaksi, amount: Number(r.pembayaran.jumlah_bayar), plate: r.pembayaran.rincian_biaya.servis.kendaraan.nomor_plat })), activity: activity.map((r) => ({ stage: r.tahap, note: r.keterangan, date: r.waktu, queue: r.servis.nomor_antrian })) });
  } catch (error) { return ownerError(error, "Dashboard Owner belum dapat dimuat."); }
}
