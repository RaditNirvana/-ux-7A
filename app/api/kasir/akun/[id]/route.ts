import { hash } from "bcryptjs";
import { Prisma } from "@/app/generated/prisma/client";
import { getKasirContext, KasirError, kasirErrorResponse, kasirForbidden } from "@/lib/kasir";
import { prisma } from "@/lib/prisma";

function validPhone(value: unknown): value is string {
  return typeof value === "string" && value.trim().length <= 15 && /^\+?[0-9][0-9\s-]{8,14}$/.test(value.trim()) && value.trim().replace(/[\s-]/g, "").length <= 15;
}

async function getCustomerTarget(id: string) {
  return prisma.pengguna.findUnique({ where: { id_pengguna: id }, select: { id_pengguna: true, role: true, nama: true, username: true, no_hp: true, login: true, customer: { select: { kendaraan: { select: { _count: { select: { servis: true } } } } } } } });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getKasirContext())) return kasirForbidden();
  const { id } = await context.params;
  const row = await getCustomerTarget(id);
  if (!row || row.role !== "Customer" || !row.customer) return kasirForbidden();
  return Response.json({ id: row.id_pengguna, name: row.nama, username: row.username, phone: row.no_hp, role: row.role, login: row.login, vehicleCount: row.customer.kendaraan.length, serviceCount: row.customer.kendaraan.reduce((sum, v) => sum + v._count.servis, 0) });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const { id } = await context.params;
    const row = await getCustomerTarget(id);
    if (!row || row.role !== "Customer" || !row.customer) return kasirForbidden();
    const body = await request.json().catch(() => null);
    if (!body || typeof body.nama !== "string" || !body.nama.trim() || body.nama.trim().length > 100 || !validPhone(body.no_hp) || (body.password !== undefined && (typeof body.password !== "string" || (body.password && body.password.length < 8) || body.password.length > 72)) || (body.login !== "Aktif" && body.login !== "Nonaktif")) throw new KasirError("Data akun customer tidak valid.");
    const data = { nama: body.nama.trim(), no_hp: body.no_hp.trim(), login: body.login, ...(body.password ? { password: await hash(body.password, 10) } : {}) };
    await prisma.pengguna.update({ where: { id_pengguna: id }, data });
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "Username sudah digunakan." }, { status: 409 });
    return kasirErrorResponse(error, "Akun customer belum dapat diubah.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const { id } = await context.params;
    const row = await getCustomerTarget(id);
    if (!row || row.role !== "Customer" || !row.customer) return kasirForbidden();
    if (row.customer.kendaraan.length) throw new KasirError("Akun tidak dapat dihapus karena customer memiliki kendaraan atau riwayat servis.", 409);
    await prisma.$transaction(async (tx) => {
      await tx.customer.delete({ where: { id_pengguna: id } });
      await tx.pengguna.delete({ where: { id_pengguna: id } });
    });
    return Response.json({ success: true });
  } catch (error) { return kasirErrorResponse(error, "Akun customer belum dapat dihapus."); }
}
