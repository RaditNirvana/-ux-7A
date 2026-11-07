import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getKasirContext, KasirError, kasirErrorResponse, kasirForbidden, nextCode } from "@/lib/kasir";

const include = {
  kendaraan: { include: { customer: { include: { pengguna: { select: { nama: true, no_hp: true } } } } } },
  penggunaan_sparepart: { include: { sparepart: { select: { nama_sparepart: true } } } },
  rincian_biaya: { include: { persetujuan_biaya: true, pembayaran: true } },
  riwayat_status_servis: { where: { tahap: "Konfirmasi kebutuhan servis" }, take: 1 },
} satisfies Prisma.servisInclude;

export async function GET(request: Request) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const services = await prisma.servis.findMany({
      where: {
        OR: q ? [
          { nomor_antrian: { contains: q, mode: "insensitive" } },
          { kendaraan: { nomor_plat: { contains: q, mode: "insensitive" } } },
          { kendaraan: { customer: { pengguna: { nama: { contains: q, mode: "insensitive" } } } } },
        ] : undefined,
      },
      include,
      orderBy: [{ tanggal_daftar: "desc" }, { id_servis: "desc" }],
      take: 100,
    });
    return Response.json(services.map((s) => ({
      id: s.id_servis, number: s.nomor_antrian, date: s.tanggal_daftar,
      status: s.status_servis, complaint: s.keluhan, inspection: s.hasil_pemeriksaan,
      needs: s.kebutuhan_servis, customer: s.kendaraan.customer.pengguna.nama,
      phone: s.kendaraan.customer.pengguna.no_hp, plate: s.kendaraan.nomor_plat,
      vehicle: `${s.kendaraan.merek} ${s.kendaraan.tipe_kendaraan}`,
      parts: s.penggunaan_sparepart.map((p) => ({ name: p.sparepart.nama_sparepart, quantity: p.jumlah_sparepart })),
      ready: s.status_servis === "Diperiksa" && Boolean(s.kebutuhan_servis) && s.riwayat_status_servis.length > 0,
      detail: s.rincian_biaya ? {
        id: s.rincian_biaya.id_rincian, serviceFee: Number(s.rincian_biaya.biaya_jasa),
        partsFee: Number(s.rincian_biaya.biaya_sparepart), total: Number(s.rincian_biaya.total_biaya),
        approval: s.rincian_biaya.persetujuan_biaya?.status_persetujuan ?? "Menunggu",
        hasPayment: s.rincian_biaya.pembayaran.length > 0,
      } : null,
    })));
  } catch (error) {
    return kasirErrorResponse(error, "Daftar rincian biaya belum dapat dimuat.");
  }
}

export async function POST(request: Request) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.id_servis !== "string") throw new KasirError("Servis tidak valid.");
    const jasa = Number(body.biaya_jasa);
    const sparepart = Number(body.biaya_sparepart);
    if (!Number.isSafeInteger(jasa) || jasa < 0 || jasa > 9_999_999_999 || !Number.isSafeInteger(sparepart) || sparepart < 0 || sparepart > 9_999_999_999 || jasa + sparepart > 9_999_999_999) {
      throw new KasirError("Biaya harus berupa angka bulat minimal nol.");
    }
    await prisma.$transaction(async (tx) => {
      const service = await tx.servis.findUnique({ where: { id_servis: body.id_servis }, include: { riwayat_status_servis: { where: { tahap: "Konfirmasi kebutuhan servis" }, take: 1 }, rincian_biaya: true } });
      if (!service || service.status_servis !== "Diperiksa" || !service.kebutuhan_servis || !service.riwayat_status_servis.length || service.rincian_biaya) {
        throw new KasirError("Servis belum dikonfirmasi SA atau sudah memiliki rincian biaya.", 409);
      }
      const idRincian = await nextCode(tx, "rincian_biaya", "id_rincian", "R", 3);
      const idPersetujuan = await nextCode(tx, "persetujuan_biaya", "id_persetujuan", "PS", 2);
      await tx.rincian_biaya.create({ data: { id_rincian: idRincian, id_servis: service.id_servis, biaya_jasa: jasa, biaya_sparepart: sparepart, total_biaya: jasa + sparepart } });
      await tx.persetujuan_biaya.create({ data: { id_persetujuan: idPersetujuan, id_rincian: idRincian, status_persetujuan: "Menunggu" } });
      await tx.servis.update({ where: { id_servis: service.id_servis }, data: { status_servis: "Menunggu Persetujuan" } });
      await tx.riwayat_status_servis.create({ data: { id_servis: service.id_servis, tahap: "Rincian biaya dibuat", keterangan: `Total biaya ${jasa + sparepart}.` } });
    });
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "Rincian biaya untuk servis ini sudah ada." }, { status: 409 });
    return kasirErrorResponse(error, "Rincian biaya belum dapat disimpan.");
  }
}
