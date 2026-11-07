"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session-user";
import { prisma } from "@/lib/prisma";

export type ServiceAdvisorActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

class ServiceAdvisorActionError extends Error {}

const serviceAdvisorPaths = [
  "/sa/dashboard",
  "/sa/verifikasi",
  "/sa/penugasan",
  "/sa/hasil-pemeriksaan",
  "/sa/data-mekanik",
  "/sa/stok-sparepart",
  "/sa/pemesanan-sparepart",
  "/sa/status-servis",
];

async function getServiceAdvisorId() {
  const user = await getSessionUser();

  if (!user || user.role !== "Service Advisor") {
    throw new ServiceAdvisorActionError("Sesi service advisor tidak valid.");
  }

  const advisor = await prisma.service_advisor.findUnique({
    where: { id_pengguna: user.id_pengguna },
    select: { id_sa: true },
  });

  if (!advisor) {
    throw new ServiceAdvisorActionError("Akun service advisor tidak ditemukan.");
  }

  return advisor.id_sa;
}

async function runMutation(
  fallbackMessage: string,
  operation: (idSa: string) => Promise<void>,
): Promise<ServiceAdvisorActionResult> {
  try {
    const idSa = await getServiceAdvisorId();
    await operation(idSa);

    for (const path of serviceAdvisorPaths) {
      revalidatePath(path);
    }

    return { success: true, message: "Perubahan berhasil disimpan." };
  } catch (error) {
    if (error instanceof ServiceAdvisorActionError) {
      return { success: false, message: error.message };
    }

    console.error("Service advisor mutation failed:", error);
    return { success: false, message: fallbackMessage };
  }
}

function requiredText(formData: FormData, name: string, label: string) {
  const value = formData.get(name);

  if (typeof value !== "string" || !value.trim()) {
    throw new ServiceAdvisorActionError(`${label} wajib diisi.`);
  }

  return value.trim();
}

function optionalText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function nonNegativeInteger(
  formData: FormData,
  name: string,
  label: string,
  allowZero = true,
) {
  const rawValue = requiredText(formData, name, label);
  const value = Number(rawValue);

  if (
    !Number.isInteger(value) ||
    value < (allowZero ? 0 : 1) ||
    value > 2_147_483_647
  ) {
    throw new ServiceAdvisorActionError(
      `${label} harus berupa bilangan bulat ${allowZero ? "nol atau lebih" : "lebih dari nol"}.`,
    );
  }

  return value;
}

function databaseDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ServiceAdvisorActionError(`${label} tidak valid.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ServiceAdvisorActionError(`${label} tidak valid.`);
  }

  return date;
}

function nextCode(prefix: string, ids: string[], width: number) {
  const largest = ids.reduce((max, id) => {
    if (!id.startsWith(prefix)) return max;

    const suffix = id.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) return max;

    return Math.max(max, Number(suffix));
  }, 0);

  const next = largest + 1;
  const code = `${prefix}${String(next).padStart(width, "0")}`;

  if (code.length > (prefix === "SP-" || prefix === "PO-" ? 6 : 4)) {
    throw new ServiceAdvisorActionError("Batas nomor data telah tercapai.");
  }

  return code;
}

export async function verifyServiceRegistration(
  idServis: string,
): Promise<ServiceAdvisorActionResult> {
  return runMutation("Pendaftaran belum dapat diverifikasi.", async (idSa) => {
    await prisma.$transaction(async (tx) => {
      const service = await tx.servis.findUnique({
        where: { id_servis: idServis },
        select: { status_verifikasi: true, status_servis: true, id_sa: true },
      });

      if (
        !service ||
        service.status_verifikasi !== "Menunggu" ||
        service.status_servis !== "Menunggu Verifikasi" ||
        (service.id_sa && service.id_sa !== idSa)
      ) {
        throw new ServiceAdvisorActionError(
          "Pendaftaran sudah diproses atau tidak ditemukan.",
        );
      }

      await tx.servis.update({
        where: { id_servis: idServis },
        data: {
          status_verifikasi: "Terverifikasi",
          status_servis: "Menunggu Penugasan",
          id_sa: idSa,
        },
      });

      await tx.riwayat_status_servis.create({
        data: {
          id_servis: idServis,
          tahap: "Pendaftaran diverifikasi",
          keterangan: "Data customer dan kendaraan telah diperiksa.",
        },
      });
    });
  });
}

export async function assignMechanic(
  idServis: string,
  idMekanik: string,
): Promise<ServiceAdvisorActionResult> {
  return runMutation("Penugasan mekanik belum dapat disimpan.", async (idSa) => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE "penugasan_mekanik" IN SHARE ROW EXCLUSIVE MODE`;
      await tx.$executeRaw`LOCK TABLE "mekanik" IN SHARE ROW EXCLUSIVE MODE`;

      const [service, mechanic] = await Promise.all([
        tx.servis.findUnique({
          where: { id_servis: idServis },
          select: { status_servis: true, id_sa: true },
        }),
        tx.mekanik.findUnique({
          where: { id_mekanik: idMekanik },
          select: {
            status_ketersediaan: true,
            pengguna: { select: { login: true } },
          },
        }),
      ]);

      if (
        !service ||
        service.status_servis !== "Menunggu Penugasan" ||
        (service.id_sa && service.id_sa !== idSa)
      ) {
        throw new ServiceAdvisorActionError(
          "Servis ini tidak lagi menunggu penugasan.",
        );
      }

      if (
        !mechanic ||
        mechanic.status_ketersediaan !== "Tersedia" ||
        mechanic.pengguna.login !== "Aktif"
      ) {
        throw new ServiceAdvisorActionError(
          "Mekanik tidak tersedia untuk penugasan baru.",
        );
      }

      const assignments = await tx.penugasan_mekanik.findMany({
        select: { id_data_mekanik: true },
      });
      const activeAssignments = await tx.penugasan_mekanik.count({
        where: {
          id_mekanik: idMekanik,
          status_penugasan: { in: ["Ditugaskan", "Diproses"] },
        },
      });
      if (activeAssignments > 0) {
        throw new ServiceAdvisorActionError(
          "Mekanik masih memiliki penugasan aktif.",
        );
      }
      const idPenugasan = nextCode(
        "D",
        assignments.map(({ id_data_mekanik }) => id_data_mekanik),
        3,
      );

      await tx.penugasan_mekanik.create({
        data: {
          id_data_mekanik: idPenugasan,
          id_servis: idServis,
          id_mekanik: idMekanik,
        },
      });

      await tx.servis.update({
        where: { id_servis: idServis },
        data: { status_servis: "Ditugaskan", id_sa: idSa },
      });

      await tx.riwayat_status_servis.create({
        data: {
          id_servis: idServis,
          tahap: "Mekanik ditugaskan",
          keterangan: "Penugasan mekanik berhasil disimpan.",
        },
      });
    });
  });
}

type InspectionPartInput = {
  id_sparepart: string;
  jumlah_sparepart: number;
  bagian_diganti: string;
};

function parseInspectionParts(value: FormDataEntryValue | null): InspectionPartInput[] {
  if (typeof value !== "string") {
    throw new ServiceAdvisorActionError("Daftar kebutuhan sparepart tidak valid.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ServiceAdvisorActionError("Daftar kebutuhan sparepart tidak valid.");
  }

  if (!Array.isArray(parsed)) {
    throw new ServiceAdvisorActionError("Daftar kebutuhan sparepart tidak valid.");
  }

  const parts: InspectionPartInput[] = [];

  for (const item of parsed) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("id_sparepart" in item) ||
      !("jumlah_sparepart" in item) ||
      !("bagian_diganti" in item) ||
      typeof item.id_sparepart !== "string" ||
      typeof item.jumlah_sparepart !== "number" ||
      !Number.isInteger(item.jumlah_sparepart) ||
      item.jumlah_sparepart < 1 ||
      typeof item.bagian_diganti !== "string"
    ) {
      throw new ServiceAdvisorActionError("Daftar kebutuhan sparepart tidak valid.");
    }

    parts.push({
      id_sparepart: item.id_sparepart,
      jumlah_sparepart: item.jumlah_sparepart,
      bagian_diganti: item.bagian_diganti.trim().slice(0, 100),
    });
  }

  return parts;
}

