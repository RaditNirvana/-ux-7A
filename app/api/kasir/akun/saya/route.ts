import { hash } from "bcryptjs";
import { getKasirContext, KasirError, kasirErrorResponse, kasirForbidden } from "@/lib/kasir";
import { prisma } from "@/lib/prisma";

function validPhone(value: unknown): value is string {
  return typeof value === "string" && value.trim().length <= 15 && /^\+?[0-9][0-9\s-]{8,14}$/.test(value.trim()) && value.trim().replace(/[\s-]/g, "").length <= 15;
}

export async function GET() {
  const user = await getKasirContext(); if (!user) return kasirForbidden();
  const row = await prisma.pengguna.findUnique({ where: { id_pengguna: user.id_pengguna }, select: { id_pengguna: true, nama: true, username: true, no_hp: true, role: true } });
  if (!row) return kasirForbidden();
  return Response.json({ id: row.id_pengguna, name: row.nama, username: row.username, phone: row.no_hp, role: row.role });
}

export async function PATCH(request: Request) {
  const user = await getKasirContext(); if (!user) return kasirForbidden();
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.nama !== "string" || !body.nama.trim() || body.nama.trim().length > 100 || !validPhone(body.no_hp) || (body.password !== undefined && (typeof body.password !== "string" || (body.password && body.password.length < 8) || body.password.length > 72))) throw new KasirError("Nama, nomor telepon, atau kata sandi tidak valid.");
    const data = { nama: body.nama.trim(), no_hp: body.no_hp.trim(), ...(body.password ? { password: await hash(body.password, 10) } : {}) };
    await prisma.pengguna.update({ where: { id_pengguna: user.id_pengguna }, data });
    return Response.json({ success: true });
  } catch (error) { return kasirErrorResponse(error, "Akun Kasir belum dapat diubah."); }
}
