import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  forbiddenResponse,
  getMekanikIdentity,
  MekanikApiError,
  requireOwnedService,
} from "@/lib/mekanik-api";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
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
        select: { status_servis: true, tanggal_pemeriksaan: true },
      });
      if (!service || !["Ditugaskan", "Diperiksa"].includes(service.status_servis)) {
        throw new MekanikApiError("Servis ini tidak dapat mulai diperiksa.");
      }
      if (service.status_servis === "Ditugaskan") {
        const startedAt = new Date();
        await tx.servis.update({
          where: { id_servis: id },
          data: { tanggal_pemeriksaan: startedAt, status_servis: "Diperiksa" },
        });
        await tx.riwayat_status_servis.create({
          data: {
            id_servis: id,
            tahap: "Pemeriksaan dimulai",
            keterangan: "Mekanik memulai pemeriksaan kendaraan.",
            waktu: startedAt,
          },
        });
      } else if (!service.tanggal_pemeriksaan) {
        throw new MekanikApiError("Tanggal pemeriksaan belum tersedia.");
      }
    });

    revalidatePath("/mekanik/pemeriksaan");
    revalidatePath("/mekanik/penugasan");
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Pemeriksaan belum dapat dimulai.");
  }
}
