"use client";

import Link from "next/link";
import { useState } from "react";
import { TransientNotice } from "@/components/notifications/TransientNotice";

type Receipt = { id: string; paymentId: string; date: string; paymentDate: string; method: string; amount: number; status: string; confirmation: string; cashier: string; service: string; serviceDate: string; complaint: string; customer: string; phone: string; vehicle: string; plate: string; serviceFee: number; partsFee: number; total: number; canRelease: boolean };
const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const date = (s: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(s));

export default function ReceiptScreen({ receipt, notice: initialNotice }: { receipt: Receipt; notice: string }) {
  const [notice, setNotice] = useState(initialNotice);
  const print = () => { setNotice("Bukti transaksi siap dicetak."); window.print(); };
  return <section className="kasir-page kasir-receipt-page">
    <div className="kasir-page-heading receipt-heading"><div><p className="kasir-eyebrow">Pembayaran</p><h1>Bukti Transaksi</h1><p>Transaksi pembayaran servis yang telah tervalidasi.</p></div><div className="receipt-actions"><Link className="kasir-button secondary" href="/kasir/pembayaran">Kembali</Link><button className="kasir-button primary" disabled={!receipt.canRelease} onClick={print} type="button"><span aria-hidden="true">▣</span> Cetak Bukti</button></div></div>
    {!receipt.canRelease && <p className="kasir-inline-error">{receipt.status !== "Lunas" ? "Menunggu validasi pembayaran." : "Menunggu servis selesai."} Serah terima kendaraan dan cetak bukti belum tersedia.</p>}
    <article className="kasir-receipt"><header className="kasir-receipt-brand"><div className="receipt-mark">MJ</div><div><h2>Mitra Jaya Service</h2><p>Bukti Pembayaran Servis Kendaraan</p></div><span className="receipt-paid">LUNAS</span></header><div className="receipt-rule"/><div className="receipt-meta"><div><span>No. Transaksi</span><b>{receipt.id}</b></div><div><span>No. Pembayaran</span><b>{receipt.paymentId}</b></div><div><span>Tanggal Transaksi</span><b>{date(receipt.date)}</b></div><div><span>Metode Pembayaran</span><b>{receipt.method === "Transfer" ? "Transfer Bank" : receipt.method}</b></div></div><div className="receipt-section"><h3>Informasi Pelanggan</h3><div className="receipt-info"><div><span>Nama Pelanggan</span><b>{receipt.customer}</b></div><div><span>Nomor Telepon</span><b>{receipt.phone}</b></div><div><span>Kendaraan</span><b>{receipt.vehicle}</b></div><div><span>Nomor Polisi</span><b>{receipt.plate}</b></div></div></div><div className="receipt-section"><h3>Rincian Servis</h3><div className="receipt-info"><div><span>No. Servis</span><b>{receipt.service}</b></div><div><span>Tanggal Servis</span><b>{date(receipt.serviceDate)}</b></div><div className="receipt-info-full"><span>Keluhan Servis</span><b>{receipt.complaint}</b></div></div></div><div className="receipt-costs"><div><span>Biaya Jasa</span><b>{money(receipt.serviceFee)}</b></div><div><span>Biaya Sparepart</span><b>{money(receipt.partsFee)}</b></div><div className="receipt-grand-total"><span>Total Dibayar</span><b>{money(receipt.total)}</b></div></div><footer className="kasir-receipt-footer"><div><span>Status Pembayaran</span><b>{receipt.status} · {receipt.confirmation}</b></div><div><span>Dilayani oleh</span><b>{receipt.cashier}</b></div><p>Terima kasih telah mempercayakan servis kendaraan Anda kepada Mitra Jaya Service.</p></footer></article>
    {notice && <TransientNotice className="kasir-toast" onDismiss={() => setNotice("")}><b>Berhasil!</b> {notice}</TransientNotice>}
  </section>;
}
