import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getJakartaDateBounds, getKasirContext, KasirError, kasirErrorResponse, kasirForbidden, nextCode } from "@/lib/kasir";

const paymentInclude = {
  kasir: { include: { pengguna: { select: { nama: true } } } },
  rincian_biaya: {
    include: {
      servis: {
        include: {
          kendaraan: {
            include: {
              customer: { include: { pengguna: { select: { nama: true, no_hp: true } } } },
            },
          },
        },
      },
    },
  },
  transaksi: true,
} satisfies Prisma.pembayaranInclude;

export async function GET(request: Request) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim();
    const match: Prisma.servisWhereInput = q ? { OR: [
      { nomor_antrian: { contains: q, mode: "insensitive" } },
      { kendaraan: { nomor_plat: { contains: q, mode: "insensitive" } } },
      { kendaraan: { customer: { pengguna: { nama: { contains: q, mode: "insensitive" } } } } },
    ] } : {};
    const [pending, eligible] = await Promise.all([
      prisma.pembayaran.findMany({ where: { status_pembayaran: "Menunggu", konfirmasi_pembayaran: "Belum Dikonfirmasi", rincian_biaya: { servis: match } }, include: paymentInclude, orderBy: { tanggal_pembayaran: "desc" }, take: 100 }),
      prisma.servis.findMany({ where: { ...match, status_servis: "Selesai", rincian_biaya: { is: { persetujuan_biaya: { is: { status_persetujuan: "Setuju" } }, pembayaran: { none: {} } } } }, include: { kendaraan: { include: { customer: { include: { pengguna: { select: { nama: true, no_hp: true } } } } } }, rincian_biaya: true }, orderBy: [{ tanggal_selesai: "desc" }, { id_servis: "desc" }], take: 100 }),
      prisma.pembayaran.findMany({ where: { rincian_biaya: { servis: match } }, include: paymentInclude, orderBy: { tanggal_pembayaran: "desc" }, take: 100 }),
    ]);
    const toPayment = (p: typeof pending[number]) => ({ id: p.id_pembayaran, transactionId: p.transaksi?.id_transaksi ?? null, serviceId: p.rincian_biaya.servis.id_servis, service: p.rincian_biaya.servis.nomor_antrian, customer: p.rincian_biaya.servis.kendaraan.customer.pengguna.nama, phone: p.rincian_biaya.servis.kendaraan.customer.pengguna.no_hp, plate: p.rincian_biaya.servis.kendaraan.nomor_plat, vehicle: `${p.rincian_biaya.servis.kendaraan.merek} ${p.rincian_biaya.servis.kendaraan.tipe_kendaraan}`, method: p.metode_pembayaran, amount: Number(p.jumlah_bayar), date: p.tanggal_pembayaran, cashier: p.kasir.pengguna.nama, status: p.status_pembayaran, confirmation: p.konfirmasi_pembayaran, serviceStatus: p.rincian_biaya.servis.status_servis });
    return Response.json({ pending: pending.map(toPayment), eligible: eligible.map((s) => ({ id: s.id_servis, number: s.nomor_antrian, date: s.tanggal_selesai, customer: s.kendaraan.customer.pengguna.nama, phone: s.kendaraan.customer.pengguna.no_hp, vehicle: `${s.kendaraan.merek} ${s.kendaraan.tipe_kendaraan}`, plate: s.kendaraan.nomor_plat, total: Number(s.rincian_biaya!.total_biaya) })), payments: (await prisma.pembayaran.findMany({ where: { rincian_biaya: { servis: match } }, include: paymentInclude, orderBy: { tanggal_pembayaran: "desc" }, take: 100 })).map(toPayment) });
  } catch (error) { return kasirErrorResponse(error, "Daftar pembayaran belum dapat dimuat."); }
}

