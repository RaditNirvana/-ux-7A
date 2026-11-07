import { revalidatePath } from "next/cache";
import { apiErrorResponse, forbiddenResponse, getMekanikIdentity, MekanikApiError, requireOwnedService } from "@/lib/mekanik-api";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getMekanikIdentity();
  if (!identity) return forbiddenResponse();

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const note = typeof body.catatan === "string" ? body.catatan.trim() : "";
    if (note.length > 300) throw new MekanikApiError("Catatan progres maksimal 300 karakter.");
    await prisma.$transaction(async (tx) => {
      await requireOwnedService(tx, identity.id_mekanik, id);
      const service = await tx.servis.findUnique({
        where: { id_servis: id },
        include: {
          rincian_biaya: { include: { persetujuan_biaya: true } },
          penggunaan_sparepart: { select: { id_sparepart: true, jumlah_sparepart: true } },
        },
      });
      if (!service || service.status_servis !== "Siap Dikerjakan") {
        throw new MekanikApiError("Mulai servis hanya dapat dilakukan saat status Siap Dikerjakan.", 409);
      }
      if (!service.rincian_biaya || service.rincian_biaya.persetujuan_biaya?.status_persetujuan !== "Setuju") {
        throw new MekanikApiError("Customer belum menyetujui biaya servis atau rincian biaya belum tersedia.", 409);
      }

      const startedAt = new Date();
      for (const usage of service.penggunaan_sparepart) {
        const sparepart = await tx.sparepart.findUnique({
          where: { id_sparepart: usage.id_sparepart },
          select: { stok: true, nama_sparepart: true },
        });
        if (!sparepart || sparepart.stok < usage.jumlah_sparepart) {
          throw new MekanikApiError(`Stok ${sparepart?.nama_sparepart ?? "sparepart"} tidak mencukupi.`, 409);
        }
        const changed = await tx.sparepart.updateMany({
          where: { id_sparepart: usage.id_sparepart, stok: { gte: usage.jumlah_sparepart } },
          data: {
            stok: { decrement: usage.jumlah_sparepart },
            tanggal_diperbarui: startedAt,
          },
        });
        if (changed.count !== 1) {
          throw new MekanikApiError(`Stok ${sparepart.nama_sparepart} berubah dan tidak mencukupi.`, 409);
        }
        await tx.riwayat_stok.create({
          data: {
            id_sparepart: usage.id_sparepart,
            jenis: "Pemakaian servis",
            jumlah_sebelum: sparepart.stok,
            jumlah_sesudah: sparepart.stok - usage.jumlah_sparepart,
            catatan: `Pemakaian servis ${id}`,
            waktu: startedAt,
            id_sa: null,
          },
        });
      }

      await tx.servis.update({
        where: { id_servis: id },
        data: {
          tanggal_mulai: startedAt,
          status_servis: "Diproses",
          ...(note ? { hasil_servis: note } : {}),
        },
      });
      await tx.penugasan_mekanik.updateMany({
        where: { id_mekanik: identity.id_mekanik, id_servis: id },
        data: { status_penugasan: "Diproses" },
      });
      await tx.mekanik.update({
        where: { id_mekanik: identity.id_mekanik },
        data: { status_ketersediaan: "Sedang Bekerja" },
      });
      await tx.riwayat_status_servis.create({
        data: {
          id_servis: id,
          tahap: "Servis dimulai",
          keterangan: note || "Servis mulai diproses; pemakaian sparepart dicatat.",
          waktu: startedAt,
        },
      });
    });

    revalidatePath("/mekanik/pelaksanaan-servis");
    revalidatePath("/mekanik/dashboard");
    revalidatePath("/sa/stok-sparepart");
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Servis belum dapat dimulai.");
  }
}
