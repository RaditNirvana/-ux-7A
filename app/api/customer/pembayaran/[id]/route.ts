import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCustomerApiContext } from "@/lib/customer-session";
import { nextCode } from "@/lib/kasir";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const customer = await getCustomerApiContext();
  if (!customer) return Response.json({ error: "Akses ditolak." }, { status: 403 });
  const { id } = await context.params;
  const service = await prisma.servis.findFirst({ where: { id_servis: id, kendaraan: { id_customer: customer.id_customer } }, include: { rincian_biaya: { include: { pembayaran: { orderBy: { tanggal_pembayaran: "desc" }, take: 1 } } } } });
  if (!service?.rincian_biaya) return Response.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
  const payment = service.rincian_biaya.pembayaran[0];
  if (!payment) return Response.json({ error: "Pembayaran belum dibuat." }, { status: 404 });
  const latestEvent = await prisma.riwayat_status_servis.findFirst({ where: { id_servis: id, tahap: { in: ["Validasi pembayaran gagal", "Pembayaran dikonfirmasi", "Metode pembayaran dipilih ulang"] }, waktu: { gte: payment.tanggal_pembayaran } }, orderBy: { waktu: "desc" } });
  const state = payment.konfirmasi_pembayaran === "Terkonfirmasi" && payment.status_pembayaran === "Lunas" ? "success" : latestEvent?.tahap === "Validasi pembayaran gagal" ? "failure" : "waiting";
  return Response.json({ state, payment: { id: payment.id_pembayaran, status: payment.status_pembayaran, confirmation: payment.konfirmasi_pembayaran, method: payment.metode_pembayaran, date: payment.tanggal_pembayaran.toISOString() } });
}

export async function POST(request: Request, context: Ctx) {
  const customer = await getCustomerApiContext();
  if (!customer) return Response.json({ error: "Akses ditolak." }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const method = body?.method === "QRIS" ? "QRIS" : body?.method === "Transfer" ? "Transfer" : null;
  if (!method) return Response.json({ error: "Metode pembayaran tidak valid." }, { status: 400 });
  try {
    const payment = await prisma.$transaction(async (tx) => {
      const service = await tx.servis.findFirst({ where: { id_servis: id, kendaraan: { id_customer: customer.id_customer } }, include: { rincian_biaya: { include: { persetujuan_biaya: true, pembayaran: { orderBy: { tanggal_pembayaran: "desc" }, take: 1 } } } } });
      if (!service?.rincian_biaya || service.rincian_biaya.persetujuan_biaya?.status_persetujuan !== "Setuju" || service.status_servis === "Batal") throw new Error("CONFLICT");
      await tx.$queryRaw`SELECT id_rincian FROM rincian_biaya WHERE id_rincian = ${service.rincian_biaya.id_rincian} FOR UPDATE`;
      const existing = await tx.pembayaran.findFirst({ where: { id_rincian: service.rincian_biaya.id_rincian }, orderBy: { tanggal_pembayaran: "desc" } });
      if (existing && existing.status_pembayaran === "Lunas") throw new Error("PAID");
      if (existing) {
        if (existing.metode_pembayaran !== method) await tx.pembayaran.update({ where: { id_pembayaran: existing.id_pembayaran }, data: { metode_pembayaran: method, tanggal_pembayaran: new Date() } });
        await tx.riwayat_status_servis.create({ data: { id_servis: id, tahap: "Metode pembayaran dipilih ulang", keterangan: "Customer memilih metode pembayaran dan meminta instruksi terbaru." } });
        return { id: existing.id_pembayaran, method, date: new Date().toISOString() };
      }
      // The DDL requires id_kasir even while a Customer initiated payment is pending.
      // Assign the first active cashier; validation replaces this with the validating cashier.
      const cashier = await tx.kasir.findFirst({ where: { pengguna: { login: "Aktif" } }, orderBy: { id_kasir: "asc" }, select: { id_kasir: true } });
      if (!cashier) throw new Error("NO_CASHIER");
      const idPembayaran = await nextCode(tx, "pembayaran", "id_pembayaran", "PB", 2);
      const row = await tx.pembayaran.create({ data: { id_pembayaran: idPembayaran, id_rincian: service.rincian_biaya.id_rincian, id_kasir: cashier.id_kasir, metode_pembayaran: method, jumlah_bayar: service.rincian_biaya.total_biaya, status_pembayaran: "Menunggu", konfirmasi_pembayaran: "Belum Dikonfirmasi" } });
      await tx.riwayat_status_servis.create({ data: { id_servis: id, tahap: "Menunggu pembayaran", keterangan: `Customer memilih ${method === "Transfer" ? "Transfer/VA" : "QRIS"}.` } });
      return { id: row.id_pembayaran, method: row.metode_pembayaran, date: row.tanggal_pembayaran.toISOString() };
    });
    return Response.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT") return Response.json({ error: "Tagihan belum disetujui atau servis tidak dapat dibayar." }, { status: 409 });
    if (error instanceof Error && error.message === "PAID") return Response.json({ error: "Pembayaran untuk tagihan ini sudah lunas." }, { status: 409 });
    if (error instanceof Error && error.message === "NO_CASHIER") return Response.json({ error: "Kasir aktif belum tersedia untuk menerima pembayaran." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "Pembayaran sedang diproses. Muat ulang status tagihan." }, { status: 409 });
    console.error("Customer payment request failed:", error);
    return Response.json({ error: "Pembayaran belum dapat diproses." }, { status: 500 });
  }
}
