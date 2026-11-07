import { revalidatePath } from "next/cache";
import { apiErrorResponse, forbiddenResponse, getMekanikIdentity, MekanikApiError, requireOwnedService } from "@/lib/mekanik-api";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getMekanikIdentity();
  if (!identity) return forbiddenResponse();

  try {
    const { id } = await context.params;
    await prisma.$transaction(async (tx) => {
      await requireOwnedService(tx, identity.id_mekanik, id);
      const service = await tx.servis.findUnique({
        where: { id_servis: id },
        include: { rincian_biaya: { include: { persetujuan_biaya: true } } },
      });

      if (
        !service?.rincian_biaya ||
        service.rincian_biaya.persetujuan_biaya?.status_persetujuan !== "Setuju"
      ) {
        throw new MekanikApiError("Biaya servis belum disetujui customer atau rincian belum tersedia.", 409);
      }
      if (service.status_servis === "Siap Dikerjakan") return;
      if (service.status_servis !== "Menunggu Persetujuan") {
        throw new MekanikApiError("Servis belum berada pada tahap menunggu persetujuan biaya.", 409);
      }

      await tx.servis.update({
        where: { id_servis: id },
        data: { status_servis: "Siap Dikerjakan" },
      });
      await tx.riwayat_status_servis.create({
        data: {
          id_servis: id,
          tahap: "Servis siap dikerjakan",
          keterangan: "Persetujuan biaya diterima; mekanik mengonfirmasi servis siap dimulai.",
        },
      });
    });

    revalidatePath("/mekanik/konfirmasi-servis");
    revalidatePath("/mekanik/pelaksanaan-servis");
    revalidatePath("/mekanik/dashboard");
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Konfirmasi servis belum dapat disimpan.");
  }
}
