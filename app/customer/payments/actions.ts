"use server";

import { prisma } from "@/lib/prisma";
import { getCustomerApiContext } from "@/lib/customer-session";

export async function readLatestPaymentStatus(serviceId: string) {
  const customer = await getCustomerApiContext();
  if (!customer) return { state: "error" as const, error: "Akses ditolak." };
  if (typeof serviceId !== "string" || !serviceId.trim()) {
    return { state: "error" as const, error: "Servis tidak ditemukan." };
  }

  const service = await prisma.servis.findFirst({
    where: {
      id_servis: serviceId,
      kendaraan: { id_customer: customer.id_customer },
    },
    select: {
      id_servis: true,
      rincian_biaya: {
        select: {
          pembayaran: {
            orderBy: { tanggal_pembayaran: "desc" },
            take: 1,
            select: {
              id_pembayaran: true,
              tanggal_pembayaran: true,
              status_pembayaran: true,
              konfirmasi_pembayaran: true,
              metode_pembayaran: true,
            },
          },
        },
      },
    },
  });

  if (!service?.rincian_biaya) {
    return { state: "error" as const, error: "Tagihan servis tidak ditemukan." };
  }

  const payment = service.rincian_biaya.pembayaran[0];
  if (!payment) return { state: "waiting" as const, payment: null };

  const latestEvent = await prisma.riwayat_status_servis.findFirst({
    where: {
      id_servis: service.id_servis,
      tahap: {
        in: [
          "Validasi pembayaran gagal",
          "Pembayaran dikonfirmasi",
          "Metode pembayaran dipilih ulang",
        ],
      },
      waktu: { gte: payment.tanggal_pembayaran },
    },
    orderBy: { waktu: "desc" },
    select: { tahap: true },
  });

  const state = payment.status_pembayaran === "Lunas"
    && payment.konfirmasi_pembayaran === "Terkonfirmasi"
    ? "success"
    : latestEvent?.tahap === "Validasi pembayaran gagal"
      ? "failure"
      : "waiting";

  return {
    state,
    payment: {
      id: payment.id_pembayaran,
      status: payment.status_pembayaran,
      confirmation: payment.konfirmasi_pembayaran,
      method: payment.metode_pembayaran,
      date: payment.tanggal_pembayaran.toISOString(),
    },
  };
}
