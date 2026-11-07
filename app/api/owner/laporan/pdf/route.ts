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
    const lines = [type, `Periode: ${q.get("start")} sampai ${q.get("end")}`, `Total servis: ${report.totalServices}`, `Servis selesai: ${report.completed}`, `Servis batal: ${report.cancelled}`, `Pendapatan: Rp ${new Intl.NumberFormat("id-ID").format(report.revenue)}`, `Jumlah transaksi: ${report.transactions.length}`, `Rata-rata durasi (hari): ${report.averageDurationDays?.toFixed(1) ?? "Tidak tersedia"}`, ...report.statuses.map((x) => `Status ${x.status}: ${x.count}`)];
    if (type === "Laporan Transaksi") lines.push("Rincian transaksi", ...report.transactions.map((x) => `${x.id} | ${x.plate} | Rp ${new Intl.NumberFormat("id-ID").format(x.amount)}`));
    if (type === "Laporan Pelayanan Servis") lines.push("Rincian pelayanan servis", ...report.services.map((x) => `${x.queue} | ${x.plate} | ${x.status}${x.cancellation ? ` | Alasan: ${x.cancellation}` : ""}`));
    const bytes = makePdf(lines);
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=laporan-mitra-jaya.pdf", "Cache-Control": "no-store" } });
  } catch (error) { return ownerError(error, "PDF belum dapat dibuat."); }
}
