import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session-user";
import { prisma } from "@/lib/prisma";

export async function getOwnerContext() {
  const user = await getSessionUser();
  if (!user || user.role !== "Owner") return null;
  const owner = await prisma.owner.findUnique({
    where: { id_pengguna: user.id_pengguna }, select: { id_owner: true },
  });
  return owner ? { ...user, id_owner: owner.id_owner } : null;
}

export function ownerForbidden() {
  return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
}

export function ownerError(error: unknown, fallback: string) {
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
