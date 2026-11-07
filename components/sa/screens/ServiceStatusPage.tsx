"use client";

import { useMemo, useState } from "react";
import type { ServiceAdvisorService } from "@/components/sa/service-advisor-types";
import {
  formatServiceAdvisorDate,
  formatServiceAdvisorTime,
  saInput,
  ServiceAdvisorEmpty,
  ServiceAdvisorHero,
  ServiceAdvisorPanel,
  ServiceAdvisorStatus,
} from "@/components/sa/ServiceAdvisorUi";

export default function ServiceStatusPage({
  services,
}: {
  services: ServiceAdvisorService[];
}) {
  const [selectedId, setSelectedId] = useState(services[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const selected = services.find((service) => service.id === selectedId);
  const filteredServices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return services;
    return services.filter((service) =>
      [
        service.number,
        service.customer,
        service.plate,
        service.mechanic ?? "",
        service.status,
      ]
        .join(" ")
        .toLocaleLowerCase("id-ID")
        .includes(query),
    );
  }, [search, services]);

  return (
    <section>
      <ServiceAdvisorHero
        title="PROSES DAN STATUS SERVIS"
        subtitle="Pantau tahapan, waktu pengerjaan, serta hasil servis kendaraan secara terpusat."
      />
      <div className="grid gap-4 xl:grid-cols-[1.7fr_0.8fr]">
        <div className="space-y-4">
          <ServiceAdvisorPanel
            title="Daftar Proses Servis"
            subtitle={`${services.filter((service) => service.status !== "Selesai" && service.status !== "Batal").length} servis aktif • ${services.length} total servis`}
          >
            <label className="mb-3 block">
              <span className="sr-only">Cari proses servis</span>
              <input
                className={saInput}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nomor antrian, customer, plat, atau mekanik"
                value={search}
              />
            </label>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#8e8b9e]">
                    {["Antrian", "Customer / Plat", "Mekanik", "Status servis", "Update", "Aksi"].map(
                      (label) => (
                        <th className="px-2 py-2 font-bold" key={label}>
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((service) => (
                    <tr
                      className={`border-b border-[#d1cde7] ${
                        service.id === selectedId ? "bg-[#e3e1f8]" : ""
                      }`}
                      key={service.id}
                    >
                      <td className="px-2 py-2.5 font-bold">{service.number}</td>
                      <td className="px-2 py-2.5">
                        {service.customer}
                        <span className="block text-[10px] text-[#77758a]">
                          {service.plate}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">{service.mechanic ?? "Belum dipilih"}</td>
                      <td className="px-2 py-2.5">
                        <ServiceAdvisorStatus value={service.status} />
                      </td>
                      <td className="px-2 py-2.5">
                        {service.updatedAt
                          ? formatServiceAdvisorTime(service.updatedAt)
                          : formatServiceAdvisorDate(service.date)}
                      </td>
                      <td className="px-2 py-2.5">
                        <button
                          className="font-bold text-[#493cdf] hover:underline"
                          onClick={() => setSelectedId(service.id)}
                          type="button"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredServices.length === 0 ? (
                <ServiceAdvisorEmpty>
                  {services.length
                    ? "Tidak ada servis yang cocok dengan pencarian."
                    : "Belum ada data proses servis."}
                </ServiceAdvisorEmpty>
              ) : null}
            </div>
            <p className="mt-2 text-[10px] text-[#77758a]">
              Menampilkan {filteredServices.length} dari {services.length} data
            </p>
          </ServiceAdvisorPanel>
          {selected ? (
            <ServiceAdvisorPanel
              title={`Hasil Servis • ${selected.number} ${selected.customer} • ${selected.plate}`}
            >
              <p className="text-xs leading-5">
                {selected.result ?? selected.needs ?? selected.complaint}
              </p>
              {selected.inspection ? (
                <p className="mt-2 text-[10px] leading-4 text-[#68667a]">
                  Hasil pemeriksaan: {selected.inspection}
                </p>
              ) : null}
            </ServiceAdvisorPanel>
          ) : null}
        </div>

        <ServiceAdvisorPanel
          className="h-fit min-h-[350px]"
          title="Detail Progres Servis"
          subtitle={
            selected
              ? `${selected.number} • ${selected.customer} • ${selected.plate}`
              : undefined
          }
        >
          {selected ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-2">
                <ServiceAdvisorStatus value={selected.status} />
                <span className="text-[10px] text-[#68667a]">
                  Update {formatServiceAdvisorTime(selected.updatedAt)}
                </span>
              </div>
              <p className="mb-4 text-xs text-[#68667a]">
                Keluhan: {selected.complaint}
              </p>
              {selected.timeline.length ? (
                <ol className="space-y-4">
                  {selected.timeline.map((item, index) => (
                    <li className="flex gap-3" key={`${item.stage}-${item.time}`}>
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          index < selected.timeline.length - 1
                            ? "bg-[#493cdf] text-white"
                            : "border border-[#8d86db] bg-white text-[#493cdf]"
                        }`}
                      >
                        {index < selected.timeline.length - 1 ? "✓" : "•"}
                      </span>
                      <div>
                        <p className="text-xs font-bold">{item.stage}</p>
                        <p className="mt-0.5 text-[10px] text-[#493cdf]">
                          {formatServiceAdvisorTime(item.time)} WIB
                        </p>
                        {item.note ? (
                          <p className="mt-0.5 text-[10px] leading-4 text-[#68667a]">
                            {item.note}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <ServiceAdvisorEmpty>Belum ada riwayat tahapan servis.</ServiceAdvisorEmpty>
              )}
              {selected.parts.length ? (
                <div className="mt-4 border-t border-[#d1cde7] pt-3">
                  <h3 className="text-xs font-bold">Kebutuhan sparepart</h3>
                  <ul className="mt-2 space-y-2 text-[10px]">
                    {selected.parts.map((part) => (
                      <li
                        className="flex justify-between gap-2"
                        key={part.id}
                      >
                        <span>{part.name} • {part.quantity} {part.unit}</span>
                        <ServiceAdvisorStatus value={part.availability} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <ServiceAdvisorEmpty>Pilih servis untuk melihat progres.</ServiceAdvisorEmpty>
          )}
        </ServiceAdvisorPanel>
      </div>
    </section>
  );
}
