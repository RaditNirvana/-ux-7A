import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerApiContext } from "@/lib/customer-session";
import {
  getKnownRequestErrorCode,
  validateVehicleInput,
  VehicleIdPoolExhaustedError,
} from "@/lib/vehicle-validation";

export async function GET() {
  const customer = await getCustomerApiContext();

  if (!customer) {
    return NextResponse.json({ message: "Sesi customer tidak valid." }, { status: 401 });
  }

  try {
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

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error("Customer vehicle list failed:", error);
    return NextResponse.json(
      { message: "Data kendaraan belum dapat dimuat." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const customer = await getCustomerApiContext();

  if (!customer) {
    return NextResponse.json({ message: "Sesi customer tidak valid." }, { status: 401 });
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
    const vehicle = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE "kendaraan" IN SHARE ROW EXCLUSIVE MODE`;

      const existing = await tx.kendaraan.findMany({
        select: { id_kendaraan: true },
      });
      const occupiedIds = new Set(
        existing.map(({ id_kendaraan }) => id_kendaraan),
      );
      let idKendaraan: string | null = null;

      for (let sequence = 1; sequence <= 999; sequence += 1) {
        const candidate = `V${String(sequence).padStart(3, "0")}`;

        if (!occupiedIds.has(candidate)) {
          idKendaraan = candidate;
          break;
        }
      }

      if (!idKendaraan) {
        throw new VehicleIdPoolExhaustedError();
      }

      return tx.kendaraan.create({
        data: {
          id_kendaraan: idKendaraan,
          id_customer: customer.id_customer,
          ...validation.data,
        },
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
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    if (error instanceof VehicleIdPoolExhaustedError) {
      return NextResponse.json(
        { message: "Batas jumlah kendaraan telah tercapai." },
        { status: 409 },
      );
    }

    if (getKnownRequestErrorCode(error) === "P2002") {
      return NextResponse.json(
        { message: "Nomor pelat atau nomor rangka sudah digunakan." },
        { status: 409 },
      );
    }

    console.error("Customer vehicle creation failed:", error);
    return NextResponse.json(
      { message: "Kendaraan belum dapat disimpan." },
      { status: 500 },
    );
  }
}
