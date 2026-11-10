"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import MekanikPageHeader from "@/components/MekanikPageHeader";
import { TransientNotice } from "@/components/notifications/TransientNotice";
import { cleanMekanikComplaint, getMekanikDisplayServiceId } from "@/lib/mekanik-assignment";

type Part = {
  id_sparepart: string;
  nama_sparepart: string;
  satuan: string;
  stok: number;
  jumlah_sparepart: number;
  bagian_diganti: string;
};
type PartInput = Pick<Part, "id_sparepart" | "jumlah_sparepart" | "bagian_diganti">;

type Assignment = {
  id_data_mekanik: string;
  id_servis: string;
  nomor_antrian: string;
  tanggal_daftar: string;
  tanggal_pemeriksaan: string | null;
  hasil_pemeriksaan: string;
  kebutuhan_servis: string;
  status_servis: string;
  keluhan: string;
  kendaraan: {
    merek: string;
    tipe_kendaraan: string;
    tahun_kendaraan: number;
    nomor_plat: string;
    kilometer: number | null;
    pemilik: string;
  };
  parts: Part[];
  recent: { tahap: string; keterangan: string; waktu: string }[];
};

type SparepartChoice = {
  id_sparepart: string;
  nama_sparepart: string;
  satuan: string;
  stok: number;
};

type InspectionData = {
  assignments: Assignment[];
  spareparts: SparepartChoice[];
  recentResults: { id_riwayat: number; id_servis: string; nomor_pendaftaran: string; tanggal_daftar: string; keterangan: string; waktu: string }[];
};

