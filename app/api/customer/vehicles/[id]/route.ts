import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session-user";
import { prisma } from "@/lib/prisma";
import {
  getKnownRequestErrorCode,
  validateVehicleInput,
} from "@/lib/vehicle-validation";

type VehicleRouteContext = {
  params: Promise<{ id: string }>;
};

async function getCustomerContextResponse() {
  const user = await getSessionUser();
  if (!user) {
    return { customer: null, response: NextResponse.json({ message: "Sesi tidak valid." }, { status: 401 }) };
  }
  if (user.role !== "Customer" || !user.id_customer) {
    return { customer: null, response: NextResponse.json({ message: "Akses ditolak." }, { status: 403 }) };
  }
  return { customer: { id_customer: user.id_customer }, response: null };
}

function isVehicleId(value: string) {
  return /^V\d{3}$/.test(value);
}

export async function GET(_request: Request, { params }: VehicleRouteContext) {
  const { customer, response } = await getCustomerContextResponse();
  if (response) return response;
  if (!customer) return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });

  const { id } = await params;

  if (!isVehicleId(id)) {
    return NextResponse.json({ message: "Kendaraan tidak ditemukan." }, { status: 404 });
  }

  try {
    const vehicle = await prisma.kendaraan.findFirst({
      where: { id_kendaraan: id, id_customer: customer.id_customer },
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

    if (!vehicle) {
      return NextResponse.json({ message: "Kendaraan tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("Customer vehicle lookup failed:", error);
    return NextResponse.json(
      { message: "Data kendaraan belum dapat dimuat." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: VehicleRouteContext,
) {
  const { customer, response } = await getCustomerContextResponse();
  if (response) return response;
  if (!customer) return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });

  const { id } = await params;

  if (!isVehicleId(id)) {
    return NextResponse.json({ message: "Kendaraan tidak ditemukan." }, { status: 404 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  const validation = validateVehicleInput(body);

  if (!validation.success) {
    return NextResponse.json({ message: validation.message }, { status: 400 });
  }

  try {
    const existing = await prisma.kendaraan.findFirst({
      where: { id_kendaraan: id, id_customer: customer.id_customer },
      select: { id_kendaraan: true },
    });

    if (!existing) {
      return NextResponse.json({ message: "Kendaraan tidak ditemukan." }, { status: 404 });
    }

    const updated = await prisma.kendaraan.updateMany({
      where: { id_kendaraan: id, id_customer: customer.id_customer },
      data: validation.data,
    });
    if (!updated.count) {
      return NextResponse.json({ message: "Kendaraan tidak ditemukan." }, { status: 404 });
    }
    const vehicle = await prisma.kendaraan.findFirst({
      where: { id_kendaraan: id, id_customer: customer.id_customer },
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

    return NextResponse.json({ vehicle });
  } catch (error) {
    if (getKnownRequestErrorCode(error) === "P2002") {
      return NextResponse.json(
        { message: "Nomor pelat atau nomor rangka sudah digunakan." },
        { status: 409 },
      );
    }

    if (getKnownRequestErrorCode(error) === "P2025") {
      return NextResponse.json({ message: "Kendaraan tidak ditemukan." }, { status: 404 });
    }

    console.error("Customer vehicle update failed:", error);
    return NextResponse.json(
      { message: "Perubahan kendaraan belum dapat disimpan." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: VehicleRouteContext,
) {
  const { customer, response } = await getCustomerContextResponse();
  if (response) return response;
  if (!customer) return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });

  const { id } = await params;

  if (!isVehicleId(id)) {
    return NextResponse.json({ message: "Kendaraan tidak ditemukan." }, { status: 404 });
  }

  try {
    const deleted = await prisma.kendaraan.deleteMany({
      where: { id_kendaraan: id, id_customer: customer.id_customer },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ message: "Kendaraan tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ message: "Kendaraan berhasil dihapus." });
  } catch (error) {
    if (getKnownRequestErrorCode(error) === "P2003") {
      return NextResponse.json(
        {
          message:
            "Kendaraan tidak dapat dihapus karena masih memiliki riwayat servis.",
        },
        { status: 409 },
      );
    }

    console.error("Customer vehicle deletion failed:", error);
    return NextResponse.json(
      { message: "Kendaraan belum dapat dihapus." },
      { status: 500 },
    );
  }
}
