import { getOwnerContext, ownerError, ownerForbidden } from "@/lib/owner";
import { buildOwnerReport, parsePeriod, REPORT_TYPES } from "@/lib/owner-report";

function escapePdf(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "?").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"); }
function makePdf(lines: string[]) {
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / 30)) }, (_, page) => lines.slice(page * 30, (page + 1) * 30));
  const fontId = 3 + pages.length * 2;
  const objects = [`<< /Type /Catalog /Pages 2 0 R >>`, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`];
  pages.forEach((pageLines, pageIndex) => {
    const pageId = 3 + pageIndex * 2; const streamId = pageId + 1;
    const content = pageLines.map((line, index) => `BT /F1 ${pageIndex === 0 && index === 0 ? 16 : 10} Tf 48 ${790 - index * 24} Td (${escapePdf(line)}) Tj ET`).join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
    objects.push(`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`);
  });
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(new TextEncoder().encode(pdf).length); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = new TextEncoder().encode(pdf).length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
export async function GET(request: Request) {
  if (!(await getOwnerContext())) return ownerForbidden();
  const q = new URL(request.url).searchParams; const type = q.get("type"); const period = parsePeriod(q.get("start"), q.get("end"));
  if (!type || !REPORT_TYPES.includes(type as (typeof REPORT_TYPES)[number]) || !period) return Response.json({ error: "Parameter laporan tidak valid." }, { status: 400 });
  try {
    const report = await buildOwnerReport(period.start, period.end);
    const idr = (value: number) => `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
    const lines = [type, `Periode: ${q.get("start")} sampai ${q.get("end")}`];
    if (type === "Laporan Transaksi") {
      lines.push(`Total Pendapatan: ${idr(report.revenue)}`, `Jumlah Transaksi: ${report.transactions.length}`, `Rata-rata Nilai Transaksi: ${idr(report.transactions.length ? Math.round(report.revenue / report.transactions.length) : 0)}`, "Tanggal | ID Transaksi | Pelanggan | Metode Pembayaran | Total | Status");
      lines.push(...report.transactions.map((x) => `${new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeZone: "UTC" }).format(new Date(x.date))} | ${x.id} | ${x.customer} | ${x.method === "Transfer" ? "Transfer bank" : x.method} | ${idr(x.amount)} | Lunas`));
    } else if (type === "Laporan Pelayanan Servis") {
      lines.push(`Total Pelayanan: ${report.totalServices}`, `Kendaraan Dilayani: ${report.totalVehicles}`, `Servis Selesai: ${report.completed}`, `Belum Selesai: ${report.statusGroups.working + report.statusGroups.waiting}`, "Tanggal | ID Servis | Pelanggan | No. Polisi | Jenis Pelayanan | Status Penyelesaian");
      lines.push(...report.services.map((x) => `${new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeZone: "UTC" }).format(new Date(x.date))} | ${x.id} | ${x.customer} | ${x.plate} | ${x.serviceType} | ${x.status === "Selesai" ? "Selesai" : x.status === "Diproses" ? "Sedang Dikerjakan" : "Menunggu"}`));
    } else {
      lines.push(`Total Servis: ${report.totalServices}`, `Kendaraan Dilayani: ${report.totalVehicles}`, `Pelayanan Terbanyak: ${report.serviceTypes[0]?.name ?? "—"} (${report.serviceTypes[0]?.count ?? 0} · ${report.serviceTypes[0]?.percent ?? 0}%)`, "Status Pelayanan", `Menunggu: ${report.statusGroups.waiting}`, `Sedang Dikerjakan: ${report.statusGroups.working}`, `Selesai: ${report.statusGroups.completed}`, "Jenis Pelayanan Terbanyak", ...report.serviceTypes.map((x) => `${x.name}: ${x.count} · ${x.percent}%`));
    }
    const bytes = makePdf(lines);
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=laporan-mitra-jaya.pdf", "Cache-Control": "no-store" } });
  } catch (error) { return ownerError(error, "PDF belum dapat dibuat."); }
}
