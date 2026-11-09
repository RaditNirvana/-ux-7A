"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/customer-session";

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

export async function createServiceRegistrationAction(input: {
  id_kendaraan: string;
  jenis_layanan: string;
  tanggal_diinginkan: string;
  waktu_kedatangan: string;
  keluhan: string;
}): Promise<ActionResult<{ id_servis: string }>> {
  try {
    const customer = await requireCustomerContext();

    if (!input.id_kendaraan?.trim()) {
      return { success: false, error: "Kendaraan wajib dipilih." };
    }
    if (!input.jenis_layanan?.trim()) {
      return { success: false, error: "Jenis layanan wajib diisi." };
    }
    if (!input.tanggal_diinginkan?.trim()) {
      return { success: false, error: "Tanggal yang diinginkan wajib diisi." };
    }
    if (!input.waktu_kedatangan?.trim()) {
      return { success: false, error: "Waktu kedatangan wajib diisi." };
    }
    if (!input.keluhan?.trim()) {
      return { success: false, error: "Keluhan wajib diisi." };
    }

    // Verify vehicle belongs to customer
    const vehicle = await prisma.kendaraan.findUnique({
      where: { id_kendaraan: input.id_kendaraan },
      select: { id_customer: true },
    });

    if (!vehicle || vehicle.id_customer !== customer.id_customer) {
      return {
        success: false,
        error: "Kendaraan tidak ditemukan atau bukan milik Anda (403).",
      };
    }

    // Validate date not in past
    const desiredDate = new Date(`${input.tanggal_diinginkan}T00:00:00.000Z`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(input.tanggal_diinginkan);
    checkDate.setHours(0, 0, 0, 0);
    if (isNaN(desiredDate.getTime()) || checkDate < today) {
      return { success: false, error: "Tanggal tidak boleh di masa lalu." };
    }

    // Map jenis_layanan into keluhan, and waktu_kedatangan into catatan_kedatangan
    const encodedKeluhan = `[${input.jenis_layanan.trim()}] ${input.keluhan.trim()}`.slice(0, 300);
    const encodedCatatan = `Waktu kedatangan: ${input.waktu_kedatangan.trim()}`.slice(0, 255);

    const newService = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE "servis" IN SHARE ROW EXCLUSIVE MODE`;

      const duplicateWindow = new Date(Date.now() - 5 * 60 * 1000);
      const recentDuplicate = await tx.servis.findFirst({
        where: {
          id_kendaraan: input.id_kendaraan,
          tanggal_daftar: desiredDate,
          keluhan: encodedKeluhan,
          catatan_kedatangan: encodedCatatan,
          status_verifikasi: "Menunggu",
          status_servis: "Menunggu Verifikasi",
          riwayat_status_servis: {
            some: {
              tahap: "Pendaftaran diajukan",
              waktu: { gte: duplicateWindow },
            },
          },
        },
        select: { id_servis: true },
      });

      if (recentDuplicate) return recentDuplicate;

      // Find all services to determine next available ID
      const allServices = await tx.servis.findMany({
        select: { id_servis: true, nomor_antrian: true },
      });

      let maxIdNum = 0;
      let maxAntrianNum = 0;
      for (const item of allServices) {
        const idNum = parseInt(item.id_servis.replace(/\D/g, ""), 10);
        if (!isNaN(idNum) && idNum > maxIdNum) maxIdNum = idNum;

        const antrianNum = parseInt(item.nomor_antrian.replace(/\D/g, ""), 10);
        if (!isNaN(antrianNum) && antrianNum > maxAntrianNum) {
          maxAntrianNum = antrianNum;
        }
      }

      const nextId = `S${String(maxIdNum + 1).padStart(3, "0")}`;
      const nextAntrian = `A-${String(maxAntrianNum + 1).padStart(3, "0")}`;

      const created = await tx.servis.create({
        data: {
          id_servis: nextId,
          nomor_antrian: nextAntrian,
          tanggal_daftar: desiredDate,
          keluhan: encodedKeluhan,
          catatan_kedatangan: encodedCatatan,
          status_verifikasi: "Menunggu",
          status_servis: "Menunggu Verifikasi",
          id_kendaraan: input.id_kendaraan,
        },
      });

      await tx.riwayat_status_servis.create({
        data: {
          id_servis: nextId,
          tahap: "Pendaftaran diajukan",
          keterangan: "Pendaftaran servis online berhasil diajukan oleh customer",
          waktu: new Date(),
        },
      });

      return created;
    });

    revalidatePath("/customer/service-registration");
    revalidatePath("/customer/dashboard");
    return { success: true, data: { id_servis: newService.id_servis } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal membuat pendaftaran servis.",
    };
  }
}

export async function updateServiceRegistrationAction(
  id_servis: string,
  input: {
    jenis_layanan: string;
    tanggal_diinginkan: string;
    waktu_kedatangan: string;
    keluhan: string;
  }
): Promise<ActionResult<{ id_servis: string }>> {
  try {
    const customer = await requireCustomerContext();

    const existing = await prisma.servis.findUnique({
      where: { id_servis },
      include: { kendaraan: true },
    });

    if (!existing || existing.kendaraan.id_customer !== customer.id_customer) {
      return { success: false, error: "Akses ditolak (403)." };
    }

    if (existing.status_servis !== "Menunggu Verifikasi") {
      return {
        success: false,
        error: "Pendaftaran servis tidak dapat diubah pada status saat ini.",
      };
    }

    if (!input.jenis_layanan?.trim()) {
      return { success: false, error: "Jenis layanan wajib diisi." };
    }
    if (!input.tanggal_diinginkan?.trim()) {
      return { success: false, error: "Tanggal yang diinginkan wajib diisi." };
    }
    if (!input.waktu_kedatangan?.trim()) {
      return { success: false, error: "Waktu kedatangan wajib diisi." };
    }
    if (!input.keluhan?.trim()) {
      return { success: false, error: "Keluhan wajib diisi." };
    }

    const desiredDate = new Date(`${input.tanggal_diinginkan}T00:00:00.000Z`);
    if (isNaN(desiredDate.getTime())) {
      return { success: false, error: "Format tanggal tidak valid." };
    }

    const encodedKeluhan = `[${input.jenis_layanan.trim()}] ${input.keluhan.trim()}`.slice(0, 300);
    const encodedCatatan = `Waktu kedatangan: ${input.waktu_kedatangan.trim()}`.slice(0, 255);

    await prisma.$transaction(async (tx) => {
      const changed = await tx.servis.updateMany({
        where: {
          id_servis,
          id_kendaraan: existing.kendaraan.id_kendaraan,
          status_servis: "Menunggu Verifikasi",
        },
        data: {
          tanggal_daftar: desiredDate,
          keluhan: encodedKeluhan,
          catatan_kedatangan: encodedCatatan,
        },
      });
      if (changed.count !== 1) {
        throw new Error("Pendaftaran servis tidak lagi dapat diubah.");
      }

      await tx.riwayat_status_servis.create({
        data: {
          id_servis,
          tahap: "Pendaftaran diubah",
          keterangan: "Perubahan jadwal dan keluhan oleh customer",
          waktu: new Date(),
        },
      });
    });

    revalidatePath("/customer/service-registration");
    revalidatePath("/customer/dashboard");
    return { success: true, data: { id_servis } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memperbarui pendaftaran servis.",
    };
  }
}

export async function cancelServiceRegistrationAction(
  id_servis: string
): Promise<ActionResult<{ id_servis: string }>> {
  try {
    const customer = await requireCustomerContext();

    const existing = await prisma.servis.findUnique({
      where: { id_servis },
      include: { kendaraan: true },
    });

    if (!existing || existing.kendaraan.id_customer !== customer.id_customer) {
      return { success: false, error: "Akses ditolak (403)." };
    }

    if (existing.status_servis === "Batal" || existing.status_servis === "Selesai") {
      return {
        success: false,
        error: "Servis sudah selesai atau sudah dibatalkan.",
      };
    }

    await prisma.$transaction(async (tx) => {
      const changed = await tx.servis.updateMany({
        where: {
          id_servis,
          id_kendaraan: existing.kendaraan.id_kendaraan,
          status_servis: { notIn: ["Batal", "Selesai"] },
        },
        data: {
          status_servis: "Batal",
          alasan_batal: "Dibatalkan oleh customer",
        },
      });
      if (changed.count !== 1) {
        throw new Error("Servis sudah selesai atau sudah dibatalkan.");
      }

      await tx.riwayat_status_servis.create({
        data: {
          id_servis,
          tahap: "Servis dibatalkan",
          keterangan: "Dibatalkan oleh customer",
          waktu: new Date(),
        },
      });
    });

    revalidatePath("/customer/service-registration");
    revalidatePath("/customer/dashboard");
    return { success: true, data: { id_servis } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal membatalkan pendaftaran servis.",
    };
  }
}

export async function requestCancelServiceRegistrationAction(
  id_servis: string
): Promise<ActionResult<{ id_servis: string }>> {
  try {
    const customer = await requireCustomerContext();

    const existing = await prisma.servis.findUnique({
      where: { id_servis },
      include: { kendaraan: true },
    });

    if (!existing || existing.kendaraan.id_customer !== customer.id_customer) {
      return { success: false, error: "Akses ditolak (403)." };
    }

    if (["Batal", "Selesai"].includes(existing.status_servis)) {
      return { success: false, error: "Servis sudah selesai atau dibatalkan." };
    }

    const alasan = "Customer mengajukan pembatalan servis.";
    await prisma.$transaction(async (tx) => {
      const changed = await tx.servis.updateMany({
        where: {
          id_servis,
          id_kendaraan: existing.kendaraan.id_kendaraan,
          status_servis: { notIn: ["Batal", "Selesai"] },
        },
        data: { status_servis: "Batal", alasan_batal: alasan },
      });
      if (changed.count !== 1) {
        throw new Error("Servis sudah selesai atau dibatalkan.");
      }
      await tx.riwayat_status_servis.create({
        data: {
          id_servis,
          tahap: "Servis dibatalkan",
          keterangan: alasan,
          waktu: new Date(),
        },
      });
    });

    revalidatePath("/customer/service-registration");
    return { success: true, data: { id_servis } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mengajukan pembatalan servis.",
    };
  }
}