export async function POST(request: Request) {
  const user = await getKasirContext();
  if (!user) return kasirForbidden();
  try {
    const body = await request.json().catch(() => null);
    if (!body || !["validate", "reject", "cash"].includes(body.action)) throw new KasirError("Aksi pembayaran tidak valid.");
    const result = await prisma.$transaction(async (tx) => {
      if (body.action === "validate" || body.action === "reject") {
        if (typeof body.paymentId !== "string") throw new KasirError("Pembayaran tidak ditemukan.");
        const payment = await tx.pembayaran.findUnique({ where: { id_pembayaran: body.paymentId }, include: { rincian_biaya: { include: { servis: true, persetujuan_biaya: true } }, transaksi: true } });
        if (!payment || payment.status_pembayaran !== "Menunggu" || payment.konfirmasi_pembayaran !== "Belum Dikonfirmasi" || payment.rincian_biaya.persetujuan_biaya?.status_persetujuan !== "Setuju") throw new KasirError("Pembayaran tidak lagi menunggu validasi.", 409);
        if (body.action === "reject") {
          const reason = typeof body.reason === "string" ? body.reason.trim() : "";
          if (!reason || reason.length > 255) throw new KasirError("Alasan penolakan wajib diisi (maksimal 255 karakter).");
          await tx.riwayat_status_servis.create({ data: { id_servis: payment.rincian_biaya.servis.id_servis, tahap: "Validasi pembayaran gagal", keterangan: reason } });
          return { rejected: true };
        }
        const transactionId = await nextCode(tx, "transaksi", "id_transaksi", "T", 3);
        await tx.pembayaran.update({ where: { id_pembayaran: payment.id_pembayaran }, data: { status_pembayaran: "Lunas", konfirmasi_pembayaran: "Terkonfirmasi", id_kasir: user.id_kasir } });
        await tx.transaksi.create({ data: { id_transaksi: transactionId, id_pembayaran: payment.id_pembayaran, tanggal_transaksi: getJakartaDateBounds().date } });
        await tx.riwayat_status_servis.create({ data: { id_servis: payment.rincian_biaya.servis.id_servis, tahap: "Pembayaran dikonfirmasi", keterangan: "Pembayaran divalidasi oleh Kasir." } });
        return { id_transaksi: transactionId };
      }
      if (typeof body.id_servis !== "string" || !["Tunai", "Transfer", "QRIS"].includes(body.metode_pembayaran)) throw new KasirError("Data pembayaran tunai tidak valid.");
      const received = Number(body.jumlah_diterima);
      if (!Number.isSafeInteger(received) || received < 0) throw new KasirError("Jumlah diterima harus berupa angka minimal nol.");
      const service = await tx.servis.findUnique({ where: { id_servis: body.id_servis }, include: { rincian_biaya: { include: { persetujuan_biaya: true, pembayaran: true } } } });
      if (!service?.rincian_biaya || service.status_servis !== "Selesai" || service.rincian_biaya.persetujuan_biaya?.status_persetujuan !== "Setuju") throw new KasirError("Pembayaran tunai hanya dapat dicatat untuk servis selesai yang disetujui.", 409);
      if (service.rincian_biaya.pembayaran.length) throw new KasirError("Pembayaran untuk servis ini sudah tercatat.", 409);
      const total = Number(service.rincian_biaya.total_biaya);
      if (received !== total) throw new KasirError(`Jumlah pembayaran harus sama dengan total tagihan ${total}.`, 422);
      const paymentId = await nextCode(tx, "pembayaran", "id_pembayaran", "PB", 2);
      const transactionId = await nextCode(tx, "transaksi", "id_transaksi", "T", 3);
      await tx.pembayaran.create({ data: { id_pembayaran: paymentId, id_rincian: service.rincian_biaya.id_rincian, id_kasir: user.id_kasir, metode_pembayaran: body.metode_pembayaran, jumlah_bayar: total, status_pembayaran: "Lunas", konfirmasi_pembayaran: "Terkonfirmasi" } });
      await tx.transaksi.create({ data: { id_transaksi: transactionId, id_pembayaran: paymentId, tanggal_transaksi: getJakartaDateBounds().date } });
      await tx.riwayat_status_servis.create({ data: { id_servis: service.id_servis, tahap: "Pembayaran dikonfirmasi", keterangan: "Pembayaran tunai divalidasi oleh Kasir." } });
      return { id_transaksi: transactionId };
    });
    return Response.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "Pembayaran sedang diproses atau transaksi sudah tercatat." }, { status: 409 });
    return kasirErrorResponse(error, "Pembayaran belum dapat disimpan.");
  }
}
