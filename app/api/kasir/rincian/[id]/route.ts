import { prisma } from "@/lib/prisma";
import { getKasirContext, KasirError, kasirErrorResponse, kasirForbidden } from "@/lib/kasir";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const jasa = Number(body?.biaya_jasa);
    const sparepart = Number(body?.biaya_sparepart);
    if (!Number.isSafeInteger(jasa) || jasa < 0 || jasa > 9_999_999_999 || !Number.isSafeInteger(sparepart) || sparepart < 0 || sparepart > 9_999_999_999 || jasa + sparepart > 9_999_999_999) throw new KasirError("Biaya harus berupa angka bulat minimal nol dan sesuai batas database.");
    await prisma.$transaction(async (tx) => {
      const row = await tx.rincian_biaya.findUnique({ where: { id_rincian: id }, include: { persetujuan_biaya: true, pembayaran: true } });
      if (!row) throw new KasirError("Rincian biaya tidak ditemukan.", 404);
      if (row.persetujuan_biaya?.status_persetujuan !== "Menunggu" || row.pembayaran.length) throw new KasirError("Rincian hanya dapat diubah saat persetujuan masih Menunggu.", 409);
      await tx.rincian_biaya.update({ where: { id_rincian: id }, data: { biaya_jasa: jasa, biaya_sparepart: sparepart, total_biaya: jasa + sparepart } });
    });
    return Response.json({ success: true });
  } catch (error) { return kasirErrorResponse(error, "Rincian biaya belum dapat diubah."); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const { id } = await context.params;
    await prisma.$transaction(async (tx) => {
      const row = await tx.rincian_biaya.findUnique({ where: { id_rincian: id }, include: { persetujuan_biaya: true, pembayaran: true } });
      if (!row) throw new KasirError("Rincian biaya tidak ditemukan.", 404);
      if (row.persetujuan_biaya?.status_persetujuan !== "Menunggu" || row.pembayaran.length) throw new KasirError("Rincian tidak dapat dihapus karena sudah disetujui atau memiliki pembayaran.", 409);
      if (row.persetujuan_biaya) await tx.persetujuan_biaya.delete({ where: { id_persetujuan: row.persetujuan_biaya.id_persetujuan } });
      await tx.rincian_biaya.delete({ where: { id_rincian: id } });
      await tx.servis.update({ where: { id_servis: row.id_servis }, data: { status_servis: "Diperiksa" } });
      await tx.riwayat_status_servis.create({ data: { id_servis: row.id_servis, tahap: "Rincian biaya dihapus", keterangan: "Status dikembalikan ke Diperiksa untuk penyusunan biaya ulang." } });
    });
    return Response.json({ success: true });
  } catch (error) { return kasirErrorResponse(error, "Rincian biaya belum dapat dihapus."); }
}
