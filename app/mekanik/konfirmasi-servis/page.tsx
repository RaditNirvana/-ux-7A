import { redirect } from "next/navigation";
import MekanikConfirmationScreen from "@/components/mekanik/MekanikConfirmationScreen";
import { getMekanikIdentity } from "@/lib/mekanik-api";
import { getMekanikConfirmationData } from "@/lib/mekanik-confirmation-data";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function MekanikKonfirmasiServisPage() {
  const identity = await getMekanikIdentity();
  if (!identity) redirect("/masuk");
  const [data, mechanic] = await Promise.all([
    getMekanikConfirmationData(identity.id_mekanik),
    prisma.mekanik.findUnique({
      where: { id_mekanik: identity.id_mekanik },
      select: { status_ketersediaan: true },
    }),
  ]);

  return (
    <MekanikConfirmationScreen
      availability={mechanic?.status_ketersediaan ?? "Tersedia"}
      hasBlocked={data.hasBlocked}
      name={identity.user.nama}
      services={data.services}
    />
  );
}
