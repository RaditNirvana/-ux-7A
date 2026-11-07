import { prisma } from "@/lib/prisma";
import { getCustomerApiContext } from "@/lib/customer-session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const customer = await getCustomerApiContext();
  if (!customer) return Response.json({ error: "Akses ditolak." }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const decision = body?.decision;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (decision !== "Setuju" && decision !== "Batal") return Response.json({ error: "Pilihan persetujuan tidak valid." }, { status: 400 });
    if (decision === "Batal" && (!reason || reason.length > 255)) return Response.json({ error: "Alasan pembatalan wajib diisi (maksimal 255 karakter)." }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      const service = await tx.servis.findUnique({ where: { id_servis: id }, include: { kendaraan: { select: { id_customer: true } }, rincian_biaya: { include: { persetujuan_biaya: true, pembayaran: true } } } });
      if (!service || service.kendaraan.id_customer !== customer.id_customer) throw new Error("FORBIDDEN");
      if (service.status_servis !== "Menunggu Persetujuan" || !service.rincian_biaya || service.rincian_biaya.persetujuan_biaya?.status_persetujuan !== "Menunggu" || service.rincian_biaya.pembayaran.length) throw new Error("CONFLICT");
      await tx.persetujuan_biaya.update({ where: { id_rincian: service.rincian_biaya.id_rincian }, data: { status_persetujuan: decision === "Setuju" ? "Setuju" : "Tidak setuju", tanggal_persetujuan: new Date() } });
      await tx.servis.update({ where: { id_servis: id }, data: decision === "Setuju" ? { status_servis: "Siap Dikerjakan" } : { status_servis: "Batal", alasan_batal: reason } });
      await tx.riwayat_status_servis.create({ data: { id_servis: id, tahap: decision === "Setuju" ? "Biaya disetujui" : "Servis dibatalkan", keterangan: decision === "Setuju" ? "Customer menyetujui rincian biaya." : reason } });
    });
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return Response.json({ error: "Akses ditolak." }, { status: 403 });
    if (error instanceof Error && error.message === "CONFLICT") return Response.json({ error: "Biaya ini sudah diproses atau servis tidak lagi menunggu persetujuan." }, { status: 409 });
    console.error("Customer cost approval failed:", error);
    return Response.json({ error: "Persetujuan biaya belum dapat diproses." }, { status: 500 });
  }
}
