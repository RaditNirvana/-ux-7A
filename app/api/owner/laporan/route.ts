import { Prisma } from "@/app/generated/prisma/client";
import { getOwnerContext, ownerError, ownerForbidden } from "@/lib/owner";
import { buildOwnerReport, nextReportCode, parsePeriod, REPORT_TYPES } from "@/lib/owner-report";
import { prisma } from "@/lib/prisma";
import { getJakartaDateBounds } from "@/lib/kasir";

export async function GET(request: Request) {
  if (!(await getOwnerContext())) return ownerForbidden();
  const query = new URL(request.url).searchParams;
  const period = parsePeriod(query.get("start"), query.get("end"));
  if (!period) return Response.json({ error: "Periode tidak valid. Pastikan tanggal akhir sama atau setelah tanggal awal." }, { status: 400 });
  try { return Response.json(await buildOwnerReport(period.start, period.end)); }
  catch (error) { return ownerError(error, "Data laporan belum dapat dimuat."); }
}

export async function POST(request: Request) {
  const owner = await getOwnerContext();
  if (!owner) return ownerForbidden();
  try {
    const body = await request.json().catch(() => null);
    if (!body || !REPORT_TYPES.includes(body.type) || typeof body.start !== "string" || typeof body.end !== "string") return Response.json({ error: "Jenis laporan dan periode wajib diisi." }, { status: 400 });
    const period = parsePeriod(body.start, body.end);
    if (!period) return Response.json({ error: "Periode tidak valid. Tanggal akhir harus sama atau setelah tanggal awal." }, { status: 400 });
    const report = await buildOwnerReport(period.start, period.end);
    const result = await prisma.$transaction(async (tx) => {
      const id = await nextReportCode(tx);
      const created = await tx.laporan.create({ data: { id_laporan: id, jenis_laporan: body.type, periode_awal: period.start, periode_akhir: new Date(`${body.end}T00:00:00.000Z`), tanggal_dibuat: getJakartaDateBounds().date, total_servis: report.totalServices, total_pendapatan: new Prisma.Decimal(report.revenue), id_owner: owner.id_owner }, select: { id_laporan: true } });
      await tx.transaksi.updateMany({ where: { tanggal_transaksi: { gte: period.start, lte: new Date(`${body.end}T23:59:59.999Z`) }, id_laporan: null }, data: { id_laporan: id } });
      return created;
    });
    return Response.json({ ...result, ...report }, { status: 201 });
  } catch (error) { return ownerError(error, "Laporan belum dapat dibuat."); }
}
