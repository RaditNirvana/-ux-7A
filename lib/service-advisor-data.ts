import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ServiceAdvisorDashboardData,
  ServiceAdvisorMechanic,
  ServiceAdvisorOrder,
  ServiceAdvisorService,
  ServiceAdvisorSparepart,
  ServiceAdvisorSupplier,
} from "@/components/sa/service-advisor-types";

const serviceInclude = {
  kendaraan: {
    select: {
      nomor_plat: true,
      merek: true,
      tipe_kendaraan: true,
      customer: {
        select: { pengguna: { select: { nama: true } } },
      },
    },
  },
  penugasan_mekanik: {
    orderBy: { tanggal_penugasan: "desc" },
    take: 1,
    include: {
      mekanik: {
        select: {
          id_mekanik: true,
          pengguna: { select: { nama: true } },
        },
      },
    },
  },
  riwayat_status_servis: {
    orderBy: { waktu: "asc" },
    select: { tahap: true, keterangan: true, waktu: true },
  },
  penggunaan_sparepart: {
    include: {
      sparepart: {
        select: {
          id_sparepart: true,
          nama_sparepart: true,
          satuan: true,
          stok: true,
          lokasi_penyimpanan: true,
        },
      },
    },
  },
} satisfies Prisma.servisInclude;

function isoDate(value: Date | null) {
  return value?.toISOString() ?? null;
}

function mapService(
  service: Prisma.servisGetPayload<{ include: typeof serviceInclude }>,
): ServiceAdvisorService {
  const assignment = service.penugasan_mekanik[0];

  return {
    id: service.id_servis,
    number: service.nomor_antrian,
    customer: service.kendaraan.customer.pengguna.nama,
    plate: service.kendaraan.nomor_plat,
    vehicle: `${service.kendaraan.merek} ${service.kendaraan.tipe_kendaraan}`,
    complaint: service.keluhan,
    arrivalNote: service.catatan_kedatangan,
    date: service.tanggal_daftar.toISOString(),
    verification: service.status_verifikasi,
    status: service.status_servis,
    inspection: service.hasil_pemeriksaan,
    needs: service.kebutuhan_servis,
    result: service.hasil_servis,
    mechanicId: assignment?.mekanik.id_mekanik ?? null,
    mechanic: assignment?.mekanik.pengguna.nama ?? null,
    updatedAt: isoDate(assignment?.tanggal_penugasan ?? null),
    timeline: service.riwayat_status_servis.map((item) => ({
      stage: item.tahap,
      note: item.keterangan,
      time: item.waktu.toISOString(),
    })),
    parts: service.penggunaan_sparepart.map((item) => ({
      id: item.sparepart.id_sparepart,
      name: item.sparepart.nama_sparepart,
      quantity: item.jumlah_sparepart,
      unit: item.sparepart.satuan,
      stock: item.sparepart.stok,
      availability: item.status_ketersediaan_sparepart,
      area: item.bagian_diganti,
    })),
  };
}

async function getServices(
  where: Prisma.servisWhereInput,
  take = 50,
): Promise<ServiceAdvisorService[]> {
  const services = await prisma.servis.findMany({
    where,
    include: serviceInclude,
    orderBy: [{ tanggal_daftar: "desc" }, { nomor_antrian: "desc" }],
    take,
  });

  return services.map(mapService);
}

export async function getServiceAdvisorDashboardData(): Promise<ServiceAdvisorDashboardData> {
  const [services, unverifiedCount, mechanics, spareparts] = await Promise.all([
    getServices({}, 5),
    prisma.servis.count({ where: { status_verifikasi: "Menunggu" } }),
    prisma.mekanik.findMany({
      where: {
        status_ketersediaan: "Tersedia",
        pengguna: { login: "Aktif" },
      },
      select: { id_mekanik: true },
    }),
    prisma.sparepart.findMany({
      where: { status_aktif: "Aktif" },
      select: { stok: true, batas_minimum: true },
    }),
  ]);
  const lowStockCount = spareparts.filter(
    (part) => part.stok > 0 && part.stok < part.batas_minimum,
  ).length;

  return {
    registrations: services.map((service) => ({
      id: service.id,
      number: service.number,
      customer: service.customer,
      plate: service.plate,
      issue: service.complaint,
    })),
    progress: services.map((service) => ({
      id: service.id,
      plate: service.plate,
      status: service.status,
    })),
    summary: [
      {
        title: "Perlu Verifikasi",
        subtitle: "Pendaftaran Servis",
        count: unverifiedCount,
        icon: "document",
      },
      {
        title: "Mekanik Tersedia",
        subtitle: "Penugasan Mekanik",
        count: mechanics.length,
        icon: "people",
      },
      {
        title: "Stok Menipis",
        subtitle: "Persediaan Stok",
        count: lowStockCount,
        icon: "box",
      },
    ],
  };
}

