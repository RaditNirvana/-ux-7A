import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  getRoleSlug,
  isUserRole,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  const { username, password, role } = body as Record<string, unknown>;

  if (
    typeof username !== "string" ||
    username.trim().length === 0 ||
    username.length > 50 ||
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 72 ||
    !isUserRole(role)
  ) {
    return NextResponse.json(
      { message: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.pengguna.findUnique({
      where: { username: username.trim() },
      select: {
        id_pengguna: true,
        password: true,
        role: true,
        login: true,
      },
    });

    if (
      !user ||
      user.login !== "Aktif" ||
      user.role !== role ||
      !(await compare(password, user.password))
    ) {
      return NextResponse.json(
        { message: "Login Gagal. Username atau kata sandi belum sesuai." },
        { status: 401 },
      );
    }

    const token = await createSessionToken(user.id_pengguna, role);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return NextResponse.json({
      redirect: role === "Kasir" ? "/kasir/dashboard" : `/dashboard/${getRoleSlug(role)}`,
    });
  } catch (error) {
    console.error("Login request failed:", error);
    return NextResponse.json(
      { message: "Login belum dapat diproses. Silakan coba kembali." },
      { status: 500 },
    );
  }
}
