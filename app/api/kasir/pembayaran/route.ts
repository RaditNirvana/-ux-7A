import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getJakartaDateBounds, getKasirContext, KasirError, kasirErrorResponse, kasirForbidden, nextCode } from "@/lib/kasir";

const userInclude = { select: { nama: true } };
const customerInclude = { include: { pengguna: userInclude } };
const vehicleInclude = { include: { customer: customerInclude } };
const serviceInclude = { include: { kendaraan: vehicleInclude } };
const rincianInclude = { include: { servis: serviceInclude } };
const cashierInclude = { include: { pengguna: userInclude } };
const paymentInclude = { kasir: cashierInclude, rincian_biaya: rincianInclude, transaksi: true } satisfies Prisma.pembayaranInclude;

export async function GET(request: Request) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim();
    const paymentWhere: Prisma.pembayaranWhereInput = q ? {
      rincian_biaya: { is: { servis: { is: { OR: [
        { nomor_antrian: { contains: q, mode: "insensitive" } },
        { kendaraan: { nomor_plat: { contains: q, mode: "insensitive" } } },
        { kendaraan: { customer: { pengguna: { nama: { contains: q, mode: "insensitive" } } } } },
      ] } } } },
    } : {};
    const [services, payments] = await Promise.all([
      prisma.servis.findMany({
        where: {
          status_servis: "Selesai",
          rincian_biaya: { is: { persetujuan_biaya: { is: { status_persetujuan: "Setuju" } }, pembayaran: { none: {} } } },
          OR: q ? [
            { nomor_antrian: { contains: q, mode: "insensitive" } },
            { kendaraan: { nomor_plat: { contains: q, mode: "insensitive" } } },
            { kendaraan: { customer: { pengguna: { nama: { contains: q, mode: "insensitive" } } } } },
          ] : undefined,
        },
        include: { kendaraan: { include: { customer: { include: { pengguna: { select: { nama: true, no_hp: true } } } } } }, rincian_biaya: true },
        orderBy: [{ tanggal_selesai: "desc" }, { id_servis: "desc" }], take: 100,
      }),
      prisma.pembayaran.findMany({
        where: paymentWhere,
        include: paymentInclude,
        orderBy: { tanggal_pembayaran: "desc" }, take: 100,
      }),
    ]);
    return Response.json({
      eligible: services.map((s) => ({ id: s.id_servis, number: s.nomor_antrian, date: s.tanggal_selesai, customer: s.kendaraan.customer.pengguna.nama, phone: s.kendaraan.customer.pengguna.no_hp, vehicle: `${s.kendaraan.merek} ${s.kendaraan.tipe_kendaraan}`, plate: s.kendaraan.nomor_plat, idRincian: s.rincian_biaya!.id_rincian, total: Number(s.rincian_biaya!.total_biaya) })),
      payments: payments.map((p) => ({ id: p.id_pembayaran, transactionId: p.transaksi?.id_transaksi ?? null, service: p.rincian_biaya.servis.nomor_antrian, customer: p.rincian_biaya.servis.kendaraan.customer.pengguna.nama, plate: p.rincian_biaya.servis.kendaraan.nomor_plat, vehicle: `${p.rincian_biaya.servis.kendaraan.merek} ${p.rincian_biaya.servis.kendaraan.tipe_kendaraan}`, method: p.metode_pembayaran, amount: Number(p.jumlah_bayar), date: p.tanggal_pembayaran, cashier: p.kasir.pengguna.nama })),
    });
  } catch (error) { return kasirErrorResponse(error, "Daftar pembayaran belum dapat dimuat."); }
}

export async function POST(request: Request) {
  const user = await getKasirContext();
  if (!user) return kasirForbidden();
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.id_servis !== "string" || !["Tunai", "Transfer", "QRIS"].includes(body.metode_pembayaran)) throw new KasirError("Data pembayaran tidak valid.");
    const received = Number(body.jumlah_diterima);
    if (!Number.isSafeInteger(received) || received < 0) throw new KasirError("Jumlah yang dibayar harus berupa angka minimal nol.");
    const result = await prisma.$transaction(async (tx) => {
      const service = await tx.servis.findUnique({ where: { id_servis: body.id_servis }, include: { rincian_biaya: { include: { persetujuan_biaya: true, pembayaran: true } } } });
      if (!service?.rincian_biaya || service.rincian_biaya.persetujuan_biaya?.status_persetujuan !== "Setuju" || service.status_servis !== "Selesai") throw new KasirError("Pembayaran hanya dapat dicatat untuk servis Selesai yang disetujui Customer.", 409);
      if (service.rincian_biaya.pembayaran.length) throw new KasirError("Pembayaran untuk servis ini sudah tercatat.", 409);
      const total = Number(service.rincian_biaya.total_biaya);
      if (received !== total) throw new KasirError(`Jumlah pembayaran harus sama dengan total tagihan ${total}.`, 422);
      const idPembayaran = await nextCode(tx, "pembayaran", "id_pembayaran", "PB", 2);
      const idTransaksi = await nextCode(tx, "transaksi", "id_transaksi", "T", 3);
      await tx.pembayaran.create({ data: { id_pembayaran: idPembayaran, id_rincian: service.rincian_biaya.id_rincian, id_kasir: user.id_kasir, metode_pembayaran: body.metode_pembayaran, jumlah_bayar: total, status_pembayaran: "Lunas", konfirmasi_pembayaran: "Terkonfirmasi" } });
      await tx.transaksi.create({ data: { id_transaksi: idTransaksi, id_pembayaran: idPembayaran, tanggal_transaksi: getJakartaDateBounds().date } });
      return { id_pembayaran: idPembayaran, id_transaksi: idTransaksi };
    });
    return Response.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "Pembayaran untuk servis ini sudah tercatat." }, { status: 409 });
    return kasirErrorResponse(error, "Pembayaran belum dapat disimpan.");
  }
}