export async function saveServiceInspection(
  formData: FormData,
): Promise<ServiceAdvisorActionResult> {
  return runMutation("Hasil pemeriksaan belum dapat disimpan.", async (idSa) => {
    const idServis = requiredText(formData, "id_servis", "Servis");
    const parts = parseInspectionParts(formData.get("parts"));

    await prisma.$transaction(async (tx) => {
      const service = await tx.servis.findUnique({
        where: { id_servis: idServis },
        select: {
          status_servis: true,
          id_sa: true,
          kebutuhan_servis: true,
          hasil_pemeriksaan: true,
          penggunaan_sparepart: {
            select: { id_sparepart: true, jumlah_sparepart: true, bagian_diganti: true },
          },
        },
      });

      if (
        !service ||
        service.status_servis !== "Diperiksa" ||
        (service.id_sa && service.id_sa !== idSa) ||
        !service.hasil_pemeriksaan ||
        !service.kebutuhan_servis
      ) {
        throw new ServiceAdvisorActionError(
          "Servis ini belum siap untuk dicatat hasil pemeriksaannya.",
        );
      }

      const inspectedParts = service.penggunaan_sparepart;
      if (parts.length !== inspectedParts.length || parts.some((part) =>
        !inspectedParts.some((stored) => stored.id_sparepart === part.id_sparepart &&
          stored.jumlah_sparepart === part.jumlah_sparepart &&
          stored.bagian_diganti === (part.bagian_diganti || null)))) {
        throw new ServiceAdvisorActionError("Kebutuhan sparepart berbeda dari hasil pemeriksaan mekanik.");
      }
      const sparepartIds = [...new Set(inspectedParts.map(({ id_sparepart }) => id_sparepart))];
      const stock = await tx.sparepart.findMany({
        where: { id_sparepart: { in: sparepartIds } },
        select: {
          id_sparepart: true,
          stok: true,
          nama_sparepart: true,
          status_aktif: true,
        },
      });

      const unavailable = [] as string[];
      for (const part of inspectedParts) {
        const stockItem = stock.find(
          ({ id_sparepart }) => id_sparepart === part.id_sparepart,
        );

        if (!stockItem || stockItem.status_aktif !== "Aktif" || stockItem.stok < part.jumlah_sparepart) {
          unavailable.push(stockItem?.nama_sparepart ?? part.id_sparepart);
        }
      }

      const reason = unavailable.length
        ? `Servis dibatalkan karena stok tidak mencukupi: ${unavailable.join(", ")}.`
        : null;
      await tx.servis.update({
        where: { id_servis: idServis },
        data: reason
          ? { status_servis: "Batal", alasan_batal: reason, id_sa: idSa }
          : { status_servis: "Diperiksa", id_sa: idSa },
      });

      await tx.riwayat_status_servis.create({
        data: {
          id_servis: idServis,
          tahap: reason ? "Servis dibatalkan" : "Konfirmasi kebutuhan servis",
          keterangan: reason ?? service.kebutuhan_servis,
        },
      });
    });
  });
}

export async function saveMechanic(
  _formData: FormData,
): Promise<ServiceAdvisorActionResult> {
  void _formData;
  return runMutation("Data mekanik hanya dapat dibaca oleh Service Advisor.", async () => {
    throw new ServiceAdvisorActionError("Akses ditolak (403). Data mekanik bersifat hanya-baca.");
  });
}

export async function deactivateMechanic(
  _idMekanik: string,
): Promise<ServiceAdvisorActionResult> {
  void _idMekanik;
  return runMutation("Data mekanik hanya dapat dibaca oleh Service Advisor.", async () => {
    throw new ServiceAdvisorActionError("Akses ditolak (403). Data mekanik bersifat hanya-baca.");
  });
}