function initialParts(assignment?: Assignment) {
  return assignment?.parts.length
    ? assignment.parts.map(({ id_sparepart, jumlah_sparepart, bagian_diganti }) => ({ id_sparepart, jumlah_sparepart, bagian_diganti }))
    : [{ id_sparepart: "", jumlah_sparepart: 1, bagian_diganti: "" }];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MekanikInspectionScreen({
  data,
  name,
  availability,
  selectedId,
}: {
  data: InspectionData;
  name: string;
  availability: string;
  selectedId?: string;
}) {
  const [assignments, setAssignments] = useState(data.assignments);
  const [selectedServiceId, setSelectedServiceId] = useState(
    data.assignments.find((item) => item.id_servis === selectedId)?.id_servis ?? data.assignments[0]?.id_servis ?? "",
  );
  const [result, setResult] = useState("");
  const [needs, setNeeds] = useState("");
  const [parts, setParts] = useState<PartInput[]>(initialParts(data.assignments.find((item) => item.id_servis === selectedId) ?? data.assignments[0]));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = assignments.find((item) => item.id_servis === selectedServiceId);
  const started = selected?.status_servis === "Diperiksa";

  function chooseService(id: string) {
    const assignment = assignments.find((item) => item.id_servis === id);
    setSelectedServiceId(id);
    setResult(assignment?.hasil_pemeriksaan ?? "");
    setNeeds(assignment?.kebutuhan_servis ?? "");
    setParts(initialParts(assignment));
    setError("");
    setNotice("");
  }

  async function startInspection() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/mekanik/pemeriksaan/${selected.id_servis}/mulai`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Pemeriksaan belum dapat dimulai.");
      setAssignments((current) => current.map((item) => item.id_servis === selected.id_servis
        ? { ...item, status_servis: "Diperiksa", tanggal_pemeriksaan: new Date().toISOString() }
        : item));
      setNotice("Pemeriksaan dimulai.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pemeriksaan belum dapat dimulai.");
    } finally {
      setBusy(false);
    }
  }

  async function saveInspection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!selected) return;
    if (!started) {
      setError("Mulai pemeriksaan terlebih dahulu.");
      return;
    }
    if (!result.trim() || !needs.trim()) {
      setError("Hasil pemeriksaan dan kebutuhan servis wajib diisi.");
      return;
    }
    if (parts.some((part) => !part.id_sparepart || part.jumlah_sparepart < 1)) {
      setError("Pilih sparepart dan jumlahnya dengan benar, atau hapus baris yang kosong.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/mekanik/pemeriksaan", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id_servis: selected.id_servis,
          hasil_pemeriksaan: result,
          kebutuhan_servis: needs,
          parts: parts.map(({ id_sparepart, jumlah_sparepart, bagian_diganti }) => ({
            id_sparepart,
            jumlah_sparepart,
            bagian_diganti,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Hasil pemeriksaan belum dapat disimpan.");
      setAssignments((current) => current.map((item) => item.id_servis === selected.id_servis
        ? { ...item, status_servis: "Menunggu Persetujuan" }
        : item));
      setNotice("Data berhasil disimpan. Servis menunggu persetujuan biaya.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Hasil pemeriksaan belum dapat disimpan.");
    } finally {
      setBusy(false);
    }
  }

  function updatePart(index: number, key: "id_sparepart" | "jumlah_sparepart" | "bagian_diganti", value: string) {
    setParts((current) => current.map((part, partIndex) => {
      if (partIndex !== index) return part;
      if (key === "jumlah_sparepart") return { ...part, jumlah_sparepart: Math.max(1, Number(value) || 1) };
      return { ...part, [key]: value };
    }));
  }

  return (
    <div className="min-h-screen bg-[#eef0ff] font-[var(--font-poppins)] text-[#111827] antialiased">
      <MekanikPageHeader title="Pemeriksaan Kendaraan" name={name} availability={availability} />
      {notice ? <TransientNotice className="fixed right-8 top-[86px] z-30 rounded-xl bg-[#16a34a] px-5 py-3 text-xs font-medium text-white shadow-lg" duration={notice === "Data berhasil disimpan. Servis menunggu persetujuan biaya." ? 1000 : 4000} fadeDuration={notice === "Data berhasil disimpan. Servis menunggu persetujuan biaya." ? 300 : 220} fadeEasing={notice === "Data berhasil disimpan. Servis menunggu persetujuan biaya." ? "cubic-bezier(0.68,-0.55,0.265,1.55)" : "ease"} onDismiss={() => setNotice("")}>{notice}</TransientNotice> : null}
      <main className="mx-auto grid h-[calc(100dvh-72px)] max-w-[1440px] grid-cols-[480px_minmax(0,1fr)] gap-6 overflow-hidden p-8 max-xl:h-auto max-xl:grid-cols-1 max-xl:overflow-visible max-md:p-4">
        <div className="grid min-h-0 grid-rows-[300px_minmax(0,1fr)] gap-6 max-xl:grid-rows-none">
          <section className="relative flex min-h-0 flex-col justify-between overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,#0a0ad8_0%,#3b4bff_65%,#8f9bff_100%)] p-6 text-white">
            <span aria-hidden="true" className="absolute -right-[46px] -top-[70px] size-[220px] rounded-full bg-white/10" />
            <span aria-hidden="true" className="absolute -bottom-[90px] right-[90px] size-40 rounded-full bg-white/[.08]" />
            {selected ? <>
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-white/75">Servis yang diperiksa</p>
                  <h2 className="mt-1 truncate text-[24px] font-bold leading-[normal]">{getMekanikDisplayServiceId(selected.id_servis, selected.tanggal_daftar)}</h2>
                  <p className="truncate text-[14px] text-white/85">{selected.kendaraan.merek} {selected.kendaraan.tipe_kendaraan} {selected.kendaraan.tahun_kendaraan} - {selected.kendaraan.nomor_plat}</p>
                </div>
                {assignments.length > 1 ? (
                  <select aria-label="Pilih servis" className="relative max-w-[150px] rounded-lg bg-white/20 px-2 py-1 text-[10px] text-white outline-none" value={selected.id_servis} onChange={(event) => chooseService(event.target.value)}>
                    {assignments.map((item) => <option className="text-[#111827]" key={item.id_servis} value={item.id_servis}>{getMekanikDisplayServiceId(item.id_servis, item.tanggal_daftar)}</option>)}
                  </select>
                ) : null}
              </div>
              <div className="relative flex flex-col gap-3 rounded-xl bg-white/15 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold uppercase tracking-[.1em] text-white/70">Keluhan</p>
                  <p className="line-clamp-2 text-[14px] leading-5">{cleanMekanikComplaint(selected.keluhan)}</p>
                </div>
                <button className="h-[44px] w-full shrink-0 rounded-[10px] bg-white px-3 text-[14px] font-semibold text-[#0f14f0] disabled:opacity-60" disabled={busy || started} onClick={startInspection} style={{ fontSize: "14px", fontWeight: 600, lineHeight: "normal" }} type="button">
                  {started ? "Pemeriksaan Awal Selesai" : "Mulai Pemeriksaan"}
                </button>
              </div>
            </> : <div className="relative flex h-full flex-col justify-center"><p className="text-[9px] font-semibold uppercase tracking-wider text-white/75">Pemeriksaan kendaraan</p><h2 className="mt-2 text-lg font-semibold">Tidak ada servis untuk diperiksa</h2><p className="mt-1 text-[11px] text-white/85">Servis yang ditugaskan kepadamu akan muncul di sini.</p></div>}
          </section>

          <section className="min-h-0 overflow-y-auto rounded-[16px] bg-white p-6 shadow-[0_8px_12px_rgba(16,24,40,.06)]">
            <h2 className="mb-3 text-[18px] font-semibold leading-6">Hasil Pemeriksaan Terbaru</h2>
            <div>
              {data.recentResults.map((item) => (
                <div className="flex min-h-[70px] gap-[14px]" key={item.id_riwayat}>
                  <span className="flex w-9 shrink-0 flex-col items-center"><span className="grid size-9 place-items-center rounded-[18px] bg-[#dbeafe]"><span aria-hidden="true" className="size-5 bg-[#2563eb]" style={{ maskImage: "url(/figma-assets/sa-verification-circle-check.svg)", maskPosition: "center", maskRepeat: "no-repeat", maskSize: "20px 20px", WebkitMaskImage: "url(/figma-assets/sa-verification-circle-check.svg)", WebkitMaskPosition: "center", WebkitMaskRepeat: "no-repeat", WebkitMaskSize: "20px 20px" }} /></span>{item !== data.recentResults.at(-1) ? <span className="my-1 w-[2px] flex-1 bg-[#e5e7eb]" /> : null}</span>
                  <div className="min-w-0 pb-[18px]"><p className="truncate text-[14px] font-medium">{item.keterangan}</p><p className="text-[12px] text-[#6b7280]">Diperiksa {formatDate(item.waktu)}</p></div>
                </div>
              ))}
              {data.recentResults.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-[#6b7280]">Belum ada hasil pemeriksaan tercatat.</p>
              ) : null}
            </div>
          </section>
        </div>

        <section className="flex min-h-0 flex-col rounded-[16px] bg-white px-6 py-5 shadow-[0_8px_12px_rgba(16,24,40,.06)]">
          <div className="mb-4 flex h-7 shrink-0 items-center justify-between gap-4">
            <h2 className="text-[18px] font-semibold leading-6">Input Hasil Pemeriksaan</h2>
            <div aria-label="Tahap pemeriksaan" className="flex shrink-0 items-center gap-3 text-[10px] text-[#4b5563]">
              <span className="flex items-center gap-2"><span className={`grid size-7 place-items-center rounded-full border ${started ? "border-[#0f14f0] text-[#0f14f0]" : "border-[#e5e7eb] text-[#9ca3af]"}`}>{started ? "✓" : "1"}</span>Periksa</span>
              <span className="h-px w-8 bg-[#e5e7eb]" />
              <span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-[#0f14f0] text-white">2</span>Input Hasil</span>
            </div>
          </div>
          {!selected ? <div className="flex min-h-0 flex-1 items-center justify-center text-center text-sm text-[#6b7280]">Pemeriksaan akan tampil setelah ada penugasan yang tersedia.</div> : (
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveInspection}>
              <label className="mb-1 text-[12px] font-medium">Hasil Pemeriksaan Awal</label>
              <textarea className="mb-3 h-[80px] shrink-0 resize-none rounded-[8px] border border-[#e5e7eb] p-3 text-[11px] outline-none placeholder:text-[#9ca3af] focus:border-[#0f14f0]" maxLength={300} onChange={(event) => setResult(event.target.value)} placeholder="Isi hasil pemeriksaan awal" value={result} />
              <label className="mb-1 text-[12px] font-medium">Kebutuhan Servis</label>
              <textarea className="mb-3 h-[80px] shrink-0 resize-none rounded-[8px] border border-[#e5e7eb] p-3 text-[11px] outline-none placeholder:text-[#9ca3af] focus:border-[#0f14f0]" maxLength={300} onChange={(event) => setNeeds(event.target.value)} placeholder="Isi kebutuhan servis" value={needs} />
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <label className="text-[12px] font-medium">Sparepart yang Diperlukan</label>
                <span className="text-[9px] text-[#6b7280]">Stok ditampilkan sesuai persediaan</span>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {parts.map((part, index) => {
                  const choice = data.spareparts.find((item) => item.id_sparepart === part.id_sparepart);
                  return <div className="grid min-h-[54px] grid-cols-[32px_minmax(0,1fr)_72px_88px] items-center gap-2" key={`${index}-${part.id_sparepart}`}>
                    <span className="grid size-8 place-items-center rounded-lg bg-[#ffedd5]"><Image alt="" height={16} src="/figma-assets/mekanik-quick-inspection.svg" width={16} /></span>
                    <div className="min-w-0">
                      <select aria-label={`Sparepart ${index + 1}`} className="h-[32px] w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-[10px] outline-none focus:border-[#0f14f0]" onChange={(event) => updatePart(index, "id_sparepart", event.target.value)} value={part.id_sparepart}>
                        <option value="">Nama sparepart</option>
                        {data.spareparts.map((item) => <option key={item.id_sparepart} value={item.id_sparepart}>{item.nama_sparepart} - Stok {item.stok} {item.satuan}</option>)}
                      </select>
                      {choice ? <span className="block truncate pt-0.5 text-[8px] text-[#6b7280]">Stok: {choice.stok} {choice.satuan}</span> : null}
                      <input aria-label={`Bagian yang diganti ${index + 1}`} className="block w-full border-0 bg-transparent p-0 text-[8px] leading-3 outline-none placeholder:text-[#9ca3af]" maxLength={100} onChange={(event) => updatePart(index, "bagian_diganti", event.target.value)} placeholder="Bagian yang diganti" value={part.bagian_diganti} />
                    </div>
                    <div className="flex h-[32px] items-center justify-center rounded-[8px] border border-[#e5e7eb] text-[10px]">
                      <button aria-label="Kurangi jumlah" className="px-1" onClick={() => updatePart(index, "jumlah_sparepart", String(part.jumlah_sparepart - 1))} style={{ fontSize: "12px", lineHeight: "normal" }} type="button">−</button>
                      <span>{part.jumlah_sparepart}</span>
                      <button aria-label="Tambah jumlah" className="px-1" onClick={() => updatePart(index, "jumlah_sparepart", String(part.jumlah_sparepart + 1))} style={{ fontSize: "12px", lineHeight: "normal" }} type="button">+</button>
                    </div>
                    <button aria-label="Hapus sparepart" className="h-[32px] rounded-[8px] border border-[#ef4444] text-[10px] text-[#dc2626]" onClick={() => setParts((current) => current.filter((_, partIndex) => partIndex !== index))} style={{ fontSize: "14px", lineHeight: "normal" }} type="button">Hapus</button>
                  </div>;
                })}
              </div>
              <button className="mt-2 h-[26px] w-fit shrink-0 rounded-[8px] border border-[#0f14f0] px-3 text-[9px] text-[#0f14f0]" onClick={() => setParts((current) => [...current, { id_sparepart: "", jumlah_sparepart: 1, bagian_diganti: "" }])} style={{ fontSize: "12px", lineHeight: "normal" }} type="button">+ Tambah Sparepart</button>
              {error ? <TransientNotice className="mt-2 shrink-0 text-[10px] text-[#dc2626]" onDismiss={() => setError("")} role="alert">{error}</TransientNotice> : null}
              <div className="mt-auto flex shrink-0 justify-end gap-3 pt-3">
                {selected?.status_servis === "Menunggu Persetujuan" ? <Link className="flex h-10 items-center justify-center rounded-[10px] border border-[#0f14f0] px-5 text-[11px] text-[#0f14f0]" href="/mekanik/konfirmasi-servis" style={{ color: "#0f14f0", fontSize: "14px", lineHeight: "normal" }}>Lanjut ke Konfirmasi Servis</Link> : <button className="h-10 rounded-[10px] border border-[#0f14f0] px-5 text-[11px] text-[#0f14f0]" onClick={() => { setResult(""); setNeeds(""); setParts([{ id_sparepart: "", jumlah_sparepart: 1, bagian_diganti: "" }]); setError(""); setNotice(""); }} style={{ fontSize: "14px", lineHeight: "normal" }} type="button">Batal</button>}
                <button className="h-10 min-w-[140px] rounded-[10px] bg-[#0f14f0] px-5 text-[11px] font-semibold text-white disabled:opacity-50" disabled={busy || !selected || !started || selected.status_servis === "Menunggu Persetujuan"} style={{ fontSize: "14px", fontWeight: 600, lineHeight: "normal" }} type="submit">Simpan</button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
