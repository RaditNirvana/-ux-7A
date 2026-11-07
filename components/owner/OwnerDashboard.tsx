"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import OwnerIcon from "@/components/owner/OwnerIcon";

type Data = { revenue: number; paidCount: number; statuses: { status: string; count: number }[]; transactions: { id: string; date: string; amount: number; plate: string }[]; activity: { stage: string; note: string | null; date: string; queue: string }[] };
const money = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
const date = (v: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(v));

export default function OwnerDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/owner/dashboard").then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); }).catch((e) => setError(e.message)); }, []);
  const cards = [["Laporan Transaksi", "Rincian pembayaran, tanggal transaksi, dan total pendapatan servis", "/owner/laporan", "report"], ["Laporan Pelayanan Servis", "Data servis, pelayanan, dan status penyelesaian", "/owner/laporan", "service"], ["Statistik Pelayanan", "Grafik jumlah servis selama periode terpilih", "/owner/laporan", "stats"], ["Kelola Akun", "Kelola informasi pengguna bengkel", "/owner/akun", "users"]];
  return <div className="owner-page owner-dashboard"><section className="owner-hero"><div><span className="owner-eyebrow">MITRA JAYA SERVICE</span><h1>HALO, OWNER!</h1><p>Telusuri data transaksi, pelayanan, serta statistik untuk mendukung evaluasi operasional</p><Link href="/owner/laporan">Mulai Buat Laporan <OwnerIcon name="arrow" size={16}/></Link></div><div className="owner-hero-art" aria-hidden="true"><Image src="/figma-assets/owner-dashboard-hero.png" alt="" width={270} height={218}/></div></section>
  <div className="owner-title-row"><h2>Jelajahi Kinerja Operasional</h2><span>Ringkasan keseluruhan</span></div>
  {error && <div className="owner-error" role="alert">{error}</div>}
  <section className="owner-kpis"><article><small>Total Pendapatan Terkonfirmasi</small><strong>{data ? money(data.revenue) : "Memuat…"}</strong><span>{data?.paidCount ?? "—"} pembayaran lunas dan terkonfirmasi</span></article><article><small>Total Servis</small><strong>{data?.statuses.reduce((n, x) => n + x.count, 0) ?? "—"}</strong><span>Semua status servis</span></article><article><small>Servis Selesai</small><strong>{data?.statuses.find((x) => x.status === "Selesai")?.count ?? 0}</strong><span>Siap dievaluasi</span></article></section>
  <div className="owner-cards">{cards.map(([title, text, href, icon]) => <Link href={href} className="owner-card" key={title}><i><OwnerIcon name={icon} size={20}/></i><b>{title}</b><p>{text}</p></Link>)}</div>
  <div className="owner-data-grid"><section className="owner-panel"><h3>Transaksi Terbaru</h3><div className="owner-scroll"><table><thead><tr><th>ID</th><th>Tanggal</th><th>Kendaraan</th><th>Pendapatan</th></tr></thead><tbody>{data?.transactions.map((r) => <tr key={r.id}><td>{r.id}</td><td>{date(r.date)}</td><td>{r.plate}</td><td>{money(r.amount)}</td></tr>)}</tbody></table>{!data?.transactions.length && <p className="owner-empty">Belum ada transaksi.</p>}</div></section><section className="owner-panel"><h3>Aktivitas Servis Terbaru</h3><div className="owner-scroll owner-activity">{data?.activity.map((r, i) => <div key={`${r.queue}-${i}`}><i/><span><b>{r.stage}</b><small>{r.note || r.queue} · {date(r.date)}</small></span></div>)}</div></section></div>
  <section className="owner-statuses"><h3>Status Servis</h3>{(data?.statuses ?? []).map((x) => <span key={x.status}>{x.status}<b>{x.count}</b></span>)}</section>
  </div>;
}
