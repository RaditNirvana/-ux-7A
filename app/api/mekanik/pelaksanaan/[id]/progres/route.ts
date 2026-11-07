import { revalidatePath } from "next/cache";
import { apiErrorResponse, forbiddenResponse, getMekanikIdentity, MekanikApiError, requireOwnedService } from "@/lib/mekanik-api";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getMekanikIdentity();
  if (!identity) return forbiddenResponse();

  try {
    const { id } = await context.params;
    const parsed: unknown = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new MekanikApiError("Data progres tidak valid.");
    }
    const body = parsed as Record<string, unknown>;
    await prisma.$transaction(async (tx) => {
      await requireOwnedService(tx, identity.id_mekanik, id);
      const service = await tx.servis.findUnique({
        where: { id_servis: id },
        select: { status_servis: true },
      });
      if (!service || service.status_servis !== "Diproses") {
        throw new MekanikApiError("Progres hanya dapat diperbarui saat servis sedang Diproses.", 409);
      }

      if (body.type === "part") {
        if (typeof body.id_sparepart !== "string" || typeof body.terpasang !== "boolean") {
          throw new MekanikApiError("Status pemasangan sparepart tidak valid.");
        }
        const usage = await tx.penggunaan_sparepart.findUnique({
          where: { id_servis_id_sparepart: { id_servis: id, id_sparepart: body.id_sparepart } },
          select: { id_sparepart: true },
        });
        if (!usage) throw new MekanikApiError("Sparepart ini bukan kebutuhan servis tersebut.", 403);
        await tx.riwayat_status_servis.create({
          data: {
            id_servis: id,
            tahap: "Status pemasangan sparepart",
            keterangan: `${body.id_sparepart}:${body.terpasang ? "terpasang" : "dilepas"}`,
          },
        });
      } else if (body.type === "catatan") {
        const note = typeof body.catatan === "string" ? body.catatan.trim() : "";
        if (!note || note.length > 300) throw new MekanikApiError("Catatan progres wajib diisi maksimal 300 karakter.");
        await tx.servis.update({ where: { id_servis: id }, data: { hasil_servis: note } });
        await tx.riwayat_status_servis.create({
          data: { id_servis: id, tahap: "Progres servis diperbarui", keterangan: note },
        });
      } else {
        throw new MekanikApiError("Jenis pembaruan progres tidak dikenal.");
      }
    });

    revalidatePath("/mekanik/pelaksanaan-servis");
    revalidatePath("/mekanik/dashboard");
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Progres servis belum dapat diperbarui.");
  }
}
