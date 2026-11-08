import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const REPORT_TYPES = ["Laporan Transaksi", "Laporan Pelayanan Servis", "Statistik Pelayanan", "Laporan Bulanan"] as const;
export function parsePeriod(startValue: string | null, endValue: string | null) {
  if (!startValue || !endValue || !/^\d{4}-\d{2}-\d{2}$/.test(startValue) || !/^\d{4}-\d{2}-\d{2}$/.test(endValue)) return null;
  const start = new Date(`${startValue}T00:00:00.000Z`);
  const end = new Date(`${endValue}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || startValue > endValue) return null;
  return { start, end };
}
export async function buildOwnerReport(start: Date, end: Date) {
  const [transactions, services, cancelledServices] = await Promise.all([
    prisma.transaksi.findMany({
      where: { tanggal_transaksi: { gte: start, lte: end }, pembayaran: { status_pembayaran: "Lunas", konfirmasi_pembayaran: "Terkonfirmasi" } },
      include: {
        pembayaran: {
          include: {
            rincian_biaya: {
            include: { servis: { include: { kendaraan: { include: { customer: { include: { pengguna: true } } } } } } },
            },
          },
        },
      },
      orderBy: { tanggal_transaksi: "asc" },
    }),
    prisma.servis.findMany({ where: { tanggal_daftar: { gte: start, lte: end }, status_servis: { not: "Batal" } }, select: { id_servis: true, id_kendaraan: true, nomor_antrian: true, tanggal_daftar: true, tanggal_selesai: true, status_servis: true, kebutuhan_servis: true, keluhan: true, alasan_batal: true, kendaraan: { select: { nomor_plat: true, merek: true, tipe_kendaraan: true, customer: { select: { pengguna: { select: { nama: true } } } } } } }, orderBy: { tanggal_daftar: "asc" } }),
    prisma.servis.count({ where: { tanggal_daftar: { gte: start, lte: end }, status_servis: "Batal" } }),
  ]);
  const revenue = transactions.reduce((sum, row) => sum + Number(row.pembayaran.jumlah_bayar), 0);
  const statuses = [...new Set(services.map((x) => x.status_servis))].map((status) => ({ status, count: services.filter((x) => x.status_servis === status).length }));
  const completed = services.filter((x) => x.status_servis === "Selesai");
  const durations = completed.filter((x) => x.tanggal_selesai).map((x) => (new Date(x.tanggal_selesai!).getTime() - new Date(x.tanggal_daftar).getTime()) / 86400000);
  const statusGroups = { completed: completed.length, working: services.filter((x) => x.status_servis === "Diproses").length, waiting: services.filter((x) => x.status_servis !== "Diproses" && x.status_servis !== "Selesai").length };
  const normalizedTypes = services.map((x) => (x.kebutuhan_servis || x.keluhan).trim().replace(/\\s+/g, " "));
  const serviceTypes = [...new Set(normalizedTypes)].map((name) => ({ name, count: normalizedTypes.filter((x) => x.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID")).length })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 4).map((x) => ({ ...x, percent: services.length ? Math.round((x.count / services.length) * 100) : 0 }));
  return { totalServices: services.length, totalVehicles: new Set(services.map((x) => x.id_kendaraan)).size, revenue, transactions: transactions.map((x) => ({ id: x.id_transaksi, date: x.tanggal_transaksi, amount: Number(x.pembayaran.jumlah_bayar), plate: x.pembayaran.rincian_biaya.servis.kendaraan.nomor_plat, customer: x.pembayaran.rincian_biaya.servis.kendaraan.customer.pengguna.nama, method: x.pembayaran.metode_pembayaran, paymentId: x.id_pembayaran })), services: services.map((x) => ({ id: x.id_servis, queue: x.nomor_antrian, date: x.tanggal_daftar, customer: x.kendaraan.customer.pengguna.nama, vehicle: `${x.kendaraan.merek} ${x.kendaraan.tipe_kendaraan}`, plate: x.kendaraan.nomor_plat, status: x.status_servis, serviceType: x.kebutuhan_servis?.trim() || x.keluhan, cancellation: x.alasan_batal })), statuses, completed: completed.length, cancelled: cancelledServices, statusGroups, serviceTypes, averageDurationDays: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null };
}
export async function nextReportCode(tx: Prisma.TransactionClient) {
  const rows = await tx.laporan.findMany({ select: { id_laporan: true } });
  const used = new Set(rows.map((x) => x.id_laporan));
  for (let n = 1; n < 1000; n++) { const code = `L${String(n).padStart(3, "0")}`; if (!used.has(code)) return code; }
  throw new Error("Kode laporan telah habis.");
}
