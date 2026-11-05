import { errors, jwtVerify, SignJWT } from "jose";

export const AUTH_ROLES = [
  "Customer",
  "Service Advisor",
  "Mekanik",
  "Owner",
  "Kasir",
] as const;

export type UserRole = (typeof AUTH_ROLES)[number];

export const ROLE_SLUGS: Record<UserRole, string> = {
  Customer: "customer",
  "Service Advisor": "service-advisor",
  Mekanik: "mekanik",
  Owner: "owner",
  Kasir: "kasir",
};

export const SESSION_COOKIE_NAME = "mitra-jaya-session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function isUserRole(value: unknown): value is UserRole {
  return AUTH_ROLES.some((role) => role === value);
}

export function getRoleFromSlug(slug: string): UserRole | undefined {
  return AUTH_ROLES.find((role) => ROLE_SLUGS[role] === slug);
}

export function getRoleSlug(role: UserRole): string {
  return ROLE_SLUGS[role];
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  idPengguna: string,
  role: UserRole,
) {
  return new SignJWT({ id_pengguna: idPengguna, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecret());
}

export type Session = {
  id_pengguna: string;
  role: UserRole;
};

export async function verifySessionToken(
  token: string,
): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.id_pengguna !== "string" ||
      !isUserRole(payload.role)
    ) {
      return null;
    }

    return {
      id_pengguna: payload.id_pengguna,
      role: payload.role,
    };
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      return null;
    }

    throw error;
  }
}
