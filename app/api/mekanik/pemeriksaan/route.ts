import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  forbiddenResponse,
  getMekanikIdentity,
  MekanikApiError,
  requireOwnedService,
} from "@/lib/mekanik-api";
import { getMekanikInspectionData } from "@/lib/mekanik-inspection-data";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const identity = await getMekanikIdentity();
    if (!identity) return forbiddenResponse();
    return Response.json(await getMekanikInspectionData(identity.id_mekanik));
  } catch (error) {
    return apiErrorResponse(error, "Data pemeriksaan belum dapat dimuat.");
  }
}

type InspectionPartInput = {
  id_sparepart: string;
  jumlah_sparepart: number;
  bagian_diganti: string;
};

export async function PUT(request: NextRequest) {
  const identity = await getMekanikIdentity();
  if (!identity) return forbiddenResponse();

  try {
    const parsed: unknown = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new MekanikApiError("Data pemeriksaan tidak valid.");
    }
    const body = parsed as Record<string, unknown>;
    const idServis = typeof body.id_servis === "string" ? body.id_servis : "";
    const hasil = typeof body.hasil_pemeriksaan === "string" ? body.hasil_pemeriksaan.trim() : "";
    const kebutuhan = typeof body.kebutuhan_servis === "string" ? body.kebutuhan_servis.trim() : "";
    const rawParts = Array.isArray(body.parts) ? body.parts : null;

    if (!idServis || !hasil || !kebutuhan || hasil.length > 300 || kebutuhan.length > 300 || !rawParts) {
      throw new MekanikApiError("Hasil pemeriksaan, kebutuhan servis, dan daftar sparepart wajib valid.");
    }

    const parts: InspectionPartInput[] = rawParts.map((value: unknown) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new MekanikApiError("Data sparepart tidak valid.");
      }
      const part = value as Record<string, unknown>;
      if (
        typeof part.id_sparepart !== "string" ||
        typeof part.jumlah_sparepart !== "number" ||
        !Number.isInteger(part.jumlah_sparepart) ||
        part.jumlah_sparepart < 1 ||
        typeof part.bagian_diganti !== "string" ||
        part.bagian_diganti.length > 100
      ) {
        throw new MekanikApiError("Data sparepart tidak valid.");
      }
      return {
        id_sparepart: part.id_sparepart,
        jumlah_sparepart: part.jumlah_sparepart,
        bagian_diganti: part.bagian_diganti.trim(),
      };
    });

    if (new Set(parts.map((part) => part.id_sparepart)).size !== parts.length) {
      throw new MekanikApiError("Sparepart tidak boleh dipilih lebih dari satu kali.");
    }

    await prisma.$transaction(async (tx) => {
      await requireOwnedService(tx, identity.id_mekanik, idServis);
      const service = await tx.servis.findUnique({
        where: { id_servis: idServis },
        select: { status_servis: true },
      });
      if (!service || service.status_servis !== "Diperiksa") {
        throw new MekanikApiError("Mulai pemeriksaan sebelum menyimpan hasil.");
      }

      const selectedParts = parts.length
        ? await tx.sparepart.findMany({
            where: { id_sparepart: { in: parts.map((part) => part.id_sparepart) }, status_aktif: "Aktif" },
            select: { id_sparepart: true, stok: true },
          })
        : [];
      if (selectedParts.length !== parts.length) {
        throw new MekanikApiError("Sparepart aktif tidak ditemukan.");
      }

      await tx.servis.update({
        where: { id_servis: idServis },
        data: {
          hasil_pemeriksaan: hasil,
          kebutuhan_servis: kebutuhan,
          status_servis: "Diperiksa",
        },
      });

      await tx.penggunaan_sparepart.deleteMany({ where: { id_servis: idServis } });
      for (const part of parts) {
        const sparepart = selectedParts.find(({ id_sparepart }) => id_sparepart === part.id_sparepart);
        const availability = sparepart && sparepart.stok >= part.jumlah_sparepart
          ? "Tersedia"
          : "Tidak tersedia";
        await tx.penggunaan_sparepart.create({
          data: {
            id_servis: idServis,
            id_sparepart: part.id_sparepart,
            jumlah_sparepart: part.jumlah_sparepart,
            bagian_diganti: part.bagian_diganti || null,
            status_ketersediaan_sparepart: availability,
          },
        });
      }

      await tx.riwayat_status_servis.create({
        data: {
          id_servis: idServis,
          tahap: "Hasil pemeriksaan dicatat",
          keterangan: kebutuhan,
        },
      });
    });

    revalidatePath("/mekanik/pemeriksaan");
    revalidatePath("/mekanik/konfirmasi-servis");
    revalidatePath("/sa/hasil-pemeriksaan");
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Hasil pemeriksaan belum dapat disimpan.");
  }
}
