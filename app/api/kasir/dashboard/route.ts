import { prisma } from "@/lib/prisma";
import { getJakartaDateBounds, getKasirContext, kasirErrorResponse, kasirForbidden } from "@/lib/kasir";

export async function GET() {
  const user = await getKasirContext();
  if (!user) return kasirForbidden();
  try {
    const { start: today, end: tomorrow } = getJakartaDateBounds();
    const [readyForCosting, waiting, paidToday, transactions] = await Promise.all([
      prisma.servis.count({
        where: { status_servis: "Diperiksa", kebutuhan_servis: { not: null },
          riwayat_status_servis: { some: { tahap: "Konfirmasi kebutuhan servis" } }, rincian_biaya: null },
      }),
      prisma.servis.count({ where: { status_servis: "Selesai", rincian_biaya: { is: { persetujuan_biaya: { is: { status_persetujuan: "Setuju" } }, pembayaran: { none: {} } } } } }),
      prisma.pembayaran.aggregate({ where: { status_pembayaran: "Lunas", tanggal_pembayaran: { gte: today, lt: tomorrow } }, _sum: { jumlah_bayar: true } }),
      prisma.transaksi.findMany({ include: { pembayaran: true } }),
    ]);
    return Response.json({
      readyForCosting,
      waitingForPayment: waiting,
      paidToday: Number(paidToday._sum.jumlah_bayar ?? 0),
      revenue: transactions.reduce((sum, row) => sum + Number(row.pembayaran.jumlah_bayar), 0),
    });
  } catch (error) {
    return kasirErrorResponse(error, "Ringkasan Kasir belum dapat dimuat.");
  }
}
