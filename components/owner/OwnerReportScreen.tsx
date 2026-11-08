"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OwnerIcon from "@/components/owner/OwnerIcon";

type Report = {
  totalServices: number; totalVehicles: number; revenue: number; completed: number; cancelled: number;
  statusGroups: { completed: number; working: number; waiting: number };
  serviceTypes: { name: string; count: number; percent: number }[];
  transactions: { id: string; date: string; amount: number; plate: string; customer: string; method: string }[];
  services: { id: string; queue: string; date: string; customer: string; vehicle: string; plate: string; status: string; serviceType: string }[];
};
const kinds = ["Laporan Transaksi", "Laporan Pelayanan Servis", "Statistik Pelayanan"] as const;
const noTransactions: Report["transactions"] = [];
const noServices: Report["services"] = [];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const initial = new Date();
const monthStart = iso(new Date(initial.getFullYear(), initial.getMonth(), 1));
const monthEnd = iso(new Date(initial.getFullYear(), initial.getMonth() + 1, 0));
const dateDisplay = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const dateCell = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(value));
const money = (value: number) => `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
const qs = (start: string, end: string, type?: string, step?: "jenis" | "periode") => `?awal=${start}&akhir=${end}${type ? `&jenis=${encodeURIComponent(type)}` : ""}${step ? `&langkah=${step}` : ""}`;

export default function OwnerReportScreen({ initialSearch = {} }: { initialSearch?: { awal?: string; akhir?: string; jenis?: string; langkah?: string } }) {
  const router = useRouter();
  const initialKind = initialSearch.jenis && kinds.includes(initialSearch.jenis as (typeof kinds)[number]) ? initialSearch.jenis : "";
  const [start, setStart] = useState(initialSearch.awal ?? monthStart);
  const [end, setEnd] = useState(initialSearch.akhir ?? monthEnd);
  const [type, setType] = useState(initialKind);
  const [phase, setPhase] = useState<"period" | "types">(initialSearch.awal && !initialKind && initialSearch.langkah !== "periode" ? "types" : "period");
  const [report, setReport] = useState<Report | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!type || !start || !end) return;
    let cancelled = false;
    void fetch(`/api/owner/laporan?start=${start}&end=${end}`).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (!cancelled) { setReport(data); setError(""); }
    }).catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Data laporan gagal dimuat."); });
    return () => { cancelled = true; };
  }, [type, start, end]);
  function updateUrl(nextStart = start, nextEnd = end, nextType = type, step?: "jenis" | "periode") { window.history.replaceState(null, "", `/owner/buat-laporan${qs(nextStart, nextEnd, nextType || undefined, step)}`); }
  function goToTypes() {
    setError(""); if (!start || !end || end < start) { setError("Periode akhir harus sama dengan atau setelah periode awal."); return; }
    updateUrl(start, end, "", "jenis"); setType(""); setReport(null); setPhase("types");
  }
  function choose(kind: string) { setPage(1); setType(kind); updateUrl(start, end, kind); }
  async function download() {
    if (!type) return; setBusy(true); setError("");
    try {
      const created = await fetch("/api/owner/laporan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, start, end }) });
      const result = await created.json(); if (!created.ok) throw new Error(result.error);
      const response = await fetch(`/api/owner/laporan/pdf?type=${encodeURIComponent(type)}&start=${start}&end=${end}`);
      if (!response.ok) throw new Error("PDF belum dapat diunduh.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `laporan-${result.id_laporan}.pdf`; anchor.click(); URL.revokeObjectURL(url);
      router.push(`/owner-pdf-berhasil${qs(start, end, type)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "PDF belum dapat dibuat."); }
    finally { setBusy(false); }
  }
  const period = `${dateDisplay(start)} – ${dateDisplay(end)}`;
  const transactionRows = report?.transactions ?? noTransactions;
  const serviceRows = report?.services ?? noServices;
  const totalRows = type === kinds[0] ? transactionRows.length : serviceRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / 4));
  const visibleTransactions = useMemo(() => transactionRows.slice((page - 1) * 4, page * 4), [transactionRows, page]);
  const visibleServices = useMemo(() => serviceRows.slice((page - 1) * 4, page * 4), [serviceRows, page]);
  const finished = report?.statusGroups.completed ?? 0; const working = report?.statusGroups.working ?? 0; const waiting = report?.statusGroups.waiting ?? 0;
  const weekly = useMemo(() => {
    if (!report) return [] as { label: string; count: number }[];
    const startDate = new Date(`${start}T00:00:00Z`); const endDate = new Date(`${end}T00:00:00Z`); const buckets: { label: string; count: number }[] = [];
    for (let offset = 0; offset <= (endDate.getTime() - startDate.getTime()) / 86400000; offset += 7) {
      const from = new Date(startDate.getTime() + offset * 86400000); const to = new Date(Math.min(endDate.getTime(), from.getTime() + 6 * 86400000));
      const count = report.services.filter((row) => { const d = new Date(row.date).getTime(); return d >= from.getTime() && d <= to.getTime() + 86400000; }).length;
      buckets.push({ label: `${from.getUTCDate()}–${to.getUTCDate()} ${new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(from)}`, count });
    }
    return buckets;
  }, [report, start, end]);
  const maxAxis = Math.max(10, Math.ceil(Math.max(...weekly.map((x) => x.count), 0) / 10) * 10);

  if (type && report) return <div className={`owner-page owner-report owner-report-result-page ${type === kinds[0] ? "owner-transaction-report" : type === kinds[1] ? "owner-service-report" : "owner-stat-report"}`}>
    <h1 className="owner-report-page-title">{type === kinds[0] ? "Laporan Transaksi" : type === kinds[1] ? "Laporan Pelayanan Servis" : "Statistik Pelayanan"}</h1>
    <section className="owner-report-gradient">
      <Link className="owner-report-back" href={`/owner/buat-laporan${qs(start, end, undefined, "periode")}`}>← Kembali ke Periode Laporan</Link>
      <h2>{type}</h2><p className="owner-report-period">Periode {period}</p>
      <button className="owner-download" onClick={download} disabled={busy}><OwnerIcon name="download" size={18}/>{busy ? "Menyiapkan PDF" : "Unduh PDF"}</button>
      {type === kinds[0] && <>
        <div className="owner-summary-grid owner-tx-summary"><article><small>Total Pendapatan</small><b>{money(report.revenue)}</b><span>Dari seluruh {report.transactions.length} transaksi lunas</span></article><article><small>Jumlah Transaksi</small><b>{report.transactions.length} transaksi</b><span>Seluruh pembayaran telah lunas</span></article><article><small>Rata-rata Nilai Transaksi</small><b>{money(report.transactions.length ? Math.round(report.revenue / report.transactions.length) : 0)}</b><span>Total pendapatan ÷ {report.transactions.length} transaksi</span></article></div>
        <div className="owner-empty-band"/><div className="owner-report-table-card"><table><thead><tr><th>Tanggal</th><th>ID Transaksi</th><th>Pelanggan</th><th>Metode Pembayaran</th><th>Total Pembayaran</th><th>Status</th></tr></thead><tbody>{visibleTransactions.map((row) => <tr key={row.id}><td>{dateCell(row.date)}</td><td>{row.id}</td><td>{row.customer}</td><td>{row.method === "Transfer" ? "Transfer bank" : row.method}</td><td>{money(row.amount)}</td><td><span className="owner-report-chip done">Lunas</span></td></tr>)}</tbody></table><div className="owner-report-pager"><span>Menampilkan {totalRows ? (page - 1) * 4 + 1 : 0}–{Math.min(page * 4, totalRows)} dari {totalRows} transaksi</span><div><button disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button><span>Halaman {page} dari {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button></div></div></div>
      </>}
      {type === kinds[1] && <>
        <div className="owner-summary-grid owner-service-summary"><article><small>Total Pelayanan</small><b>{report.totalServices} servis</b><span>{report.totalVehicles} kendaraan pada periode terpilih</span></article><article><small>Servis Selesai</small><b>{finished} servis</b><span>{report.totalServices ? `${(finished / report.totalServices * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}% dari total pelayanan` : "0% dari total pelayanan"}</span></article><article><small>Belum Selesai</small><b>{working + waiting} servis</b><span>{working} sedang dikerjakan · {waiting} menunggu</span></article></div>
        <div className="owner-empty-band"/><div className="owner-report-table-card owner-service-table"><table><thead><tr><th>Tanggal</th><th>ID Servis</th><th>Pelanggan</th><th>No. Polisi</th><th>Jenis Pelayanan</th><th>Status Penyelesaian</th></tr></thead><tbody>{visibleServices.map((row) => <tr key={row.id}><td>{dateCell(row.date)}</td><td>{row.id}</td><td>{row.customer}</td><td>{row.plate}</td><td>{row.serviceType}</td><td><span className={`owner-report-chip ${row.status === "Selesai" ? "done" : row.status === "Diproses" ? "working" : "waiting"}`}>{row.status === "Selesai" ? "Selesai" : row.status === "Diproses" ? "Sedang Dikerjakan" : "Menunggu"}</span></td></tr>)}</tbody></table><div className="owner-report-pager"><span>Menampilkan {totalRows ? (page - 1) * 4 + 1 : 0}–{Math.min(page * 4, totalRows)} dari {totalRows} servis</span><div><button disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button><span>Halaman {page} dari {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button></div></div></div>
      </>}
      {type === kinds[2] && <>
        <div className="owner-summary-grid owner-stat-summary"><article><small>Total Servis</small><b>{report.totalServices} servis</b><span>Seluruh servis pada periode terpilih</span></article><article><small>Kendaraan Dilayani</small><b>{report.totalVehicles} kendaraan</b><span>Satu servis untuk setiap kendaraan</span></article><article><small>Pelayanan Terbanyak</small><b>{report.serviceTypes[0]?.name ?? "—"}</b><span>{report.serviceTypes[0]?.count ?? 0} servis · {report.serviceTypes[0]?.percent ?? 0}% dari total servis</span></article></div>
        <div className="owner-empty-band"/><div className="owner-stats-content"><section className="owner-chart-card"><h3>Jumlah Servis per Minggu</h3><div className="owner-chart" style={{ "--axis-max": maxAxis } as React.CSSProperties}><div className="owner-axis">{[maxAxis, Math.round(maxAxis * 2 / 3), Math.round(maxAxis / 3), 0].map((x) => <span key={x}>{x}</span>)}</div><div className="owner-bars-chart">{weekly.slice(0, 4).map((x) => { const barHeight = maxAxis ? x.count / maxAxis * 188 : 0; return <div key={x.label} className="owner-bar-wrap"><b style={{ bottom: `${29 + barHeight}px` }}>{x.count}</b><i style={{ height: `${barHeight}px` }}/><small>{x.label}</small></div>; })}</div></div></section><section className="owner-top-types"><h3>Jenis Pelayanan Terbanyak</h3>{report.serviceTypes.map((x, i) => <div className="owner-type-row" key={x.name}><span>{i + 1}. {x.name}</span><b>{x.count} · {x.percent}%</b><i><em style={{ width: `${x.percent * 4.85}px` }}/></i></div>)}</section></div>
        <div className="owner-status-strip"><b>Status Pelayanan</b><span>Menunggu</span><strong>{waiting}</strong><span>Sedang Dikerjakan</span><strong>{working}</strong><span>Selesai</span><strong>{finished}</strong></div>
      </>}
    </section>{error && <div className="owner-error" role="alert">{error}</div>}{type !== kinds[1] && type !== kinds[2] && <OwnerFooter report/>}
  </div>;

  if (phase === "types" && !type) return <div className="owner-page owner-report owner-report-types"><h1>Pilih Jenis Laporan</h1><section className="owner-types-gradient"><Link href={`/owner/buat-laporan${qs(start, end, undefined, "periode")}`}>← Kembali ke Periode Laporan</Link><h2>Pilih laporan yang ingin ditinjau</h2><p>Telusuri transaksi, pelayanan servis, atau statistik pada periode terpilih.</p><strong>{period}</strong><div className="owner-kind-cards">{kinds.map((kind, i) => <button key={kind} onClick={() => choose(kind)}><i><OwnerIcon name={i === 0 ? "report" : i === 1 ? "service" : "stats"} size={24}/></i><b>{kind}</b><span>{["Rincian pembayaran, tanggal transaksi, dan total pendapatan servis.", "Data kendaraan yang diservis, jenis pelayanan, dan status penyelesaian servis.", "Grafik jumlah servis dan gambaran aktivitas pelayanan selama periode terpilih."][i]}</span><strong>{["Lihat Transaksi →", "Lihat Pelayanan Servis →", "Lihat Statistik →"][i]}</strong></button>)}</div><small>Semua laporan menggunakan periode yang sama. Kembali ke Periode Laporan untuk mengubah tanggal.</small></section></div>;

  return <div className="owner-page owner-report owner-period-page"><h1>Periode Laporan</h1><section className="owner-period-card"><Link href="/owner/dashboard">← Kembali ke Dashboard</Link><h2>Input Periode Laporan</h2><p>Pilih rentang tanggal yang ingin ditinjau. Periode awal harus sama dengan atau lebih awal daripada periode akhir.</p><label>Periode Awal<input type="date" value={start} onChange={(e) => setStart(e.target.value)}/></label><label>Periode Akhir<input type="date" value={end} onChange={(e) => setEnd(e.target.value)}/></label><div className="owner-period-actions"><button onClick={goToTypes}>Lanjutkan <OwnerIcon name="arrow" size={20}/></button><span>Pilih jenis laporan pada langkah berikutnya</span></div>{error && <div className="owner-error" role="alert">{error}</div>}</section><OwnerFooter report/></div>;
}

function OwnerFooter({ report = false }: { report?: boolean }) { return <footer className="owner-content-footer">{report ? "Mitra Jaya Service — Sistem Informasi Bengkel" : "Mitra Jaya Service — Sistem Informasi Bengkel"}</footer>; }
