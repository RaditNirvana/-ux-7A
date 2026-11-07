import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/customer-session";
import CustomerPaymentsScreen from "@/components/customer/CustomerPaymentsScreen";

export const instant = false;

export default async function CustomerPaymentsPage() {
  const customer = await requireCustomerContext();
  const services = await prisma.servis.findMany({
    where: { kendaraan: { id_customer: customer.id_customer }, rincian_biaya: { isNot: null } },
    include: { kendaraan: { select: { merek: true, tipe_kendaraan: true, nomor_plat: true } }, rincian_biaya: { include: { persetujuan_biaya: true, pembayaran: { orderBy: { tanggal_pembayaran: "desc" }, take: 1 } } } },
    orderBy: [{ tanggal_daftar: "desc" }, { id_servis: "desc" }],
  });
  return <CustomerPaymentsScreen services={services.map((service) => ({
    id: service.id_servis, number: service.nomor_antrian, date: service.tanggal_daftar.toISOString(), status: service.status_servis, vehicle: `${service.kendaraan.merek} ${service.kendaraan.tipe_kendaraan}`, plate: service.kendaraan.nomor_plat,
    needs: service.kebutuhan_servis, inspection: service.hasil_pemeriksaan, result: service.hasil_servis,
    fee: { service: Number(service.rincian_biaya!.biaya_jasa), parts: Number(service.rincian_biaya!.biaya_sparepart), total: Number(service.rincian_biaya!.total_biaya), approval: service.rincian_biaya!.persetujuan_biaya?.status_persetujuan ?? "Menunggu", payment: service.rincian_biaya!.pembayaran[0] ? { status: service.rincian_biaya!.pembayaran[0].status_pembayaran, method: service.rincian_biaya!.pembayaran[0].metode_pembayaran, date: service.rincian_biaya!.pembayaran[0].tanggal_pembayaran.toISOString() } : null },
  }))} />;
}
