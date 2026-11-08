import { redirect } from "next/navigation";
import MekanikPageHeader from "@/components/MekanikPageHeader";
import MekanikAssignmentScreen from "@/components/mekanik/MekanikAssignmentScreen";
import { getRoleDashboardPath } from "@/lib/role-routing";
import {
  MEKANIK_ASSIGNMENT_STATUSES,
  type MekanikAssignmentRecord,
} from "@/lib/mekanik-assignment";
import { getSessionUser } from "@/lib/session-user";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function MekanikPenugasanPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  if (user.role !== "Mekanik") redirect(getRoleDashboardPath(user.role));

  const mechanic = await prisma.mekanik.findUnique({
    where: { id_pengguna: user.id_pengguna },
    select: { id_mekanik: true, status_ketersediaan: true },
  });
  if (!mechanic) redirect(getRoleDashboardPath(user.role));

  const rows = await prisma.penugasan_mekanik.findMany({
    where: {
      id_mekanik: mechanic.id_mekanik,
      servis: {
        is: { status_servis: { in: [...MEKANIK_ASSIGNMENT_STATUSES] } },
      },
    },
    orderBy: [{ id_servis: "desc" }, { id_data_mekanik: "desc" }],
    include: {
      servis: {
        include: {
          kendaraan: {
            include: {
              customer: {
                include: { pengguna: { select: { nama: true } } },
              },
            },
          },
        },
      },
    },
  });

  const assignments: MekanikAssignmentRecord[] = rows.map((row) => ({
    id_data_mekanik: row.id_data_mekanik,
    id_servis: row.servis.id_servis,
    tanggal_daftar: row.servis.tanggal_daftar.toISOString(),
    keluhan: row.servis.keluhan,
    status_servis: row.servis.status_servis,
    kendaraan: {
      merek: row.servis.kendaraan.merek,
      tipe_kendaraan: row.servis.kendaraan.tipe_kendaraan,
      tahun_kendaraan: row.servis.kendaraan.tahun_kendaraan,
      nomor_plat: row.servis.kendaraan.nomor_plat,
      kilometer: row.servis.kendaraan.kilometer,
      pemilik: row.servis.kendaraan.customer.pengguna.nama,
    },
  }));

  const search = await searchParams;
  const requestedServiceId = Array.isArray(search.id) ? search.id[0] : search.id;
  const selectedServiceId = assignments.some((assignment) => assignment.id_servis === requestedServiceId)
    ? requestedServiceId
    : undefined;

  return (
    <div className="min-h-screen bg-[#eef0ff] font-[var(--font-poppins)] text-[#111827] antialiased">
      <MekanikPageHeader
        title="Penugasan"
        name={user.nama}
        availability={mechanic.status_ketersediaan}
      />
      <MekanikAssignmentScreen assignments={assignments} selectedServiceId={selectedServiceId} />
    </div>
  );
}
