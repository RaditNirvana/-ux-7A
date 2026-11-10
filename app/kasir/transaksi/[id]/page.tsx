import { notFound } from "next/navigation";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import ReceiptScreen from "@/components/kasir/ReceiptScreen";

const userInclude = { select: { nama: true, no_hp: true } };
const customerInclude = { include: { pengguna: userInclude } };
const vehicleInclude = { include: { customer: customerInclude } };
const serviceInclude = { include: { kendaraan: vehicleInclude } };
const rincianInclude = { include: { servis: serviceInclude } };
const cashierInclude = { include: { pengguna: { select: { nama: true } } } };
const paymentInclude = { kasir: cashierInclude, rincian_biaya: rincianInclude } satisfies Prisma.pembayaranInclude;

export const instant = false;

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "Kasir") notFound();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const row = await prisma.transaksi.findUnique({ where: { id_transaksi: id }, include: { pembayaran: { include: paymentInclude } } });
  if (!row) notFound();
  const payment = row.pembayaran; const service = payment.rincian_biaya.servis;
  const canRelease = service.status_servis === "Selesai" && payment.status_pembayaran === "Lunas";
  return <ReceiptScreen notice={query.notice === "created" ? "Pembayaran berhasil dicatat." : ""} receipt={{
    id: row.id_transaksi, paymentId: payment.id_pembayaran, date: row.tanggal_transaksi.toISOString(), paymentDate: payment.tanggal_pembayaran.toISOString(), method: payment.metode_pembayaran, amount: Number(payment.jumlah_bayar), status: payment.status_pembayaran, confirmation: payment.konfirmasi_pembayaran, cashier: payment.kasir.pengguna.nama, service: service.nomor_antrian, serviceDate: service.tanggal_daftar.toISOString(), complaint: service.keluhan, customer: service.kendaraan.customer.pengguna.nama, phone: service.kendaraan.customer.pengguna.no_hp, vehicle: `${service.kendaraan.merek} ${service.kendaraan.tipe_kendaraan}`, plate: service.kendaraan.nomor_plat, serviceFee: Number(payment.rincian_biaya.biaya_jasa), partsFee: Number(payment.rincian_biaya.biaya_sparepart), total: Number(payment.rincian_biaya.total_biaya), canRelease,
  }} />;
}
