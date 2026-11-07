import { revalidatePath } from "next/cache";
import { apiErrorResponse, forbiddenResponse, getMekanikIdentity, MekanikApiError, requireOwnedService } from "@/lib/mekanik-api";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getMekanikIdentity();
  if (!identity) return forbiddenResponse();

  try {
    const { id } = await context.params;
    const parsed: unknown = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new MekanikApiError("Data hasil servis tidak valid.");
    }
    const body = parsed as Record<string, unknown>;
    const result = typeof body.hasil_servis === "string" ? body.hasil_servis.trim() : "";
    if (!result || result.length > 300) throw new MekanikApiError("Hasil servis wajib diisi maksimal 300 karakter.");

    await prisma.$transaction(async (tx) => {
      await requireOwnedService(tx, identity.id_mekanik, id);
      const service = await tx.servis.findUnique({
        where: { id_servis: id },
        select: { status_servis: true, tanggal_mulai: true },
      });
      const completedAt = new Date();
      if (!service || service.status_servis !== "Diproses" || !service.tanggal_mulai) {
        throw new MekanikApiError("Servis belum berada dalam status Diproses.", 409);
      }
      if (completedAt < service.tanggal_mulai) {
        throw new MekanikApiError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      }

      await tx.servis.update({
        where: { id_servis: id },
        data: { hasil_servis: result, tanggal_selesai: completedAt, status_servis: "Selesai" },
      });
      await tx.penugasan_mekanik.updateMany({
        where: { id_mekanik: identity.id_mekanik, id_servis: id },
        data: { status_penugasan: "Selesai" },
      });

      const anotherProcessingService = await tx.penugasan_mekanik.findFirst({
        where: {
          id_mekanik: identity.id_mekanik,
          id_servis: { not: id },
          servis: { is: { status_servis: "Diproses" } },
        },
        select: { id_data_mekanik: true },
      });
      if (!anotherProcessingService) {
        await tx.mekanik.update({
          where: { id_mekanik: identity.id_mekanik },
          data: { status_ketersediaan: "Tersedia" },
        });
      }
      await tx.riwayat_status_servis.create({
        data: { id_servis: id, tahap: "Servis selesai", keterangan: result, waktu: completedAt },
      });
    });

    revalidatePath("/mekanik/pelaksanaan-servis");
    revalidatePath("/mekanik/dashboard");
    revalidatePath("/sa/status-servis");
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Servis belum dapat diselesaikan.");
  }
}
