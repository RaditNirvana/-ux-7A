import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

class RegistrationIdSpaceExhaustedError extends Error {
  constructor(prefix: string) {
    super(`No available ${prefix} identifier remains.`);
    this.name = "RegistrationIdSpaceExhaustedError";
  }
}

function nextAvailableId(prefix: string, existingIds: string[]) {
  const existing = new Set(existingIds);

  for (let number = 1; number <= 999; number += 1) {
    const candidate = `${prefix}${String(number).padStart(3, "0")}`;

    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  throw new RegistrationIdSpaceExhaustedError(prefix);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUniqueConstraintError(error: unknown) {
  return isRecord(error) && "code" in error && error.code === "P2002";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { message: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  const {
    nama,
    no_hp,
    email,
    password,
    merek,
    tipe_kendaraan,
    tahun_kendaraan,
    nomor_plat,
    nomor_rangka,
  } = body;

  if (
    typeof nama !== "string" ||
    nama.trim().length === 0 ||
    nama.trim().length > 100 ||
    typeof no_hp !== "string" ||
    no_hp.trim().length === 0 ||
    no_hp.trim().length > 15 ||
    typeof email !== "string" ||
    email.trim().length > 50 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    Buffer.byteLength(password, "utf8") < 8 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    typeof merek !== "string" ||
    merek.trim().length === 0 ||
    merek.trim().length > 50 ||
    typeof tipe_kendaraan !== "string" ||
    tipe_kendaraan.trim().length === 0 ||
    tipe_kendaraan.trim().length > 50 ||
    typeof tahun_kendaraan !== "number" ||
    !Number.isInteger(tahun_kendaraan) ||
    tahun_kendaraan < 1980 ||
    tahun_kendaraan > 2100 ||
    typeof nomor_plat !== "string" ||
    nomor_plat.trim().length === 0 ||
    nomor_plat.trim().length > 15 ||
    (nomor_rangka !== undefined &&
      nomor_rangka !== null &&
      (typeof nomor_rangka !== "string" || nomor_rangka.trim().length > 30))
  ) {
    return NextResponse.json(
      { message: "Periksa kembali data pendaftaran Anda." },
      { status: 400 },
    );
  }

  const username = email.trim().toLowerCase();
  const normalizedPlate = nomor_plat.trim().toUpperCase();
  const normalizedChassis =
    typeof nomor_rangka === "string" && nomor_rangka.trim()
      ? nomor_rangka.trim()
      : null;

  try {
    const [existingUser, existingVehicle] = await Promise.all([
      prisma.pengguna.findUnique({
        where: { username },
        select: { id_pengguna: true },
      }),
      prisma.kendaraan.findFirst({
        where: {
          OR: [
            { nomor_plat: normalizedPlate },
            ...(normalizedChassis
              ? [{ nomor_rangka: normalizedChassis }]
              : []),
          ],
        },
        select: { id_kendaraan: true },
      }),
    ]);

    if (existingUser) {
      return NextResponse.json(
        { message: "Email tersebut sudah terdaftar." },
        { status: 409 },
      );
    }

    if (existingVehicle) {
      return NextResponse.json(
        { message: "Nomor pelat atau nomor rangka sudah terdaftar." },
        { status: 409 },
      );
    }

    const hashedPassword = await hash(password, 12);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await prisma.$transaction(async (transaction) => {
          const [pengguna, customers, vehicles] = await Promise.all([
            transaction.pengguna.findMany({
              select: { id_pengguna: true },
            }),
            transaction.customer.findMany({
              select: { id_customer: true },
            }),
            transaction.kendaraan.findMany({
              select: { id_kendaraan: true },
            }),
          ]);

          const idPengguna = nextAvailableId(
            "P",
            pengguna.map((entry) => entry.id_pengguna),
          );
          const idCustomer = nextAvailableId(
            "C",
            customers.map((entry) => entry.id_customer),
          );
          const idKendaraan = nextAvailableId(
            "V",
            vehicles.map((entry) => entry.id_kendaraan),
          );

          await transaction.pengguna.create({
            data: {
              id_pengguna: idPengguna,
              nama: nama.trim(),
              username,
              password: hashedPassword,
              no_hp: no_hp.trim(),
              role: "Customer",
              login: "Aktif",
            },
          });

          await transaction.customer.create({
            data: {
              id_customer: idCustomer,
              id_pengguna: idPengguna,
            },
          });

          await transaction.kendaraan.create({
            data: {
              id_kendaraan: idKendaraan,
              id_customer: idCustomer,
              merek: merek.trim(),
              tipe_kendaraan: tipe_kendaraan.trim(),
              tahun_kendaraan,
              nomor_plat: normalizedPlate,
              nomor_rangka: normalizedChassis,
            },
          });
        });

        return NextResponse.json(
          { redirect: "/login/customer?registered=1" },
          { status: 201 },
        );
      } catch (error) {
        if (error instanceof RegistrationIdSpaceExhaustedError) {
          return NextResponse.json(
            { message: "Pendaftaran tidak dapat diproses saat ini." },
            { status: 503 },
          );
        }

        if (isUniqueConstraintError(error)) {
          const [duplicateUser, duplicateVehicle] = await Promise.all([
            prisma.pengguna.findUnique({
              where: { username },
              select: { id_pengguna: true },
            }),
            prisma.kendaraan.findFirst({
              where: {
                OR: [
                  { nomor_plat: normalizedPlate },
                  ...(normalizedChassis
                    ? [{ nomor_rangka: normalizedChassis }]
                    : []),
                ],
              },
              select: { id_kendaraan: true },
            }),
          ]);

          if (duplicateUser) {
            return NextResponse.json(
              { message: "Email tersebut sudah terdaftar." },
              { status: 409 },
            );
          }

          if (duplicateVehicle) {
            return NextResponse.json(
              { message: "Nomor pelat atau nomor rangka sudah terdaftar." },
              { status: 409 },
            );
          }

          if (attempt < 2) {
            continue;
          }
        }

        console.error("Customer registration failed:", error);
        return NextResponse.json(
          { message: "Pendaftaran belum dapat diproses. Silakan coba kembali." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { message: "Pendaftaran belum dapat diproses. Silakan coba kembali." },
      { status: 503 },
    );
  } catch (error) {
    console.error("Customer registration failed:", error);
    return NextResponse.json(
      { message: "Pendaftaran belum dapat diproses. Silakan coba kembali." },
      { status: 500 },
    );
  }
}
