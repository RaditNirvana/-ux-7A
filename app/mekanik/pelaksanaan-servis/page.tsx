import { redirect } from "next/navigation";
import MekanikExecutionScreen from "@/components/mekanik/MekanikExecutionScreen";
import { getMekanikIdentity } from "@/lib/mekanik-api";
import { getMekanikExecutionData } from "@/lib/mekanik-execution-data";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function MekanikPelaksanaanServisPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const identity = await getMekanikIdentity();
  if (!identity) redirect("/masuk");
  const [services, mechanic, search] = await Promise.all([
    getMekanikExecutionData(identity.id_mekanik),
    prisma.mekanik.findUnique({
      where: { id_mekanik: identity.id_mekanik },
      select: { status_ketersediaan: true },
    }),
    searchParams,
  ]);

  return (
    <MekanikExecutionScreen
      availability={mechanic?.status_ketersediaan ?? "Tersedia"}
      name={identity.user.nama}
      selectedId={Array.isArray(search.id) ? search.id[0] : search.id}
      services={services}
    />
  );
}
