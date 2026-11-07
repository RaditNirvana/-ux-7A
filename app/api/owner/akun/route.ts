import { hash } from "bcryptjs";
import { Prisma } from "@/app/generated/prisma/client";
import { getOwnerContext, ownerError, ownerForbidden } from "@/lib/owner";
import { nextAccountCode, ROLES, type AccountRole } from "@/lib/owner-accounts";
import { prisma } from "@/lib/prisma";

function validPhone(value: unknown): value is string { return typeof value === "string" && value.trim().length <= 15 && /^\+?[0-9][0-9\s-]{8,14}$/.test(value.trim()) && value.trim().replace(/[\s-]/g, "").length <= 15; }
function validName(v: unknown): v is string { return typeof v === "string" && !!v.trim() && v.trim().length <= 100; }
function validUsername(v: unknown): v is string { return typeof v === "string" && /^[A-Za-z0-9._-]{3,50}$/.test(v.trim()); }
function invalid() { return Response.json({ error: "Lengkapi nama, username, dan nomor telepon yang valid." }, { status: 400 }); }

export async function GET(request: Request) {
  if (!(await getOwnerContext())) return ownerForbidden();
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim();
    const users = await prisma.pengguna.findMany({ where: q ? { OR: [{ nama: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }, { no_hp: { contains: q } }, { role: { contains: q, mode: "insensitive" } }] } : {}, select: { id_pengguna: true, nama: true, username: true, no_hp: true, role: true, login: true, tanggal_registrasi: true }, orderBy: [{ nama: "asc" }, { id_pengguna: "asc" }], take: 100 });
    return Response.json(users.map((u) => ({ id: u.id_pengguna, name: u.nama, username: u.username, phone: u.no_hp, role: u.role, login: u.login, registered: u.tanggal_registrasi })));
  } catch (error) { return ownerError(error, "Daftar akun belum dapat dimuat."); }
}

export async function POST(request: Request) {
  if (!(await getOwnerContext())) return ownerForbidden();
  try {
    const body = await request.json().catch(() => null);
    if (!body || !validName(body.nama) || !validUsername(body.username) || typeof body.password !== "string" || body.password.length < 8 || body.password.length > 72 || !validPhone(body.no_hp) || !ROLES.includes(body.role)) return invalid();
    const username = body.username.trim(); const role = body.role as AccountRole;
    const password = await hash(body.password, 10);
    const created = await prisma.$transaction(async (tx) => {
      const id = await nextAccountCode(tx, "pengguna"); const roleId = await nextAccountCode(tx, role);
      const user = await tx.pengguna.create({ data: { id_pengguna: id, nama: body.nama.trim(), username, password, no_hp: body.no_hp.trim(), role, login: body.login === "Nonaktif" ? "Nonaktif" : "Aktif" }, select: { id_pengguna: true } });
      if (role === "Customer") await tx.customer.create({ data: { id_customer: roleId, id_pengguna: id } });
      else if (role === "Service Advisor") await tx.service_advisor.create({ data: { id_sa: roleId, id_pengguna: id } });
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
