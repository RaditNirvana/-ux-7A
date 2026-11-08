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
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const selected = services.find((service) => service.id === selectedId);
  const summaryService =
    selected ?? services.find((service) => service.status === "Selesai") ?? services[0];
  const completedCount = services.filter((service) => service.status === "Selesai").length;
  const inProgressCount = services.filter((service) => service.status === "Diproses").length;
  const waitingCount = services.filter((service) => service.status.startsWith("Menunggu")).length;
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
    <section className="sa-status-page">
      <ServiceAdvisorHero
        artSrc="/figma-assets/sa-status-hero.png"
        title="PROSES DAN STATUS SERVIS"
        subtitle="Pantau tahapan, waktu pengerjaan, serta hasil servis kendaraan secara terpusat."
      />
      <div className="sa-status-grid">
        <div className="space-y-4">
          <ServiceAdvisorPanel
            className="sa-status-list-panel"
            title="Daftar Proses Servis"
            subtitle={`${formatServiceAdvisorDate(new Date())} • ${completedCount} selesai • ${inProgressCount} diproses • ${waitingCount} menunggu`}
          >
            <label className="sa-status-search sr-only">
              <span className="sr-only">Cari proses servis</span>
              <input
                className={saInput}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nomor antrian, customer, plat, atau mekanik"
                value={search}
              />
            </label>
            <div className="sa-status-table-wrap overflow-x-auto">
              <table className="sa-status-table">
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
                      className={`sa-status-row border-b border-[#d1cde7] ${
                        service.id === selectedId ? "bg-[#e3e1f8]" : ""
                      }`}
                      key={service.id}
                    >
                      <td className="px-2 py-2.5 font-bold">{service.number}</td>
                      <td className="px-2 py-2.5">
                        {service.customer}
                        <span className="sa-status-plate block text-[10px] text-[#77758a]">
                          {service.plate}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">{service.mechanic ?? "Belum dipilih"}</td>
                      <td className="px-2 py-2.5" data-status={service.status}>
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
            <div className="sa-status-footer">
              <p>Menampilkan {filteredServices.length} dari {services.length} data</p>
              <nav aria-label="Halaman daftar proses servis">
                <button aria-label="Halaman sebelumnya" disabled type="button">‹</button>
                <span>1</span>
                <button aria-label="Halaman selanjutnya" disabled type="button">›</button>
              </nav>
            </div>
          </ServiceAdvisorPanel>
          {summaryService ? (
            <ServiceAdvisorPanel
              className="sa-status-summary-panel"
              title={`${selected ? "Ringkasan Servis" : "Hasil Servis"} • ${summaryService.number} ${summaryService.customer} • ${summaryService.plate}`}
            >
              <p className="text-xs leading-5">
                {summaryService.result ?? summaryService.needs ?? summaryService.complaint}
              </p>
              {summaryService.inspection ? (
                <p className="mt-2 text-[10px] leading-4 text-[#68667a]">
                  Hasil pemeriksaan: {summaryService.inspection}
                </p>
              ) : null}
            </ServiceAdvisorPanel>
          ) : null}
        </div>

        <ServiceAdvisorPanel
          className="sa-status-detail-panel"
          title="Detail Progres Servis"
          subtitle={
            selected
              ? `${selected.number} • ${selected.customer} • ${selected.plate}`
              : undefined
          }
        >
          {selected ? (
            <>
              <div className="sa-status-current-row mb-4 flex items-center justify-between gap-2">
                <ServiceAdvisorStatus value={selected.status} />
                <span className="text-[10px] text-[#68667a]">
                  Update {formatServiceAdvisorTime(selected.updatedAt)}
                </span>
              </div>
              <p className="sa-status-complaint mb-4 text-xs text-[#68667a]">
                Keluhan: {selected.complaint}
              </p>
              {selected.timeline.length ? (
                <ol className="sa-status-timeline space-y-4">
                  {selected.timeline.map((item, index) => (
                    <li className="sa-status-timeline-item flex gap-3" key={`${item.stage}-${item.time}`}>
                      <span
                        aria-hidden="true"
                        className={`sa-status-timeline-marker flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          index < selected.timeline.length - 1
                            ? "bg-[#493cdf] text-white"
                            : "border border-[#8d86db] bg-white text-[#493cdf]"
                        }`}
                      >
                        {index < selected.timeline.length - 1 ? "✓" : "•"}
                      </span>
                      <div className="sa-status-timeline-copy">
                        <p className="sa-status-stage text-xs font-bold">{item.stage}</p>
                        <p className="sa-status-time mt-0.5 text-[10px] text-[#493cdf]">
                          {formatServiceAdvisorTime(item.time)} WIB
                        </p>
                        {item.note ? (
                          <p className="sa-status-note mt-0.5 text-[10px] leading-4 text-[#68667a]">
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
                <div className="sa-status-parts mt-4 border-t border-[#d1cde7] pt-3">
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
          ) : null}
        </ServiceAdvisorPanel>
      </div>
    </section>
  );
}
