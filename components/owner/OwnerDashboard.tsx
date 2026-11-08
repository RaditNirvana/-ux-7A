"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type DashboardData = {
  revenue: number;
  paidCount: number;
  statuses: { status: string; count: number }[];
  transactions: { id: string; date: string; amount: number; plate: string }[];
  activity: { stage: string; note: string | null; date: string; queue: string }[];
};

const cards = [
  ["▤", "Laporan Transaksi", "Rincian pembayaran, tanggal transaksi, dan total pendapatan servis", "/owner/buat-laporan"],
  ["🔧", "Laporan Pelayanan Servis", "Data kendaraan yang diservis, jenis pelayanan, dan status penyelesaian servis", "/owner/buat-laporan"],
  ["▣", "Statistik Pelayanan", "Grafik jumlah servis dan gambaran aktivitas pelayanan selama periode terpilih", "/owner/buat-laporan"],
  ["♙", "Kelola Akun", "Kelola informasi pengguna dan pengaturan akun bengkel", "/owner/kelola-akun"],
];

export default function OwnerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/owner/dashboard")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setData(result);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  void data;
  void error;

  return (
    <div className="owner-page owner-dashboard">
      <section className="owner-hero">
        <h1>HALO, OWNER!</h1>
        <p>Telusuri data transaksi, pelayanan, serta statistik untuk mendukung evaluasi operasional</p>
        <Link href="/owner/buat-laporan">Mulai Buat Laporan →</Link>
        <div className="owner-hero-art" aria-hidden="true">
          <Image src="/figma-assets/owner-dashboard-hero.png" alt="" width={270} height={218} />
        </div>
      </section>
      <div className="owner-title-row">
        <h2>Jelajahi Kinerja Operasional</h2>
      </div>
      <div className="owner-cards">
        {cards.map(([icon, title, text, href]) => (
          <Link href={href} className="owner-card" key={title}>
            <i aria-hidden="true">{icon}</i>
            <b>{title}</b>
            <p>{text}</p>
          </Link>
        ))}
      </div>
      <footer className="owner-dashboard-footer">
        Mitra Jaya Service — Sistem Informasi Bengkel
      </footer>
    </div>
  );
}
