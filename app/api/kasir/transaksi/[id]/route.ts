import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getKasirContext, kasirErrorResponse, kasirForbidden } from "@/lib/kasir";

const userInclude = { select: { nama: true, no_hp: true } };
const customerInclude = { include: { pengguna: userInclude } };
const vehicleInclude = { include: { customer: customerInclude } };
const serviceInclude = { include: { kendaraan: vehicleInclude } };
const rincianInclude = { include: { servis: serviceInclude } };
const cashierInclude = { include: { pengguna: { select: { nama: true } } } };
const paymentInclude = { kasir: cashierInclude, rincian_biaya: rincianInclude } satisfies Prisma.pembayaranInclude;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const { id } = await context.params;
    const transaction = await prisma.transaksi.findUnique({
      where: { id_transaksi: id },
      include: { pembayaran: { include: paymentInclude } },
    });
    if (!transaction) return Response.json({ error: "Bukti transaksi tidak ditemukan." }, { status: 404 });
    const payment = transaction.pembayaran;
    const service = payment.rincian_biaya.servis;
    if (service.status_servis !== "Selesai" || payment.status_pembayaran !== "Lunas") return Response.json({ error: service.status_servis !== "Selesai" ? "Menunggu servis selesai." : "Menunggu validasi pembayaran." }, { status: 409 });
    return Response.json({
      id: transaction.id_transaksi, date: transaction.tanggal_transaksi,
      paymentId: payment.id_pembayaran, paymentDate: payment.tanggal_pembayaran,
      method: payment.metode_pembayaran, amount: Number(payment.jumlah_bayar),
      status: payment.status_pembayaran, confirmation: payment.konfirmasi_pembayaran,
      cashier: payment.kasir.pengguna.nama, service: service.nomor_antrian,
      serviceDate: service.tanggal_daftar, complaint: service.keluhan,
      customer: service.kendaraan.customer.pengguna.nama, phone: service.kendaraan.customer.pengguna.no_hp,
      vehicle: `${service.kendaraan.merek} ${service.kendaraan.tipe_kendaraan}`, plate: service.kendaraan.nomor_plat,
      serviceFee: Number(payment.rincian_biaya.biaya_jasa), partsFee: Number(payment.rincian_biaya.biaya_sparepart), total: Number(payment.rincian_biaya.total_biaya),
    });
  } catch (error) { return kasirErrorResponse(error, "Bukti transaksi belum dapat dimuat."); }
}
