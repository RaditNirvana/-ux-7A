"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import MekanikPageHeader from "@/components/MekanikPageHeader";
import { TransientNotice } from "@/components/notifications/TransientNotice";
import { ServiceAdvisorStatus } from "@/components/sa/ServiceAdvisorUi";
import { cleanMekanikComplaint, getMekanikDisplayServiceId } from "@/lib/mekanik-assignment";

type Service = {
  id_data_mekanik: string;
  id_servis: string;
  nomor_antrian: string;
  tanggal_daftar: string;
  tanggal_mulai: string | null;
  status_servis: string;
  keluhan: string;
  kebutuhan_servis: string;
  hasil_pemeriksaan: string;
  kendaraan: { merek: string; tipe_kendaraan: string; tahun_kendaraan: number; nomor_plat: string; kilometer: number | null };
  paymentStatus: string;
  approvalStatus: string;
  parts: { nama_sparepart: string; jumlah_sparepart: number; satuan: string }[];
};

export default function MekanikConfirmationScreen({
  services: initialServices,
  hasBlocked,
  name,
  availability,
}: {
  services: Service[];
  hasBlocked: boolean;
  name: string;
  availability: string;
}) {
  const [services, setServices] = useState(initialServices);
  const [selectedId, setSelectedId] = useState(initialServices[0]?.id_servis ?? "");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selected = services.find((item) => item.id_servis === selectedId);

  async function confirmReady() {
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/mekanik/konfirmasi/${selected.id_servis}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Konfirmasi servis belum dapat disimpan.");
      setServices((current) => current.map((service) => service.id_servis === selected.id_servis
        ? { ...service, status_servis: "Siap Dikerjakan" }
        : service));
      setNotice("Servis siap dikerjakan.");
      setConfirming(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Konfirmasi servis belum dapat disimpan.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#eef0ff] font-[var(--font-poppins)] text-[#111827] antialiased">
      <MekanikPageHeader title="Konfirmasi Mulai Servis" name={name} availability={availability} />
      {notice ? <TransientNotice className="fixed right-8 top-[86px] z-30 rounded-xl bg-[#16a34a] px-5 py-3 text-xs font-medium text-white shadow-lg" onDismiss={() => setNotice("")}>{notice}</TransientNotice> : null}
      <main className="mx-auto max-w-[1440px] px-8 pb-8 pt-8 max-md:px-4">
        {error ? <TransientNotice className="mb-4 rounded-lg bg-[#fee2e2] px-4 py-3 text-xs text-[#b91c1c]" onDismiss={() => setError("")} role="alert">{error}</TransientNotice> : null}
        {services.length === 0 ? (
          <>
            {hasBlocked ? <div className="mb-4 flex h-14 items-center rounded-[10px] bg-[#fef9c3] px-5 text-[11px] text-[#ca8a04]">Pembayaran belum dikonfirmasi atau rincian biaya belum tersedia, servis belum dapat dimulai.</div> : null}
            <div className="grid h-[620px] grid-cols-[minmax(0,1.54fr)_minmax(360px,1fr)] gap-6 max-lg:h-auto max-lg:grid-cols-1">
              <section className="rounded-[16px] bg-white p-5 shadow-[0_8px_12px_rgba(16,24,40,.06)]">
                <h2 className="mb-3 text-[14px] font-semibold">Daftar Servis yang Akan Dikerjakan</h2>
                <div className="grid h-9 grid-cols-[minmax(0,1.25fr)_minmax(90px,.85fr)_minmax(100px,.9fr)_minmax(100px,.9fr)] items-center rounded-lg bg-[#f3f4f6] text-[8px] font-medium uppercase tracking-wide text-[#6b7280]"><span className="px-2">Kendaraan</span><span className="px-2">No. Pendaftaran</span><span className="px-2">Pembayaran</span><span className="px-2">Status Servis</span></div>
                <p className="px-4 py-12 text-center text-[11px] text-[#6b7280]">{hasBlocked ? "Tidak ada servis yang memenuhi persyaratan persetujuan biaya." : "Belum ada servis untuk dikerjakan."}</p>
              </section>
              <section className="grid place-items-center rounded-[16px] bg-white p-6 shadow-[0_8px_12px_rgba(16,24,40,.06)]">
                <div className="flex max-w-[300px] flex-col items-center text-center">
                  <span className="grid size-24 place-items-center rounded-full bg-[#eef0ff]"><Image alt="" height={44} src="/figma-assets/mekanik-status-ready.svg" width={44} /></span>
                  <h2 className="mt-4 text-[14px] font-semibold">{hasBlocked ? "Belum ada servis yang dapat dimulai" : "Belum ada servis dipilih"}</h2>
                  <p className="mt-1 text-[11px] leading-5 text-[#6b7280]">{hasBlocked ? "Servis hanya dapat dilanjutkan setelah customer menyetujui biaya dan rincian biaya tersedia." : "Pilih servis yang sudah disetujui customer untuk memeriksa status pembayaran."}</p>
                </div>
              </section>
            </div>
          </>
        ) : (
          <>
            {hasBlocked ? <div className="mb-4 flex h-14 items-center rounded-[10px] bg-[#fef9c3] px-5 text-[11px] text-[#ca8a04]">Servis yang belum disetujui customer atau belum memiliki rincian biaya disembunyikan.</div> : null}
            <div className="grid h-[620px] grid-cols-[minmax(0,1.54fr)_minmax(360px,1fr)] gap-6 max-lg:h-auto max-lg:grid-cols-1">
              <section className="min-h-0 overflow-hidden rounded-[16px] bg-white p-5 shadow-[0_8px_12px_rgba(16,24,40,.06)]">
                <h2 className="mb-3 text-[14px] font-semibold">Daftar Servis yang Akan Dikerjakan</h2>
                <div className="grid h-9 grid-cols-[minmax(0,1.25fr)_minmax(90px,.85fr)_minmax(100px,.9fr)_minmax(100px,.9fr)] items-center rounded-lg bg-[#f3f4f6] text-[8px] font-medium uppercase tracking-wide text-[#6b7280]">
                  <span className="px-2">Kendaraan</span><span className="px-2">No. Pendaftaran</span><span className="px-2">Pembayaran</span><span className="px-2">Status Servis</span>
                </div>
                <div>
                  {services.map((service) => {
                    const active = service.id_servis === selectedId;
                    return <button aria-pressed={active} className={`grid min-h-[72px] w-full grid-cols-[minmax(0,1.25fr)_minmax(90px,.85fr)_minmax(100px,.9fr)_minmax(100px,.9fr)] items-center border-b border-[#e5e7eb] text-left ${active ? "bg-[#eef0ff]" : "bg-white hover:bg-[#f8f9ff]"}`} key={service.id_servis} onClick={() => { setSelectedId(service.id_servis); setNotice(""); }} type="button">
                      <span className="flex min-w-0 items-center gap-3 px-2"><span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#eef0ff]"><Image alt="" height={20} src="/figma-assets/mekanik-vehicle.svg" width={20} /></span><span className="min-w-0"><span className="block truncate text-[11px] font-medium">{service.kendaraan.tipe_kendaraan}</span><span className="block truncate text-[9px] text-[#6b7280]">{service.kendaraan.nomor_plat}</span></span></span>
                      <span className="truncate px-2 text-[10px]">{getMekanikDisplayServiceId(service.id_servis, service.tanggal_daftar)}</span>
                      <span className="px-2"><span className={`inline-flex rounded-full px-2 py-1 text-[8px] ${service.paymentStatus === "Terkonfirmasi" ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#fef9c3] text-[#ca8a04]"}`}>{service.paymentStatus}</span></span>
                      <span className="px-2"><ServiceAdvisorStatus value={service.status_servis} variant="mekanik" /></span>
                    </button>;
                  })}
                </div>
              </section>

              <section className="flex min-h-0 flex-col overflow-hidden rounded-[16px] bg-white p-6 shadow-[0_8px_12px_rgba(16,24,40,.06)]">
                {selected ? <>
                  <div className={`relative flex h-[108px] shrink-0 flex-col justify-center overflow-hidden rounded-[12px] px-6 text-white ${selected.status_servis === "Siap Dikerjakan" ? "bg-[linear-gradient(110deg,#15803d_0%,#4ade80_100%)]" : "bg-[linear-gradient(110deg,#b45309_0%,#fbbf24_100%)]"}`}>
                    <span aria-hidden="true" className="absolute -right-10 -top-14 size-40 rounded-full bg-white/10" />
                    <div className="relative flex items-center gap-4"><span className="grid size-12 place-items-center rounded-full bg-white/20"><Image alt="" height={20} src="/figma-assets/mekanik-status-ready.svg" width={20} /></span><div><p className="text-[8px] font-semibold uppercase tracking-wider">Status Persetujuan Biaya</p><p className="text-[16px] font-semibold">Disetujui Customer</p></div></div>
                    <p className="relative mt-2 truncate text-[10px]">{getMekanikDisplayServiceId(selected.id_servis, selected.tanggal_daftar)} - {selected.kendaraan.tipe_kendaraan} {selected.kendaraan.nomor_plat}</p>
                  </div>
                  <div className="mt-4 rounded-[10px] bg-[#eef0ff] px-3 py-3"><p className="text-[9px] text-[#6b7280]">Kebutuhan servis</p><p className="mt-1 text-[10px] leading-4">{selected.kebutuhan_servis || cleanMekanikComplaint(selected.keluhan)}</p></div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eef0ff]"><Image alt="" height={16} src="/figma-assets/mekanik-quick-assignment.svg" width={16} /></span><span className="min-w-0"><span className="block text-[9px] text-[#6b7280]">Sparepart</span><span className="block truncate text-[10px]">{selected.parts.length ? selected.parts.map((part) => part.nama_sparepart).join(", ") : "Tidak ada sparepart"}</span></span></div>
                    <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eef0ff]"><Image alt="" height={16} src="/figma-assets/mekanik-assignment-calendar.svg" width={16} /></span><span><span className="block text-[9px] text-[#6b7280]">Tanggal mulai</span><span className="block text-[10px]">{selected.tanggal_mulai ? new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" }).format(new Date(selected.tanggal_mulai)) : "-"}</span></span></div>
                  </div>
                  <div className="mt-auto pt-4">
                    {notice || selected.status_servis === "Siap Dikerjakan" ? <Link className="flex h-12 items-center justify-center rounded-[10px] bg-[#0f14f0] text-[11px] font-semibold text-white" href={`/mekanik/pelaksanaan-servis?id=${selected.id_servis}`} style={{ color: "#fff", fontSize: "14px", fontWeight: 600, lineHeight: "normal" }}>Lanjut ke Pelaksanaan Servis</Link> : <button className="h-12 w-full rounded-[10px] bg-[#0f14f0] text-[11px] font-semibold text-white" onClick={() => setConfirming(true)} style={{ fontSize: "14px", fontWeight: 600, lineHeight: "normal" }} type="button">Konfirmasi Servis Siap Dikerjakan</button>}
                  </div>
                </> : null}
              </section>
            </div>
          </>
        )}
      </main>

      {confirming && selected ? <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirming(false); }}>
        <section aria-labelledby="confirm-title" aria-modal="true" className="w-full max-w-[440px] rounded-[16px] bg-white p-6 shadow-xl" role="dialog">
          <h2 className="text-[16px] font-semibold" id="confirm-title">Konfirmasi servis</h2>
          <p className="mt-2 text-[12px] leading-5 text-[#6b7280]">Biaya servis telah disetujui customer. Tandai servis ini siap dikerjakan?</p>
          <div className="mt-6 flex justify-end gap-3"><button className="h-10 rounded-[10px] border border-[#0f14f0] px-5 text-[11px] text-[#0f14f0]" disabled={busy} onClick={() => setConfirming(false)} style={{ fontSize: "14px", lineHeight: "normal" }} type="button">Batal</button><button className="h-10 rounded-[10px] bg-[#0f14f0] px-5 text-[11px] font-semibold text-white disabled:opacity-50" disabled={busy} onClick={confirmReady} style={{ fontSize: "14px", fontWeight: 600, lineHeight: "normal" }} type="button">{busy ? "Menyimpan..." : "Konfirmasi"}</button></div>
        </section>
      </div> : null}
    </div>
  );
}
