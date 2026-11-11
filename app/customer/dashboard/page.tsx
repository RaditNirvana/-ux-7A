import CustomerDashboard from "@/components/customer/CustomerDashboard";
import type {
  CustomerServiceActivity,
  CustomerVehicle,
} from "@/components/customer/types";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/customer-session";

export const instant = false;

const inactiveServiceStatuses = ["Selesai", "Batal"];

export default async function CustomerDashboardPage() {
  const customer = await requireCustomerContext();

  const [vehicles, activeServiceCount, latestService, feeDetails] =
    await Promise.all([
      prisma.kendaraan.findMany({
        where: { id_customer: customer.id_customer },
        orderBy: { id_kendaraan: "asc" },
        select: {
          id_kendaraan: true,
          merek: true,
          tipe_kendaraan: true,
          tahun_kendaraan: true,
          nomor_plat: true,
          nomor_rangka: true,
          kilometer: true,
        },
      }),
      prisma.servis.count({
        where: {
          kendaraan: { id_customer: customer.id_customer },
          status_servis: { notIn: inactiveServiceStatuses },
        },
      }),
      prisma.servis.findFirst({
        where: {
          kendaraan: { id_customer: customer.id_customer },
          status_servis: { notIn: inactiveServiceStatuses },
        },
        orderBy: [
          { tanggal_daftar: "desc" },
          { id_servis: "desc" },
        ],
        select: {
          id_servis: true,
          keluhan: true,
          tanggal_daftar: true,
          status_servis: true,
          hasil_pemeriksaan: true,
          kebutuhan_servis: true,
          rincian_biaya: { select: { persetujuan_biaya: { select: { status_persetujuan: true } }, pembayaran: { select: { status_pembayaran: true } } } },
          kendaraan: {
            select: {
              merek: true,
              tipe_kendaraan: true,
              tahun_kendaraan: true,
              nomor_plat: true,
            },
          },
        },
      }),
      prisma.rincian_biaya.findMany({
        where: {
          servis: { kendaraan: { id_customer: customer.id_customer } },
        },
        select: {
          total_biaya: true,
          pembayaran: {
            select: {
              jumlah_bayar: true,
              status_pembayaran: true,
            },
          },
          persetujuan_biaya: {
            select: { status_persetujuan: true },
          },
        },
      }),
    ]);

  const pendingBillAmount = feeDetails.reduce((total, fee) => {
    const isPaid = fee.pembayaran.some(
      (payment) => payment.status_pembayaran === "Lunas",
    );

    return !isPaid ? total + fee.total_biaya.toNumber() : total;
  }, 0);

  const dashboardVehicles: CustomerVehicle[] = vehicles;
  const dashboardActivity: CustomerServiceActivity | null = latestService
    ? {
        ...latestService,
        tanggal_daftar: latestService.tanggal_daftar.toISOString(),
        perlu_pembayaran: Boolean(latestService.rincian_biaya) && !latestService.rincian_biaya?.pembayaran.some((payment) => payment.status_pembayaran === "Lunas"),
      }
    : null;

  return (
    <CustomerDashboard
      activeServiceCount={activeServiceCount}
      latestService={dashboardActivity}
      name={customer.nama}
      pendingBillAmount={pendingBillAmount}
      vehicles={dashboardVehicles}
    />
  );
}
