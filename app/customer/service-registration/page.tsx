import VehicleSelection from "@/components/customer/VehicleSelection";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/customer-session";

export const instant = false;

type ServiceRegistrationPageProps = {
  searchParams: Promise<{ vehicle?: string }>;
};

export default async function ServiceRegistrationPage({
  searchParams,
}: ServiceRegistrationPageProps) {
  const [customer, query] = await Promise.all([
    requireCustomerContext(),
    searchParams,
  ]);
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

  return (
    <VehicleSelection
      selectedId={query.vehicle}
      vehicles={vehicles}
    />
  );
}
