import ServiceRegistrationManager from "@/components/customer/ServiceRegistrationManager";
import type { CustomerServiceRegistrationItem } from "@/components/customer/types";
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

  const [vehicles, services] = await Promise.all([
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
    prisma.servis.findMany({
      where: {
        kendaraan: {
          id_customer: customer.id_customer,
        },
      },
      include: {
        kendaraan: true,
        riwayat_status_servis: {
          orderBy: { waktu: "desc" },
        },
      },
      orderBy: [
        { tanggal_daftar: "desc" },
        { id_servis: "desc" },
      ],
    }),
  ]);

  const serializedServices: CustomerServiceRegistrationItem[] = services.map(
    (item) => ({
      id_servis: item.id_servis,
      nomor_antrian: item.nomor_antrian,
      tanggal_daftar: item.tanggal_daftar.toISOString(),
      keluhan: item.keluhan,
      catatan_kedatangan: item.catatan_kedatangan,
      status_verifikasi: item.status_verifikasi,
      estimasi_waktu_tunggu: item.estimasi_waktu_tunggu,
      tanggal_pemeriksaan: item.tanggal_pemeriksaan?.toISOString() ?? null,
      hasil_pemeriksaan: item.hasil_pemeriksaan,
      kebutuhan_servis: item.kebutuhan_servis,
      tanggal_mulai: item.tanggal_mulai?.toISOString() ?? null,
      tanggal_selesai: item.tanggal_selesai?.toISOString() ?? null,
      status_servis: item.status_servis,
      hasil_servis: item.hasil_servis,
      alasan_batal: item.alasan_batal,
      id_kendaraan: item.id_kendaraan,
      kendaraan: {
        id_kendaraan: item.kendaraan.id_kendaraan,
        merek: item.kendaraan.merek,
        tipe_kendaraan: item.kendaraan.tipe_kendaraan,
        tahun_kendaraan: item.kendaraan.tahun_kendaraan,
        nomor_plat: item.kendaraan.nomor_plat,
        nomor_rangka: item.kendaraan.nomor_rangka,
        kilometer: item.kendaraan.kilometer,
      },
      riwayat_status_servis: item.riwayat_status_servis.map((r) => ({
        id_riwayat: r.id_riwayat,
        tahap: r.tahap,
        keterangan: r.keterangan,
        waktu: r.waktu.toISOString(),
      })),
    })
  );

  return (
    <ServiceRegistrationManager
      initialServices={serializedServices}
      initialVehicles={vehicles}
      preselectedVehicleId={query?.vehicle}
    />
  );
}
