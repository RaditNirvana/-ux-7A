import { getSessionUser } from "@/lib/session-user";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

export class MekanikApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function getMekanikIdentity() {
  const user = await getSessionUser();
  if (!user || user.role !== "Mekanik") return null;

  const mechanic = await prisma.mekanik.findUnique({
    where: { id_pengguna: user.id_pengguna },
    select: { id_mekanik: true },
  });

  return mechanic ? { id_mekanik: mechanic.id_mekanik, user } : null;
}

export function ownAssignmentWhere(idMekanik: string, idServis?: string) {
  return {
    id_mekanik: idMekanik,
    ...(idServis ? { id_servis: idServis } : {}),
  };
}

export async function requireOwnedService(
  tx: Prisma.TransactionClient,
  idMekanik: string,
  idServis: string,
) {
  const assignment = await tx.penugasan_mekanik.findFirst({
    where: ownAssignmentWhere(idMekanik, idServis),
    select: { id_data_mekanik: true },
  });

  if (!assignment) throw new MekanikApiError("Akses ditolak.", 403);
}

export function apiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof MekanikApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: fallback }, { status: 500 });
}

export function forbiddenResponse() {
  return Response.json({ error: "Akses ditolak." }, { status: 403 });
}
