import { redirect } from "next/navigation";
import MekanikInspectionScreen from "@/components/mekanik/MekanikInspectionScreen";
import { getMekanikIdentity } from "@/lib/mekanik-api";
import { getMekanikInspectionData } from "@/lib/mekanik-inspection-data";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function MekanikPemeriksaanPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const identity = await getMekanikIdentity();
  if (!identity) redirect("/masuk");
  const [data, mechanic, search] = await Promise.all([
    getMekanikInspectionData(identity.id_mekanik),
    prisma.mekanik.findUnique({
      where: { id_mekanik: identity.id_mekanik },
      select: { status_ketersediaan: true },
    }),
    searchParams,
  ]);

  return (
    <MekanikInspectionScreen
      availability={mechanic?.status_ketersediaan ?? "Tersedia"}
      data={data}
      name={identity.user.nama}
      selectedId={Array.isArray(search.id) ? search.id[0] : search.id}
    />
  );
}
