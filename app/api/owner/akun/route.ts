import { hash } from "bcryptjs";
import { Prisma } from "@/app/generated/prisma/client";
import { getOwnerContext, ownerError, ownerForbidden } from "@/lib/owner";
import { nextAccountCode, ROLES, type AccountRole } from "@/lib/owner-accounts";
import { prisma } from "@/lib/prisma";

function validName(v: unknown): v is string { return typeof v === "string" && !!v.trim() && v.trim().length <= 100; }
function validUsername(v: unknown): v is string { return typeof v === "string" && /^[a-z0-9._]{4,20}$/.test(v.trim()); }
function validPassword(v: unknown): v is string { return typeof v === "string" && v.length >= 8 && v.length <= 72 && /[A-Za-z]/.test(v) && /\d/.test(v); }
function invalid() { return Response.json({ error: "Periksa nama, username, role, dan kata sandi." }, { status: 400 }); }

export async function GET(request: Request) {
  const owner = await getOwnerContext(); if (!owner) return ownerForbidden();
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim();
    const users = await prisma.pengguna.findMany({ where: { role: { in: [...ROLES] }, ...(q ? { OR: [{ nama: { contains: q, mode: "insensitive" as const } }, { username: { contains: q, mode: "insensitive" as const } }, { role: { contains: q, mode: "insensitive" as const } }] } : {}) }, select: { id_pengguna: true, nama: true, username: true, no_hp: true, role: true, login: true, tanggal_registrasi: true }, orderBy: [{ nama: "asc" }, { id_pengguna: "asc" }], take: 100 });
    return Response.json(users.map((u) => ({ id: u.id_pengguna, name: u.nama, username: u.username, phone: u.no_hp, role: u.role, login: u.login, registered: u.tanggal_registrasi, isSelf: u.id_pengguna === owner.id_pengguna })));
  } catch (error) { return ownerError(error, "Daftar akun belum dapat dimuat."); }
}

export async function POST(request: Request) {
  if (!(await getOwnerContext())) return ownerForbidden();
  try {
    const body = await request.json().catch(() => null);
    if (!body || !validName(body.nama) || !validUsername(body.username) || !validPassword(body.password) || body.passwordConfirmation !== body.password || !ROLES.includes(body.role)) return invalid();
    const username = body.username.trim(); const role = body.role as AccountRole;
    const password = await hash(body.password, 10);
    const created = await prisma.$transaction(async (tx) => {
      const id = await nextAccountCode(tx, "pengguna"); const roleId = await nextAccountCode(tx, role);
      const user = await tx.pengguna.create({ data: { id_pengguna: id, nama: body.nama.trim(), username, password, no_hp: "-", role, login: "Aktif" }, select: { id_pengguna: true } });
      if (role === "Service Advisor") await tx.service_advisor.create({ data: { id_sa: roleId, id_pengguna: id } });
      else if (role === "Mekanik") await tx.mekanik.create({ data: { id_mekanik: roleId, id_pengguna: id, status_ketersediaan: "Tersedia" } });
      else if (role === "Kasir") await tx.kasir.create({ data: { id_kasir: roleId, id_pengguna: id } });
      else await tx.owner.create({ data: { id_owner: roleId, id_pengguna: id } });
      return user;
    });
    return Response.json({ id: created.id_pengguna, success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "Username sudah digunakan. Pilih username lain." }, { status: 409 });
    return ownerError(error, "Akun belum dapat dibuat.");
  }
}
