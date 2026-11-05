import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type UserRole,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id_pengguna: string;
  nama: string;
  role: UserRole;
  id_customer: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    return null;
  }

  const user = await prisma.pengguna.findUnique({
    where: { id_pengguna: session.id_pengguna },
    select: {
      id_pengguna: true,
      nama: true,
      role: true,
      login: true,
      customer: { select: { id_customer: true } },
    },
  });

  if (
    !user ||
    user.login !== "Aktif" ||
    user.role !== session.role
  ) {
    return null;
  }

  return {
    id_pengguna: user.id_pengguna,
    nama: user.nama,
    role: session.role,
    id_customer: user.customer?.id_customer ?? null,
  };
}
