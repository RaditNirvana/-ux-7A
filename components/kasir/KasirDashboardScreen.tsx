"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type Summary = { readyForCosting: number; waitingForPayment: number; paidToday: number; revenue: number };
type ServiceRow = { id: string; number: string; status: string; complaint: string; customer: string; vehicle: string };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const activeStatuses = ["Menunggu Verifikasi", "Menunggu Penugasan", "Ditugaskan", "Diperiksa", "Menunggu Persetujuan", "Siap Dikerjakan", "Diproses"];

function statusChip(status: string) {
  if (status === "Diproses") return { label: "Proses", className: "process" };
  if (["Ditugaskan", "Diperiksa", "Siap Dikerjakan"].includes(status)) return { label: "Dikerjakan", className: "working" };
  return { label: "Menunggu", className: "waiting" };
}

export default function KasirDashboardScreen() {
  const [data, setData] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/kasir/dashboard")
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setData)
      .catch(() => setError("Ringkasan belum dapat dimuat."));
    fetch("/api/kasir/rincian")
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<ServiceRow[]>; })
      .then((services) => setRows(services.filter((service) => activeStatuses.includes(service.status)).slice(0, 5)))
      .catch(() => setError("Daftar servis aktif belum dapat dimuat."));
  }, []);

  const cards: { label: string; value: string; note: string; tone: string }[] = [
    { label: "Menunggu Rincian Biaya", value: String(data?.readyForCosting ?? "—"), note: "Servis telah dikonfirmasi SA", tone: "blue" },
    { label: "Menunggu Pembayaran", value: String(data?.waitingForPayment ?? "—"), note: "Tagihan menunggu pembayaran", tone: "violet" },
    { label: "Pendapatan Hari Ini", value: money(data?.paidToday ?? 0), note: "Pembayaran lunas hari ini", tone: "green" },
  ];

  return (
    <section className="kasir-page kasir-dashboard">
      {error && <p className="kasir-inline-error" role="alert">{error}</p>}
      <section className="kasir-dashboard-banner">
        <h1>Halo, Kasir!</h1>
        <p>Buat rincian biaya untuk servis yang sudah dikonfirmasi, lalu catat pembayaran dan cetak bukti transaksi.</p>
        <Image alt="" className="kasir-dashboard-tools" height={139} src="/figma-assets/tools-3d.png" width={219} />
      </section>

      <section aria-label="Ringkasan Kasir" className="kasir-dashboard-stats">
        {cards.map((card) => (
          <article className="kasir-dashboard-stat" key={card.label}>
            <span className={`kasir-dashboard-stat-icon ${card.tone}`} aria-hidden="true">▣</span>
            <span className="kasir-dashboard-stat-label">{card.label}</span>
            <strong className="kasir-dashboard-stat-value">{card.value}</strong>
            <small className="kasir-dashboard-stat-note">{card.note}</small>
          </article>
        ))}
      </section>

      <section className="kasir-active-services">
        <div className="kasir-active-heading"><h2>Servis Aktif</h2><Link href="/kasir/rincian-biaya">Lihat Semua <span aria-hidden="true">→</span></Link></div>
        <table className="kasir-active-table">
          <colgroup><col/><col/><col/><col/><col/></colgroup>
          <thead><tr><th>No. Servis</th><th>Pelanggan</th><th>Kendaraan</th><th>Keluhan</th><th>Status</th></tr></thead>
          <tbody>{rows.map((row) => {
            const chip = statusChip(row.status);
            return <tr key={row.id}><td className="service-number">{row.number}</td><td>{row.customer}</td><td>{row.vehicle}</td><td className="service-complaint">{row.complaint}</td><td><span className={`kasir-active-chip ${chip.className}`}>{chip.label}</span></td></tr>;
          })}</tbody>
        </table>
        {!rows.length && !error && <p className="kasir-active-empty">Belum ada servis aktif.</p>}
      </section>
    </section>
  );
}