export async function getServiceAdvisorVerificationData() {
  return getServices({ status_verifikasi: "Menunggu" });
}

export async function getServiceAdvisorAssignmentData() {
  const [services, mechanics] = await Promise.all([
    getServices({
      status_servis: {
        in: ["Menunggu Penugasan", "Ditugaskan", "Diproses"],
      },
    }),
    getServiceAdvisorMechanics(),
  ]);

  return { services, mechanics };
}

export async function getServiceAdvisorInspectionData() {
  const [services, spareparts] = await Promise.all([
    getServices({
      status_servis: {
        in: ["Ditugaskan", "Diperiksa", "Diproses", "Menunggu Persetujuan"],
      },
    }),
    getServiceAdvisorSpareparts(),
  ]);

  return { services, spareparts };
}

export async function getServiceAdvisorMechanics(): Promise<
  ServiceAdvisorMechanic[]
> {
  const mechanics = await prisma.mekanik.findMany({
    where: { pengguna: { role: "Mekanik" } },
    include: {
      pengguna: {
        select: { nama: true, no_hp: true, login: true },
      },
      penugasan_mekanik: {
        where: { status_penugasan: { in: ["Ditugaskan", "Diproses"] } },
        include: {
          servis: { select: { nomor_antrian: true } },
        },
      },
    },
    orderBy: { id_mekanik: "asc" },
  });

  return mechanics.map((mechanic) => ({
    id: mechanic.id_mekanik,
    displayId: mechanic.id_mekanik.replace(/^M(\d{3})$/, "M-$1"),
    name: mechanic.pengguna.nama,
    phone: mechanic.pengguna.no_hp,
    availability: mechanic.status_ketersediaan,
    login: mechanic.pengguna.login,
    activeAssignmentCount: mechanic.penugasan_mekanik.length,
    activeAssignment: mechanic.penugasan_mekanik[0]?.servis.nomor_antrian ?? null,
  }));
}

export async function getServiceAdvisorSpareparts(): Promise<
  ServiceAdvisorSparepart[]
> {
  const spareparts = await prisma.sparepart.findMany({
    where: { status_aktif: "Aktif" },
    include: { supplier: { select: { nama_supplier: true } } },
    orderBy: { id_sparepart: "asc" },
  });

  return spareparts.map((part) => ({
    id: part.id_sparepart,
    name: part.nama_sparepart,
    category: part.kategori,
    unit: part.satuan,
    stock: part.stok,
    minimum: part.batas_minimum,
    location: part.lokasi_penyimpanan,
    updatedAt: part.tanggal_diperbarui.toISOString(),
    supplier: part.supplier?.nama_supplier ?? null,
  }));
}

export async function getServiceAdvisorSuppliers(): Promise<
  ServiceAdvisorSupplier[]
> {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { nama_supplier: "asc" },
    select: {
      id_supplier: true,
      nama_supplier: true,
      kontak_supplier: true,
    },
  });

  return suppliers.map((supplier) => ({
    id: supplier.id_supplier,
    name: supplier.nama_supplier,
    phone: supplier.kontak_supplier,
  }));
}

export async function getServiceAdvisorOrders(): Promise<ServiceAdvisorOrder[]> {
  const orders = await prisma.pemesanan_sparepart.findMany({
    where: { status_pemesanan: { not: "Dibatalkan" } },
    include: {
      sparepart: { select: { id_sparepart: true, nama_sparepart: true, satuan: true, stok: true } },
      supplier: { select: { id_supplier: true, nama_supplier: true, kontak_supplier: true } },
    },
    orderBy: [{ dibuat_pada: "desc" }, { id_pemesanan: "desc" }],
  });

  return orders.map((order) => ({
    id: order.id_pemesanan,
    sparepartId: order.sparepart.id_sparepart,
    sparepart: order.sparepart.nama_sparepart,
    unit: order.sparepart.satuan,
    quantity: order.jumlah,
    stock: order.sparepart.stok,
    supplierId: order.supplier.id_supplier,
    supplier: order.supplier.nama_supplier,
    supplierPhone: order.supplier.kontak_supplier,
    orderDate: order.tanggal_pemesanan.toISOString().slice(0, 10),
    estimatedDate: order.estimasi_tiba?.toISOString().slice(0, 10) ?? null,
    status: order.status_pemesanan,
    note: order.catatan,
  }));
}

export async function getServiceAdvisorStatusData() {
  return getServices({}, 50);
}
