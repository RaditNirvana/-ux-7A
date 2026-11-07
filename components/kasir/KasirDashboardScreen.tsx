"use client";

import { useEffect, useState } from "react";

type Summary = { readyForCosting: number; waitingForPayment: number; paidToday: number; revenue: number };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function KasirDashboardScreen() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/kasir/dashboard").then(async (r) => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(() => setError("Ringkasan belum dapat dimuat.")); }, []);
  const cards: [string, string, string][] = [
    ["Menunggu Rincian Biaya", String(data?.readyForCosting ?? "—"), "Servis telah dikonfirmasi SA"],
    ["Menunggu Pembayaran", String(data?.waitingForPayment ?? "—"), "Tagihan menunggu pembayaran"],
    ["Pendapatan Hari Ini", money(data?.paidToday ?? 0), "Pembayaran lunas hari ini"],
    ["Total Pendapatan", money(data?.revenue ?? 0), "Seluruh transaksi tercatat"],
  ];
  return <section className="kasir-page">
    <div className="kasir-page-heading"><div><p className="kasir-eyebrow">Ringkasan</p><h1>Dashboard Kasir</h1><p>Pantau rincian biaya dan pembayaran servis.</p></div></div>
    {error && <p className="kasir-inline-error" role="alert">{error}</p>}
    <div className="kasir-summary-grid">{cards.map(([label, value, hint]) => <article className="kasir-summary-card" key={label}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>)}</div>
    <div className="kasir-welcome-card"><div><span className="kasir-eyebrow">Mitra Jaya Service</span><h2>Kelola transaksi servis dengan mudah</h2><p>Buat rincian biaya untuk servis yang sudah dikonfirmasi, lalu catat pembayaran dan cetak bukti transaksi.</p></div><a href="/kasir/rincian-biaya">Buka Rincian Biaya <span aria-hidden="true">→</span></a></div>
  </section>;
}
