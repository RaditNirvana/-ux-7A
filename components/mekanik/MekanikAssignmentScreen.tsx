"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ServiceAdvisorStatus } from "@/components/sa/ServiceAdvisorUi";
import {
  cleanMekanikComplaint,
  getMekanikDisplayServiceId,
  MEKANIK_ASSIGNMENT_STATUSES,
  type MekanikAssignmentRecord,
  type MekanikAssignmentStatus,
} from "@/lib/mekanik-assignment";

const filters = ["Semua", ...MEKANIK_ASSIGNMENT_STATUSES] as const;
type AssignmentFilter = (typeof filters)[number];

function formatKilometers(value: number | null) {
  return value === null ? "-" : `${value.toLocaleString("id-ID")} km`;
}

export default function MekanikAssignmentScreen({
  assignments,
}: {
  assignments: MekanikAssignmentRecord[];
}) {
  const [filter, setFilter] = useState<AssignmentFilter>("Semua");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        MEKANIK_ASSIGNMENT_STATUSES.map((status) => [
          status,
          assignments.filter((assignment) => assignment.status_servis === status).length,
        ]),
      ) as Record<MekanikAssignmentStatus, number>,
    [assignments],
  );
  const visibleAssignments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return assignments.filter((assignment) => {
      const matchesStatus = filter === "Semua" || assignment.status_servis === filter;
      const serviceId = getMekanikDisplayServiceId(
        assignment.id_servis,
        assignment.tanggal_daftar,
      );
      const matchesSearch =
        !query ||
        serviceId.toLocaleLowerCase("id-ID").includes(query) ||
        assignment.kendaraan.nomor_plat.toLocaleLowerCase("id-ID").includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [assignments, filter, search]);
  const selected = assignments.find((assignment) => assignment.id_data_mekanik === selectedId);

  return (
    <main className="mx-auto w-full max-w-[1440px] p-8 max-md:p-4">
      <div className="mb-6 flex h-11 items-center gap-6 max-xl:h-auto max-xl:flex-wrap max-xl:gap-3">
        <input
          aria-label="Cari nomor pendaftaran atau plat kendaraan"
          className="h-11 w-[300px] shrink-0 rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] text-sm text-[#111827] outline-none placeholder:text-[#6b7280] focus:border-[#0f14f0] max-sm:w-full"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari no. pendaftaran atau plat"
          type="search"
          value={search}
        />

        <nav aria-label="Filter status penugasan" className="flex flex-wrap items-center gap-6 max-xl:gap-3">
          {filters.map((value) => {
            const active = filter === value;
            const count = value === "Semua" ? assignments.length : counts[value];
            return (
              <button
                aria-pressed={active}
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors ${active ? "border-[#0f14f0] bg-[#0f14f0] text-white" : "border-[#e5e7eb] bg-white text-[#111827] hover:border-[#0f14f0]"}`}
                key={value}
                onClick={() => {
                  setFilter(value);
                  setSelectedId(null);
                }}
                type="button"
              >
                {value}
                <span
                  className={`rounded-full px-2 py-px text-[11px] font-semibold leading-4 ${active ? "bg-white/25 text-white" : "bg-[#0f14f0]/10 text-[#0f14f0]"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="grid h-[660px] grid-cols-[minmax(0,820fr)_minmax(0,532fr)] gap-6 max-xl:h-auto max-xl:grid-cols-1">
        <section
          aria-label="Daftar penugasan servis"
          className="h-[660px] min-w-0 rounded-[16px] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.06),0_8px_24px_rgba(16,24,40,.06)] max-xl:h-auto"
        >
          <div className="grid h-9 grid-cols-[300px_160px_160px_minmax(0,1fr)] items-center rounded-lg bg-[#f3f4f6]">
            <span className="px-2 text-[11px] font-semibold uppercase tracking-[.06em] text-[#6b7280]">
              Kendaraan
            </span>
            <span className="px-2 text-[11px] font-semibold uppercase tracking-[.06em] text-[#6b7280]">
              No. Pendaftaran
            </span>
            <span className="px-2 text-[11px] font-semibold uppercase tracking-[.06em] text-[#6b7280]">
              Status
            </span>
          </div>

          <div className="h-[584px] overflow-y-auto max-xl:h-auto">
            {visibleAssignments.map((assignment) => {
              const active = selectedId === assignment.id_data_mekanik;
              return (
                <button
                  aria-pressed={active}
                  className={`grid h-[66px] w-full grid-cols-[300px_160px_160px_minmax(0,1fr)] items-center border-b border-[#e5e7eb] text-left ${active ? "bg-[#eef0ff]" : "bg-white hover:bg-[#f8f9ff]"}`}
                  key={assignment.id_data_mekanik}
                  onClick={() => setSelectedId(assignment.id_data_mekanik)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-3 px-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#eef0ff]">
                      <Image
                        alt=""
                        height={20}
                        src="/figma-assets/mekanik-vehicle.svg"
                        width={20}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm leading-5 text-[#111827]">
                        {assignment.kendaraan.tipe_kendaraan}
                      </span>
                      <span className="block truncate text-xs leading-[18px] text-[#6b7280]">
                        {assignment.kendaraan.nomor_plat} - {cleanMekanikComplaint(assignment.keluhan)}
                      </span>
                    </span>
                  </span>

                  <span className="truncate px-2 text-sm text-[#111827]">
                    {getMekanikDisplayServiceId(assignment.id_servis, assignment.tanggal_daftar)}
                  </span>
                  <span className="px-2">
                    <ServiceAdvisorStatus value={assignment.status_servis} variant="mekanik" />
                  </span>
                  <span aria-hidden="true" />
                </button>
              );
            })}

            {visibleAssignments.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#6b7280]">
                {assignments.length === 0
                  ? "Belum ada penugasan servis untukmu."
                  : "Tidak ada penugasan yang sesuai dengan pencarian atau filter ini."}
              </p>
            ) : null}
          </div>
        </section>

        {selected ? (
          <section
            aria-label={`Detail ${getMekanikDisplayServiceId(selected.id_servis, selected.tanggal_daftar)}`}
            className="flex h-[660px] min-w-0 flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(16,24,40,.06),0_8px_24px_rgba(16,24,40,.06)]"
          >
            <div className="relative flex h-40 shrink-0 flex-col justify-between overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,#0a0ad8_0%,#3b4bff_65%,#8f9bff_100%)] p-6 text-white">
              <span aria-hidden="true" className="absolute -right-[50px] -top-[70px] size-[220px] rounded-full bg-white/10" />
              <span aria-hidden="true" className="absolute bottom-[-90px] right-[90px] size-40 rounded-full bg-white/[.08]" />
              <div className="relative flex w-full items-center justify-between">
                <span className="rounded-full bg-white/20 px-3 pb-[5px] pt-1 text-xs leading-[17px]">
                  {selected.status_servis}
                </span>
                <span className="text-xs text-white/80">
                  {getMekanikDisplayServiceId(selected.id_servis, selected.tanggal_daftar)}
                </span>
              </div>
              <div className="relative">
                <h2 className="text-2xl font-bold leading-[32px]">
                  {selected.kendaraan.merek} {selected.kendaraan.tipe_kendaraan} {selected.kendaraan.tahun_kendaraan}
                </h2>
                <p className="text-sm leading-5 text-white/85">{selected.kendaraan.nomor_plat}</p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 p-6">
              <div className="flex min-h-[70px] shrink-0 items-start gap-3 rounded-xl bg-[#fef9c3] p-[14px]">
                <Image
                  alt=""
                  className="mt-0.5 shrink-0"
                  height={20}
                  src="/figma-assets/mekanik-assignment-warning.svg"
                  width={20}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase leading-4 tracking-[.08em] text-[#ca8a04]">
                    Keluhan customer
                  </p>
                  <p className="mt-0.5 text-sm leading-5 text-[#111827]">
                    {cleanMekanikComplaint(selected.keluhan)}
                  </p>
                </div>
              </div>

              <div className="grid h-[106px] shrink-0 grid-cols-2 gap-x-4 gap-y-[18px]">
                <DetailFact
                  icon="/figma-assets/mekanik-vehicle.svg"
                  label="Merek / Tipe"
                  value={`${selected.kendaraan.merek} ${selected.kendaraan.tipe_kendaraan}`}
                />
                <DetailFact
                  icon="/figma-assets/mekanik-assignment-calendar.svg"
                  label="Tahun"
                  value={String(selected.kendaraan.tahun_kendaraan)}
                />
                <DetailFact
                  icon="/figma-assets/mekanik-assignment-gauge.svg"
                  label="Kilometer"
                  value={formatKilometers(selected.kendaraan.kilometer)}
                />
                <DetailFact
                  icon="/figma-assets/mekanik-assignment-owner.svg"
                  label="Pemilik"
                  value={selected.kendaraan.pemilik}
                />
              </div>

              <div className="mt-auto pt-2">
                <a
                  className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#0f14f0] px-5 text-sm font-semibold text-white"
                  href="/mekanik/pemeriksaan"
                >
                  Mulai Pemeriksaan
                </a>
              </div>
            </div>
          </section>
        ) : (
          <section
            aria-label="Detail penugasan"
            className="flex h-[660px] items-center justify-center rounded-[16px] bg-white px-9 shadow-[0_1px_2px_rgba(16,24,40,.06),0_8px_24px_rgba(16,24,40,.06)] max-xl:h-[420px]"
          >
            <div className="flex flex-col items-center gap-1 px-6 text-center">
              <span className="grid size-24 place-items-center rounded-full bg-[#eef0ff]">
                <Image
                  alt=""
                  height={44}
                  src="/figma-assets/mekanik-assignment-empty.svg"
                  width={44}
                />
              </span>
              <h2 className="pt-[13px] text-lg font-semibold leading-6 text-[#111827]">
                Belum ada servis dipilih
              </h2>
              <p className="text-[13px] leading-5 text-[#6b7280]">
                Pilih servis di daftar untuk melihat keluhan dan data kendaraan
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function DetailFact({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-11 min-w-0 items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef0ff]">
        <Image alt="" height={20} src={icon} width={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs leading-[18px] text-[#6b7280]">{label}</span>
        <span className="block truncate text-sm font-medium leading-5 text-[#111827]">{value}</span>
      </span>
    </div>
  );
}
