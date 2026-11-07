import { NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { getSessionUser } from "@/lib/session-user";
import { prisma } from "@/lib/prisma";

export async function getKasirContext() {
  const user = await getSessionUser();
  if (!user || user.role !== "Kasir") return null;
  const kasir = await prisma.kasir.findUnique({
    where: { id_pengguna: user.id_pengguna },
    select: { id_kasir: true },
  });
  return kasir ? { ...user, id_kasir: kasir.id_kasir } : null;
}

export function kasirForbidden() {
  return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
}

export class KasirError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function getJakartaDateBounds(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const year = Number(value.year);
  const month = Number(value.month);
  const day = Number(value.day);
  const date = new Date(Date.UTC(year, month - 1, day));
  const start = new Date(date.getTime() - 7 * 60 * 60 * 1000);
  return { date, start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function kasirErrorResponse(error: unknown, fallback: string) {
  if (error instanceof KasirError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function nextCode(
  tx: Prisma.TransactionClient,
  model: "rincian_biaya" | "persetujuan_biaya" | "pengguna" | "customer" | "pembayaran" | "transaksi",
  field: string,
  prefix: string,
  width: number,
) {
  const rows = await (tx[model] as unknown as { findMany: (args: { select: Record<string, boolean> }) => Promise<Record<string, string>[]> })
    .findMany({ select: { [field]: true } });
  const used = new Set(rows.map((row) => row[field]));
  for (let i = 1; i < 10 ** width; i++) {
    const code = `${prefix}${String(i).padStart(width, "0")}`;
    if (!used.has(code)) return code;
  }
  throw new KasirError("Nomor kode sudah habis.", 409);
}
