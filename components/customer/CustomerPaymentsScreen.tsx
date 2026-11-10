"use client";

import { useState } from "react";
import Link from "next/link";

type Bill = { id: string; number: string; date: string; status: string; vehicle: string; plate: string; needs: string | null; fee: { service: number; parts: number; total: number; approval: string; approvedAt: string | null; payment: null | { id: string; status: string; confirmation: string; method: string; date: string } } };
type Props = { services: Bill[]; initialServiceId?: string };
type Screen = "list" | "review" | "choose" | "instruction" | "success" | "failure";
const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const date = (s: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(s));

export default function CustomerPaymentsScreen({ services, initialServiceId }: Props) {
  const [items, setItems] = useState(services);
  const initialBill = services.find((item) => item.id === initialServiceId) ?? null;
  const [selected, setSelected] = useState(initialBill);
  const [screen, setScreen] = useState<Screen>(() => !initialBill ? "list" : initialBill.fee.approval === "Menunggu" ? "review" : initialBill.fee.payment?.status === "Lunas" ? "success" : initialBill.fee.payment ? "instruction" : "choose");
  const [method, setMethod] = useState<"Transfer" | "QRIS">(initialBill?.fee.payment?.method === "QRIS" ? "QRIS" : "Transfer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelMode, setCancelMode] = useState(false);

  const updateSelected = (id: string, update: (bill: Bill) => Bill) => {
    setItems((current) => current.map((item) => item.id === id ? update(item) : item));
    setSelected((current) => current?.id === id ? update(current) : current);
  };
  const approve = async (decision: "Setuju" | "Batal") => {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/customer/biaya/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, reason: cancelReason }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Persetujuan belum dapat disimpan.");
      updateSelected(selected.id, (bill) => ({ ...bill, status: decision === "Setuju" ? "Siap Dikerjakan" : "Batal", fee: { ...bill.fee, approval: decision === "Setuju" ? "Setuju" : "Tidak setuju", approvedAt: new Date().toISOString() } }));
      if (decision === "Setuju") setScreen("choose"); else { setScreen("list"); setSelected(null); setCancelMode(false); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Persetujuan belum dapat disimpan."); }
    finally { setBusy(false); }
  };
  const createPayment = async () => {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/customer/pembayaran/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Pembayaran belum dapat diproses.");
      updateSelected(selected.id, (bill) => ({ ...bill, fee: { ...bill.fee, payment: { id: body.id, status: "Menunggu", confirmation: "Belum Dikonfirmasi", method: body.method, date: body.date } } }));
      setScreen("instruction");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Pembayaran belum dapat diproses."); }
    finally { setBusy(false); }
  };
  const checkPayment = async () => {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/customer/pembayaran/${selected.id}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Status pembayaran belum dapat dimuat.");
      updateSelected(selected.id, (bill) => ({ ...bill, fee: { ...bill.fee, payment: body.payment } }));
      setScreen(body.state === "success" ? "success" : body.state === "failure" ? "failure" : "instruction");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Status pembayaran belum dapat dimuat."); }
    finally { setBusy(false); }
  };
  const open = (bill: Bill, next: Screen) => { setSelected(bill); setMethod(bill.fee.payment?.method === "QRIS" ? "QRIS" : "Transfer"); setScreen(next); setError(""); };

  if (!selected || screen === "list") return <main className="customer-payment-page">
    <p className="customer-payment-eyebrow">Customer</p><h1>Biaya &amp; Pembayaran</h1><p className="customer-payment-subtitle">Lihat rincian biaya servis dan status pembayaran kendaraan Anda.</p>
    {!items.length ? <section className="customer-payment-empty"><h2>Belum ada rincian biaya</h2><p>Rincian akan muncul di sini setelah Kasir menyusunnya dari hasil pemeriksaan.</p></section> : <div className="customer-payment-list">{items.map((bill) => <article className="customer-payment-list-card" key={bill.id}><header><div><small>No. Servis</small><b>{bill.number}</b></div><span>{bill.status}</span></header><p>{bill.vehicle} · {bill.plate}</p><p>Total estimasi <b>{money(bill.fee.total)}</b></p><p>Persetujuan biaya: {bill.fee.approval} · Pembayaran: {bill.fee.payment?.status ?? "Belum ada"}</p><button className="customer-payment-primary" onClick={() => open(bill, bill.fee.approval === "Menunggu" ? "review" : bill.fee.payment?.status === "Lunas" ? "success" : bill.fee.payment ? "instruction" : "choose")} type="button">{bill.fee.approval === "Menunggu" ? "Tinjau rincian biaya" : bill.fee.payment?.status === "Lunas" ? "Lihat pembayaran" : "Bayar sekarang"}</button></article>)}</div>}
  </main>;

  return <main className="customer-payment-page customer-payment-flow">
    <button className="customer-payment-back" onClick={() => setScreen(screen === "instruction" || screen === "failure" ? "choose" : "list")} type="button">‹ Kembali</button>
    {screen === "success" ? <section className="customer-payment-result"><div className="customer-payment-check">✓</div><h1>Pembayaran berhasil</h1><p>Pembayaran servis Anda telah dikonfirmasi.</p><b>{money(selected.fee.total)}</b><Link className="customer-payment-primary" href="/customer/dashboard">Kembali ke dashboard</Link></section> : <>
      <h1>{screen === "review" ? "Persetujuan biaya servis" : screen === "instruction" ? "Instruksi pembayaran" : screen === "failure" ? "Pembayaran belum berhasil" : "Tagihan servis"}</h1>
      {screen === "review" ? <div className="customer-payment-columns"><section className="customer-payment-card"><h2>Rincian pekerjaan</h2><p>{selected.needs ?? "Pekerjaan sesuai hasil pemeriksaan servis."}</p><div className="customer-payment-row"><span>Biaya jasa</span><b>{money(selected.fee.service)}</b></div><div className="customer-payment-row"><span>Biaya sparepart</span><b>{money(selected.fee.parts)}</b></div><div className="customer-payment-total"><span>Total estimasi</span><b>{money(selected.fee.total)}</b></div><small className="customer-payment-footnote">Estimasi dapat berubah apabila ditemukan kebutuhan tambahan. Setiap perubahan akan dikonfirmasikan kepada Anda.</small></section><section className="customer-payment-card"><h2>Keputusan Anda</h2><p>Periksa rincian pekerjaan dan tentukan keputusan Anda.</p>{error && <p className="customer-payment-error" role="alert">{error}</p>}<button className="customer-payment-primary" disabled={busy} onClick={() => approve("Setuju")} type="button">{busy ? "Menyimpan…" : "Setujui & lanjut bayar"}</button>{cancelMode && <label className="customer-payment-reason">Alasan pembatalan<textarea maxLength={255} onChange={(event) => setCancelReason(event.target.value)} value={cancelReason} />{!cancelReason.trim() && <small>Alasan pembatalan wajib diisi.</small>}</label>}<button className="customer-payment-secondary" disabled={busy || (cancelMode && !cancelReason.trim())} onClick={() => cancelMode ? approve("Batal") : setCancelMode(true)} type="button">{cancelMode ? "Konfirmasi pembatalan" : "Tolak & ajukan pembatalan"}</button></section></div>
      : screen === "choose" || screen === "failure" ? <>{screen === "failure" && <p className="customer-payment-error" role="alert">Transaksi sebelumnya belum terkonfirmasi. Pilih metode lalu coba lagi.</p>}<div className="customer-payment-columns"><aside className="customer-payment-summary"><h2>Ringkasan tagihan</h2><strong>{money(selected.fee.total)}</strong><p>Biaya disetujui • {date(selected.fee.approvedAt ?? selected.date)}</p><small>Pembayaran dikonfirmasi setelah transaksi berhasil.</small></aside><section className="customer-payment-card"><h2>Pilih metode pembayaran</h2><label className="customer-payment-method"><input checked={method === "Transfer"} name="payment-method" onChange={() => setMethod("Transfer")} type="radio" /><span><b>Transfer bank • Virtual account</b></span></label><label className="customer-payment-method"><input checked={method === "QRIS"} name="payment-method" onChange={() => setMethod("QRIS")} type="radio" /><span><b>QRIS</b></span></label>{error && <p className="customer-payment-error" role="alert">{error}</p>}<button className="customer-payment-primary" disabled={busy} onClick={createPayment} type="button">{busy ? "Memproses…" : screen === "failure" ? "Coba pembayaran lagi" : "Konfirmasi pembayaran"}</button></section></div></>
      : <div className="customer-payment-columns"><aside className="customer-payment-summary"><h2>Ringkasan tagihan</h2><strong>{money(selected.fee.total)}</strong><p>Biaya disetujui • {date(selected.fee.approvedAt ?? selected.date)}</p><small>Pembayaran dikonfirmasi setelah transaksi berhasil.</small></aside><section className="customer-payment-card"><h2>Instruksi pembayaran</h2>{method === "Transfer" ? <><p>Nomor Virtual Account</p><strong className="customer-payment-code">8808 {selected.id.padStart(4, "0")} {String(selected.fee.total).replace(/\D/g, "").padStart(8, "0")}</strong><p>Transfer sesuai nominal tagihan. Berlaku 30 menit.</p></> : <><div aria-label="Kode QR pembayaran QRIS" className="customer-payment-qr">QRIS</div><p>Scan QRIS di atas sebelum 3 menit.</p></>}<p className="customer-payment-wait"><span className="customer-payment-spinner" />Menunggu pembayaran...</p>{error && <p className="customer-payment-error" role="alert">{error}</p>}<button className="customer-payment-primary" disabled={busy} onClick={checkPayment} type="button">{busy ? "Memeriksa…" : "Lihat Status Pembayaran"}</button></section></div>}
    </>}
  </main>;
}
