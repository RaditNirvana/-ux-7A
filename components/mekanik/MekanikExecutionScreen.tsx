"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import MekanikPageHeader from "@/components/MekanikPageHeader";
import { TransientNotice } from "@/components/notifications/TransientNotice";
import { cleanMekanikComplaint, getMekanikDisplayServiceId } from "@/lib/mekanik-assignment";

type Service = {
  id_data_mekanik: string;
  status_penugasan: string;
  id_servis: string;
  nomor_antrian: string;
  tanggal_daftar: string;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  status_servis: string;
  hasil_servis: string;
  kebutuhan_servis: string;
  keluhan: string;
  kendaraan: { merek: string; tipe_kendaraan: string; tahun_kendaraan: number; nomor_plat: string };
  isApproved: boolean;
  parts: { id_sparepart: string; nama_sparepart: string; satuan: string; jumlah_sparepart: number; stok: number; terpasang: boolean }[];
  recent: { tahap: string; keterangan: string; waktu: string }[];
};

const stages = ["Ditugaskan", "Diperiksa", "Siap Dikerjakan", "Diproses", "Selesai"];

function formattedDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function MekanikExecutionScreen({
  services: initialServices,
  name,
  availability: initialAvailability,
  selectedId,
}: {
  services: Service[];
  name: string;
  availability: string;
  selectedId?: string;
}) {
  const [services, setServices] = useState(initialServices);
  const initialService = initialServices.find((service) => service.id_servis === selectedId)
    ?? initialServices.find((service) => service.status_servis !== "Selesai")
    ?? initialServices[0];
  const [selectedServiceId, setSelectedServiceId] = useState(
    initialService?.id_servis ?? "",
  );
  const [availability, setAvailability] = useState(initialAvailability);
  const [nextStatus, setNextStatus] = useState<"" | "Diproses" | "Selesai">("");
  const [note, setNote] = useState(initialService?.hasil_servis ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = services.find((service) => service.id_servis === selectedServiceId);

  function selectService(id: string) {
    const service = services.find((item) => item.id_servis === id);
    setSelectedServiceId(id);
    setNextStatus("");
    setNote(service?.hasil_servis ?? "");
    setError("");
    setNotice("");
  }

  async function setPartInstalled(idSparepart: string, installed: boolean) {
    if (!selected) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/mekanik/pelaksanaan/${selected.id_servis}/progres`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "part", id_sparepart: idSparepart, terpasang: installed }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Status pemasangan belum dapat disimpan.");
      setServices((current) => current.map((service) => service.id_servis !== selected.id_servis ? service : {
        ...service,
        parts: service.parts.map((part) => part.id_sparepart === idSparepart ? { ...part, terpasang: installed } : part),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Status pemasangan belum dapat disimpan.");
    }
  }

  async function updateProgress() {
    if (!selected || !nextStatus) return;
    setError("");
    setNotice("");
    if (nextStatus === "Selesai" && !note.trim()) {
      setError("Hasil servis wajib diisi sebelum servis diselesaikan.");
      return;
    }
    setBusy(true);
    try {
      let response: Response;
      if (nextStatus === "Selesai") {
        response = await fetch(`/api/mekanik/pelaksanaan/${selected.id_servis}/selesai`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hasil_servis: note }),
        });
      } else if (selected.status_servis === "Siap Dikerjakan") {
        response = await fetch(`/api/mekanik/pelaksanaan/${selected.id_servis}/mulai`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ catatan: note }),
        });
      } else {
        response = await fetch(`/api/mekanik/pelaksanaan/${selected.id_servis}/progres`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "catatan", catatan: note }),
        });
      }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Progres servis belum dapat diperbarui.");

      if (nextStatus === "Selesai") {
        setServices((current) => current.map((service) => service.id_servis === selected.id_servis
          ? { ...service, status_servis: "Selesai", tanggal_selesai: new Date().toISOString(), hasil_servis: note, status_penugasan: "Selesai" }
          : service));
        setAvailability("Tersedia");
        setNotice("Servis selesai dikerjakan. Hasil servis dikirim ke customer.");
      } else {
        setServices((current) => current.map((service) => service.id_servis === selected.id_servis
          ? { ...service, status_servis: "Diproses", tanggal_mulai: service.tanggal_mulai ?? new Date().toISOString(), hasil_servis: note, status_penugasan: "Diproses" }
          : service));
        setAvailability("Sedang Bekerja");
        setNotice(selected.status_servis === "Siap Dikerjakan" ? "Servis mulai diproses." : "Progres servis diperbarui.");
      }
      setNextStatus("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Progres servis belum dapat diperbarui.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#eef0ff] font-[var(--font-poppins)] text-[#111827] antialiased">
      <MekanikPageHeader title="Pelaksanaan Servis" name={name} availability={availability} />
      {notice ? <TransientNotice className="fixed right-8 top-[86px] z-30 max-w-[360px] rounded-xl bg-[#16a34a] px-5 py-3 text-xs font-medium text-white shadow-lg" onDismiss={() => setNotice("")}>{notice}</TransientNotice> : null}
      <main className="mx-auto flex h-[calc(100dvh-72px)] max-w-[1440px] flex-col gap-6 overflow-hidden px-8 pb-8 pt-8 max-xl:h-auto max-xl:overflow-visible max-md:px-4">
        {selected ? <>
          <section className="relative flex h-[104px] shrink-0 items-center justify-between overflow-hidden rounded-[16px] bg-[linear-gradient(110deg,#0f14f0_0%,#4b5bff_65%,#8f9bff_100%)] px-6 text-white">
            <span aria-hidden="true" className="absolute -right-10 -top-[80px] size-[220px] rounded-full bg-white/10" />
            <span aria-hidden="true" className="absolute -bottom-[85px] right-[90px] size-40 rounded-full bg-white/[.08]" />
            <div className="relative min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-white/80">{getMekanikDisplayServiceId(selected.id_servis, selected.tanggal_daftar)} - {selected.tanggal_mulai ? `Mulai ${formattedDate(selected.tanggal_mulai)}` : "belum dimulai"}</p>
              <h2 className="mt-1 truncate text-[18px] font-semibold leading-6">{selected.kendaraan.merek} {selected.kendaraan.tipe_kendaraan}, {selected.kendaraan.nomor_plat}</h2>
            </div>
            {services.length > 1 ? <select aria-label="Pilih servis pelaksanaan" className="relative max-w-[220px] rounded-full bg-white/20 px-3 py-2 text-[10px] text-white outline-none" onChange={(event) => selectService(event.target.value)} value={selected.id_servis}>{services.map((service) => <option className="text-[#111827]" key={service.id_servis} value={service.id_servis}>{getMekanikDisplayServiceId(service.id_servis, service.tanggal_daftar)} - {service.kendaraan.tipe_kendaraan}</option>)}</select> : null}
            <span className="relative shrink-0 rounded-full bg-white/20 px-4 py-2 text-[13px] text-white">{selected.status_servis}</span>
          </section>

          <section aria-label="Tahapan servis" className="relative grid h-[88px] shrink-0 grid-cols-5 items-center rounded-[16px] bg-white px-10 shadow-[0_8px_12px_rgba(16,24,40,.06)]">
            <span aria-hidden="true" className="pointer-events-none absolute left-[12%] right-[12%] top-[31px] h-[2px] bg-[#e5e7eb]" />
            <span aria-hidden="true" className="pointer-events-none absolute left-[12%] top-[31px] h-[2px] bg-[#0f14f0]" style={{ width: `${Math.max(0, (stages.indexOf(selected.status_servis) / (stages.length - 1)) * 76)}%` }} />
            {stages.map((stage, index) => {
              const currentIndex = stages.indexOf(selected.status_servis);
              const done = index < currentIndex;
              const active = index === currentIndex;
              const stageIcon = [
                "/figma-assets/mekanik-status-assigned.svg",
                "/figma-assets/mekanik-status-inspected.svg",
                "/figma-assets/mekanik-status-ready.svg",
                "/figma-assets/mekanik-status-progress.svg",
                "/figma-assets/mekanik-status-done.svg",
              ][index];
              const displayedIcon = done ? "/figma-assets/mekanik-status-done.svg" : stageIcon;
              const iconColor = done ? "#ffffff" : "#0f14f0";
              return <div className="relative z-[1] flex flex-col items-center gap-1" key={stage}><span className={`grid size-8 place-items-center rounded-full border-2 ${done ? "border-[#0f14f0] bg-[#0f14f0]" : active ? "border-[#0f14f0] bg-white" : "border-[#e5e7eb] bg-[#f3f4f6]"}`}>{done || active ? <span aria-hidden="true" className="size-5" style={{ backgroundColor: iconColor, maskImage: `url(${displayedIcon})`, maskPosition: "center", maskRepeat: "no-repeat", maskSize: "20px 20px", WebkitMaskImage: `url(${displayedIcon})`, WebkitMaskPosition: "center", WebkitMaskRepeat: "no-repeat", WebkitMaskSize: "20px 20px" }} /> : <Image alt="" height={20} src={displayedIcon} style={{ opacity: 0.45 }} width={20} />}</span><span className={`text-[12px] ${active ? "font-semibold text-[#0f14f0]" : "text-[#6b7280]"}`}>{stage}</span></div>;
            })}
          </section>

          {selected.status_servis === "Siap Dikerjakan" && !selected.isApproved ? <div className="rounded-lg bg-[#fef9c3] px-4 py-3 text-[11px] text-[#ca8a04]" role="alert">Servis belum dapat dimulai sampai customer menyetujui biaya dan rincian biaya tersedia.</div> : null}

          <div className="grid min-h-0 flex-1 grid-cols-2 gap-6 max-lg:grid-cols-1 max-lg:overflow-visible">
            <section className="min-h-0 overflow-y-auto rounded-[16px] bg-white p-6 shadow-[0_8px_12px_rgba(16,24,40,.06)]">
              <h2 className="mb-3 text-[18px] font-semibold">Kebutuhan Servis</h2>
              <div className="rounded-[10px] bg-[#eef0ff] px-3 py-3 text-[12px] leading-4">{selected.kebutuhan_servis || cleanMekanikComplaint(selected.keluhan)}</div>
              <h3 className="mb-3 mt-4 text-[8px] font-semibold uppercase tracking-[.12em] text-[#6b7280]">Sparepart</h3>
              <div className="space-y-2">
                {selected.parts.map((part) => <label className={`flex min-h-[68px] cursor-pointer items-center gap-3 rounded-[10px] border px-3 ${part.terpasang ? "border-[#0f14f0] bg-[#eef0ff]" : "border-[#e5e7eb] bg-white"}`} key={part.id_sparepart}>
                  <input aria-label={`Tandai ${part.nama_sparepart} terpasang`} checked={part.terpasang} className="size-4 accent-[#0f14f0]" disabled={selected.status_servis !== "Diproses" || busy} onChange={(event) => setPartInstalled(part.id_sparepart, event.target.checked)} type="checkbox" />
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#f3f4f6]"><Image alt="" height={20} src="/figma-assets/mekanik-quick-assignment.svg" width={20} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium">{part.nama_sparepart}</span><span className="block text-[12px] text-[#6b7280]">{part.jumlah_sparepart} {part.satuan}</span></span>
                  <span className={`rounded-lg px-2 py-2 text-[9px] ${part.terpasang ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>{part.terpasang ? "Terpasang" : "Belum"}</span>
                </label>)}
                {selected.parts.length === 0 ? <p className="rounded-[10px] border border-[#e5e7eb] px-4 py-5 text-[10px] text-[#6b7280]">Tidak ada sparepart untuk servis ini.</p> : null}
              </div>
              {selected.status_servis === "Selesai" ? <div className="mt-4 rounded-lg bg-[#dcfce7] px-3 py-2 text-[10px] text-[#15803d]">Servis selesai {formattedDate(selected.tanggal_selesai)}.</div> : null}
            </section>

            <section className="flex min-h-0 flex-col rounded-[16px] bg-white p-6 shadow-[0_8px_12px_rgba(16,24,40,.06)]">
              <h2 className="mb-4 text-[18px] font-semibold">Progres Servis</h2>
              <p className="mb-2 text-[12px] font-medium">Status</p>
              <div className="mb-4 grid h-[48px] shrink-0 grid-cols-2 gap-3">
                {(["Diproses", "Selesai"] as const).map((status) => <button aria-pressed={nextStatus === status} className={`rounded-[10px] border text-[10px] ${nextStatus === status ? status === "Selesai" ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-[#0f14f0] bg-[#0f14f0] text-white" : "border-[#e5e7eb] bg-white text-[#4b5563]"}`} key={status} onClick={() => { setNextStatus(status); setError(""); setNotice(""); }} style={{ fontSize: "14px", fontWeight: 500, lineHeight: "normal" }} type="button">{status}</button>)}
              </div>
              <label className="mb-2 text-[12px] font-medium" htmlFor="mekanik-service-result">Catatan / Hasil Servis</label>
              <textarea className="h-[120px] shrink-0 resize-none rounded-[10px] border border-[#e5e7eb] p-3 text-[14px] leading-5 outline-none placeholder:text-[#9ca3af] focus:border-[#0f14f0] disabled:bg-[#f9fafb]" disabled={selected.status_servis === "Selesai"} id="mekanik-service-result" maxLength={300} onChange={(event) => setNote(event.target.value)} placeholder="Tulis catatan atau hasil servis" value={note} />
              <p className="mt-3 text-[12px] leading-4 text-[#6b7280]">{selected.status_servis === "Selesai" ? "Status mekanik kembali Tersedia jika tidak ada servis lain yang sedang Diproses." : "Saat status Selesai, isi hasil servis untuk menyelesaikan pekerjaan."}</p>
              {error ? <TransientNotice className="mt-2 text-[10px] text-[#dc2626]" onDismiss={() => setError("")} role="alert">{error}</TransientNotice> : null}
              <div className="mt-auto pt-4">
                {selected.status_servis === "Selesai" ? <Link className="flex h-[48px] items-center justify-center rounded-[10px] bg-[#0f14f0] text-[10px] font-semibold text-white" href="/mekanik/dashboard" style={{ color: "#fff", fontSize: "14px", fontWeight: 600, lineHeight: "normal" }}>Kembali ke Dashboard</Link> : <button className="h-[48px] w-full rounded-[10px] bg-[#0f14f0] text-[10px] font-semibold text-white disabled:bg-[#e5e7eb] disabled:text-[#9ca3af]" disabled={!nextStatus || busy} onClick={updateProgress} style={{ fontSize: "14px", fontWeight: 600, lineHeight: "normal" }} type="button">{busy ? "Memperbarui..." : nextStatus === "Selesai" ? "Selesaikan Servis" : selected.status_servis === "Siap Dikerjakan" ? "Mulai Servis" : "Perbarui Progres"}</button>}
              </div>
            </section>
          </div>
        </> : <section className="grid min-h-[420px] flex-1 place-items-center rounded-[16px] bg-white text-center shadow-[0_8px_12px_rgba(16,24,40,.06)]"><div className="max-w-[380px]"><span className="mx-auto grid size-24 place-items-center rounded-full bg-[#eef0ff]"><Image alt="" height={44} src="/figma-assets/mekanik-assignment-empty.svg" width={44} /></span><h2 className="mt-4 text-[14px] font-semibold">Tidak ada servis untuk dilaksanakan</h2><p className="mt-1 text-[11px] text-[#6b7280]">Servis dengan status Siap Dikerjakan atau Diproses akan tampil di sini.</p></div></section>}
      </main>
    </div>
  );
}