export async function saveSparepart(
  formData: FormData,
): Promise<ServiceAdvisorActionResult> {
  return runMutation("Data stok sparepart belum dapat disimpan.", async (idSa) => {
    const idSparepart = optionalText(formData, "id_sparepart");
    const name = requiredText(formData, "nama_sparepart", "Nama sparepart");
    const category = requiredText(formData, "kategori", "Kategori");
    const unit = requiredText(formData, "satuan", "Satuan");
    const location = optionalText(formData, "lokasi_penyimpanan");
    const quantity = nonNegativeInteger(formData, "stok", "Jumlah stok");
    const minimum = nonNegativeInteger(
      formData,
      "batas_minimum",
      "Batas stok minimum",
    );

    if (name.length > 100 || category.length > 30 || unit.length > 15 || location.length > 50) {
      throw new ServiceAdvisorActionError("Data sparepart melebihi batas panjang.");
    }

    if (idSparepart) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`LOCK TABLE "sparepart" IN SHARE ROW EXCLUSIVE MODE`;
        const existing = await tx.sparepart.findUnique({
          where: { id_sparepart: idSparepart },
          select: {
            stok: true,
            nama_sparepart: true,
            status_aktif: true,
          },
        });

        if (!existing || existing.status_aktif !== "Aktif") {
          throw new ServiceAdvisorActionError("Data sparepart tidak ditemukan.");
        }

        await tx.sparepart.update({
          where: { id_sparepart: idSparepart },
          data: {
            nama_sparepart: name,
            kategori: category,
            satuan: unit,
            stok: quantity,
            batas_minimum: minimum,
            lokasi_penyimpanan: location || null,
            tanggal_diperbarui: new Date(),
          },
        });

        if (quantity !== existing.stok) {
          await tx.riwayat_stok.create({
            data: {
              id_sparepart: idSparepart,
              jenis: "Penyesuaian",
              jumlah_sebelum: existing.stok,
              jumlah_sesudah: quantity,
              catatan: optionalText(formData, "catatan") || "Penyesuaian stok.",
              id_sa: idSa,
            },
          });
        }
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE "sparepart" IN SHARE ROW EXCLUSIVE MODE`;
      const parts = await tx.sparepart.findMany({
        select: { id_sparepart: true },
      });
      const newId = nextCode(
        "SP-",
        parts.map(({ id_sparepart }) => id_sparepart),
        3,
      );

      await tx.sparepart.create({
        data: {
          id_sparepart: newId,
          nama_sparepart: name,
          kategori: category,
          satuan: unit,
          stok: quantity,
          batas_minimum: minimum,
          lokasi_penyimpanan: location || null,
          status_aktif: "Aktif",
        },
      });

      await tx.riwayat_stok.create({
        data: {
          id_sparepart: newId,
          jenis: "Stok awal",
          jumlah_sebelum: 0,
          jumlah_sesudah: quantity,
          catatan: optionalText(formData, "catatan") || "Stok sparepart baru.",
          id_sa: idSa,
        },
      });
    });
  });
}

export async function deactivateSparepart(
  idSparepart: string,
): Promise<ServiceAdvisorActionResult> {
  return runMutation("Sparepart belum dapat dihapus.", async () => {
    const result = await prisma.sparepart.updateMany({
      where: { id_sparepart: idSparepart, status_aktif: "Aktif" },
      data: { status_aktif: "Tidak aktif" },
    });

    if (result.count !== 1) {
      throw new ServiceAdvisorActionError("Sparepart tidak ditemukan atau sudah dihapus.");
    }
  });
}

export async function createSparepartOrder(
  formData: FormData,
): Promise<ServiceAdvisorActionResult> {
  return runMutation("Pemesanan sparepart belum dapat disimpan.", async (idSa) => {
    const idSparepart = requiredText(formData, "id_sparepart", "Sparepart");
    const idSupplier = requiredText(formData, "id_supplier", "Supplier");
    const quantity = nonNegativeInteger(
      formData,
      "jumlah",
      "Jumlah pesanan",
      false,
    );
    const orderDateText = requiredText(
      formData,
      "tanggal_pemesanan",
      "Tanggal pemesanan",
    );
    const estimateText = optionalText(formData, "estimasi_tiba");
    const note = optionalText(formData, "catatan");
    const orderDate = databaseDate(orderDateText, "Tanggal pemesanan");
    const estimate = estimateText
      ? databaseDate(estimateText, "Estimasi tiba")
      : null;

    if (note.length > 255) {
      throw new ServiceAdvisorActionError("Catatan terlalu panjang.");
    }

    if (estimate && estimate < orderDate) {
      throw new ServiceAdvisorActionError(
        "Estimasi tiba tidak boleh sebelum tanggal pemesanan.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE "pemesanan_sparepart" IN SHARE ROW EXCLUSIVE MODE`;
      const orders = await tx.pemesanan_sparepart.findMany({
        select: { id_pemesanan: true },
      });
      const newId = nextCode(
        "PO-",
        orders.map(({ id_pemesanan }) => id_pemesanan),
        3,
      );

      await tx.pemesanan_sparepart.create({
        data: {
          id_pemesanan: newId,
          id_sparepart: idSparepart,
          id_supplier: idSupplier,
          jumlah: quantity,
          tanggal_pemesanan: orderDate,
          estimasi_tiba: estimate,
          status_pemesanan: "Draf",
          catatan: note || null,
          id_sa: idSa,
        },
      });
    });
  });
}

