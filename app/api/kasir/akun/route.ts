import { hash } from "bcryptjs";
import { Prisma } from "@/app/generated/prisma/client";
import { getKasirContext, KasirError, kasirErrorResponse, kasirForbidden, nextCode } from "@/lib/kasir";
import { prisma } from "@/lib/prisma";

function validPhone(value: unknown): value is string {
  return typeof value === "string" && value.trim().length <= 15 && /^\+?[0-9][0-9\s-]{8,14}$/.test(value.trim()) && value.trim().replace(/[\s-]/g, "").length <= 15;
}

export async function GET(request: Request) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim();
    const users = await prisma.pengguna.findMany({
      where: { role: "Customer", ...(q ? { OR: [
        { nama: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { no_hp: { contains: q } },
      ] } : {}) },
      select: { id_pengguna: true, nama: true, username: true, no_hp: true, role: true, login: true, tanggal_registrasi: true, customer: { select: { id_customer: true, kendaraan: { select: { _count: { select: { servis: true } } } } } } },
      orderBy: [{ nama: "asc" }, { id_pengguna: "asc" }], take: 100,
    });
    return Response.json(users.map((u) => ({ id: u.id_pengguna, customerId: u.customer?.id_customer, name: u.nama, username: u.username, phone: u.no_hp, role: u.role, login: u.login, registered: u.tanggal_registrasi, vehicleCount: u.customer?.kendaraan.length ?? 0, serviceCount: u.customer?.kendaraan.reduce((sum, v) => sum + v._count.servis, 0) ?? 0 })));
  } catch (error) { return kasirErrorResponse(error, "Daftar akun belum dapat dimuat."); }
}

export async function POST(request: Request) {
  if (!(await getKasirContext())) return kasirForbidden();
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.nama !== "string" || !body.nama.trim() || body.nama.trim().length > 100 || typeof body.username !== "string" || !/^[A-Za-z0-9._-]{3,50}$/.test(body.username.trim()) || typeof body.password !== "string" || body.password.length < 8 || body.password.length > 72 || !validPhone(body.no_hp)) throw new KasirError("Lengkapi nama, username, kata sandi minimal 8 karakter, dan nomor telepon yang valid.");
    const username = body.username.trim();
    if (await prisma.pengguna.findUnique({ where: { username }, select: { id_pengguna: true } })) throw new KasirError("Username sudah digunakan. Pilih username lain.", 409);
    const password = await hash(body.password, 10);
    await prisma.$transaction(async (tx) => {
      const idPengguna = await nextCode(tx, "pengguna", "id_pengguna", "P", 3);
      const idCustomer = await nextCode(tx, "customer", "id_customer", "C", 3);
      await tx.pengguna.create({ data: { id_pengguna: idPengguna, nama: body.nama.trim(), username, password, no_hp: body.no_hp.trim(), role: "Customer", login: body.login === "Nonaktif" ? "Nonaktif" : "Aktif" } });
      await tx.customer.create({ data: { id_customer: idCustomer, id_pengguna: idPengguna } });
    });
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "Username sudah digunakan. Pilih username lain." }, { status: 409 });
    return kasirErrorResponse(error, "Akun customer belum dapat dibuat.");
  }
}
