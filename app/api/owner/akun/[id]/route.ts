import { hash } from "bcryptjs";
import { Prisma } from "@/app/generated/prisma/client";
import { getOwnerContext, ownerError, ownerForbidden } from "@/lib/owner";
import { hasAccountHistory, nextAccountCode, ROLES, type AccountRole } from "@/lib/owner-accounts";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };
function validPhone(v: unknown): v is string { return typeof v === "string" && v.trim().length <= 15 && /^\+?[0-9][0-9\s-]{8,14}$/.test(v.trim()) && v.trim().replace(/[\s-]/g, "").length <= 15; }
function invalid() { return Response.json({ error: "Periksa kembali nama, nomor telepon, status login, dan kata sandi." }, { status: 400 }); }
export async function GET(_: Request, { params }: Params) {
  if (!(await getOwnerContext())) return ownerForbidden();
  try { const { id } = await params; const user = await prisma.pengguna.findUnique({ where: { id_pengguna: id }, select: { id_pengguna: true, nama: true, username: true, no_hp: true, role: true, login: true, tanggal_registrasi: true } }); return user ? Response.json(user) : Response.json({ error: "Akun tidak ditemukan." }, { status: 404 }); }
  catch (error) { return ownerError(error, "Detail akun belum dapat dimuat."); }
}
export async function PATCH(request: Request, { params }: Params) {
  const owner = await getOwnerContext(); if (!owner) return ownerForbidden();
  try {
    const { id } = await params; const body = await request.json().catch(() => null); const current = await prisma.pengguna.findUnique({ where: { id_pengguna: id }, select: { role: true } });
    if (!current) return Response.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    if (!body || typeof body.nama !== "string" || !body.nama.trim() || body.nama.trim().length > 100 || !validPhone(body.no_hp) || !["Aktif", "Nonaktif"].includes(body.login) || (body.role !== undefined && !ROLES.includes(body.role)) || (body.username !== undefined && (typeof body.username !== "string" || !/^[A-Za-z0-9._-]{3,50}$/.test(body.username.trim())))) return invalid();
    if (id === owner.id_pengguna && body.role && body.role !== current.role) return Response.json({ error: "Role akun Anda sendiri tidak dapat diubah." }, { status: 403 });
    if (body.role && body.role !== current.role && await hasAccountHistory(id, current.role as AccountRole)) return Response.json({ error: "Role tidak dapat diubah karena akun memiliki riwayat operasional." }, { status: 409 });
    if (body.password !== undefined && (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 72)) return invalid();
    const data = { nama: body.nama.trim(), no_hp: body.no_hp.trim(), login: body.login, ...(body.username ? { username: body.username.trim() } : {}), ...(body.role ? { role: body.role as AccountRole } : {}), ...(body.password ? { password: await hash(body.password, 10) } : {}) };
    await prisma.$transaction(async (tx) => {
      if (body.role && body.role !== current.role) {
        if (current.role === "Customer") await tx.customer.delete({ where: { id_pengguna: id } });
        else if (current.role === "Service Advisor") await tx.service_advisor.delete({ where: { id_pengguna: id } });
        else if (current.role === "Mekanik") await tx.mekanik.delete({ where: { id_pengguna: id } });
        else if (current.role === "Kasir") await tx.kasir.delete({ where: { id_pengguna: id } });
        else await tx.owner.delete({ where: { id_pengguna: id } });
        const roleId = await nextAccountCode(tx, body.role as AccountRole);
        if (body.role === "Customer") await tx.customer.create({ data: { id_customer: roleId, id_pengguna: id } });
        else if (body.role === "Service Advisor") await tx.service_advisor.create({ data: { id_sa: roleId, id_pengguna: id } });
        else if (body.role === "Mekanik") await tx.mekanik.create({ data: { id_mekanik: roleId, id_pengguna: id, status_ketersediaan: "Tersedia" } });
        else if (body.role === "Kasir") await tx.kasir.create({ data: { id_kasir: roleId, id_pengguna: id } });
        else await tx.owner.create({ data: { id_owner: roleId, id_pengguna: id } });
      }
      await tx.pengguna.update({ where: { id_pengguna: id }, data });
    });
    return Response.json({ success: true });
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "Username sudah digunakan. Pilih username lain." }, { status: 409 }); return ownerError(error, "Perubahan akun belum dapat disimpan."); }
}
export async function DELETE(_: Request, { params }: Params) {
  const owner = await getOwnerContext(); if (!owner) return ownerForbidden();
  try {
    const { id } = await params;
    if (id === owner.id_pengguna) return Response.json({ error: "Akun Owner yang sedang digunakan tidak dapat dihapus." }, { status: 403 });
    const user = await prisma.pengguna.findUnique({ where: { id_pengguna: id }, select: { role: true } });
    if (!user || !ROLES.includes(user.role as AccountRole)) return Response.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    if (await hasAccountHistory(id, user.role as AccountRole)) return Response.json({ error: "Akun tidak dapat dihapus karena memiliki riwayat operasional." }, { status: 409 });
    await prisma.$transaction((tx) => tx.pengguna.delete({ where: { id_pengguna: id } })); return Response.json({ success: true });
  } catch (error) { return ownerError(error, "Akun belum dapat dihapus."); }
}