export async function updateSparepartOrder(
  idPemesanan: string,
  formData: FormData,
): Promise<ServiceAdvisorActionResult> {
  return runMutation("Perubahan pemesanan sparepart belum dapat disimpan.", async (idSa) => {
    const idSparepart = requiredText(formData, "id_sparepart", "Sparepart");
    const idSupplier = requiredText(formData, "id_supplier", "Supplier");
    const quantity = nonNegativeInteger(
      formData,
      "jumlah",
      "Jumlah pesanan",
      false,
    );
    const orderDate = databaseDate(
      requiredText(formData, "tanggal_pemesanan", "Tanggal pemesanan"),
      "Tanggal pemesanan",
    );
    const estimateText = optionalText(formData, "estimasi_tiba");
    const estimate = estimateText
      ? databaseDate(estimateText, "Estimasi tiba")
      : null;
    const status = requiredText(formData, "status_pemesanan", "Status pemesanan");
    const note = optionalText(formData, "catatan");

    if (!["Draf", "Dipesan", "Diterima", "Dibatalkan"].includes(status)) {
      throw new ServiceAdvisorActionError("Status pemesanan tidak valid.");
    }
    if (note.length > 255) {
      throw new ServiceAdvisorActionError("Catatan terlalu panjang.");
    }
    if (estimate && estimate < orderDate) {
      throw new ServiceAdvisorActionError(
        "Estimasi tiba tidak boleh sebelum tanggal pemesanan.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE "pemesanan_sparepart" IN SHARE ROW EXCLUSIVE MODE`;
      const order = await tx.pemesanan_sparepart.findUnique({
        where: { id_pemesanan: idPemesanan },
        select: {
          status_pemesanan: true,
          id_sparepart: true,
          jumlah: true,
        },
      });

      if (!order) {
        throw new ServiceAdvisorActionError("Pemesanan tidak ditemukan.");
      }
      if (order.status_pemesanan === "Diterima") {
        throw new ServiceAdvisorActionError(
          "Pemesanan yang sudah diterima tidak dapat diubah.",
        );
      }

      if (status === "Diterima") {
        await tx.$queryRaw<{ id_sparepart: string }[]>`
          SELECT "id_sparepart"
          FROM "sparepart"
          WHERE "id_sparepart" = ${idSparepart}
          FOR UPDATE
        `;
        const part = await tx.sparepart.findUnique({
          where: { id_sparepart: idSparepart },
          select: { stok: true, status_aktif: true },
        });

        if (!part || part.status_aktif !== "Aktif") {
          throw new ServiceAdvisorActionError(
            "Sparepart pemesanan tidak aktif atau tidak ditemukan.",
          );
        }

        await tx.sparepart.update({
          where: { id_sparepart: idSparepart },
          data: { stok: { increment: quantity }, tanggal_diperbarui: new Date() },
        });
        await tx.riwayat_stok.create({
          data: {
            id_sparepart: idSparepart,
            jenis: "Penerimaan pesanan",
            jumlah_sebelum: part.stok,
            jumlah_sesudah: part.stok + quantity,
            catatan: `Penerimaan pesanan ${idPemesanan}.`,
            id_sa: idSa,
          },
        });
      }

      await tx.pemesanan_sparepart.update({
        where: { id_pemesanan: idPemesanan },
        data: {
          id_sparepart: idSparepart,
          id_supplier: idSupplier,
          jumlah: quantity,
          tanggal_pemesanan: orderDate,
          estimasi_tiba: estimate,
          status_pemesanan: status,
          catatan: note || null,
        },
      });
    });
  });
}

export async function deleteSparepartOrder(
  idPemesanan: string,
): Promise<ServiceAdvisorActionResult> {
  return runMutation("Pemesanan sparepart belum dapat dihapus.", async () => {
    await prisma.$transaction(async (tx) => {
      const order = await tx.pemesanan_sparepart.findUnique({
        where: { id_pemesanan: idPemesanan },
        select: {
          status_pemesanan: true,
          penggunaan_sparepart: { select: { id_servis: true } },
        },
      });

      if (!order) {
        throw new ServiceAdvisorActionError("Pemesanan tidak ditemukan.");
      }
      if (order.status_pemesanan === "Diterima") {
        throw new ServiceAdvisorActionError(
          "Pemesanan yang sudah diterima tidak dapat dihapus karena stok telah diperbarui.",
        );
      }
      if (order.penggunaan_sparepart.length > 0) {
        throw new ServiceAdvisorActionError(
          "Pemesanan ini terhubung dengan kebutuhan servis dan tidak dapat dihapus.",
        );
      }

      await tx.pemesanan_sparepart.delete({
        where: { id_pemesanan: idPemesanan },
      });
    });
  });
}
