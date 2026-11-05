import VehicleManager from "@/components/customer/VehicleManager";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/customer-session";

export const instant = false;

export default async function CustomerVehiclesPage() {
  const customer = await requireCustomerContext();
  const vehicles = await prisma.kendaraan.findMany({
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
  });

  return <VehicleManager initialVehicles={vehicles} />;
}
