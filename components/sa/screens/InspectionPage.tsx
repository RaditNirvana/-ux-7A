"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveServiceInspection } from "@/app/sa/actions";
import { TransientNotice } from "@/components/notifications/TransientNotice";
import type {
  ServiceAdvisorService,
  ServiceAdvisorSparepart,
} from "@/components/sa/service-advisor-types";
import {
  ServiceAdvisorHero,
  ServiceAdvisorNotice,
  ServiceAdvisorPanel,
  ServiceAdvisorStatus,
  formatServiceAdvisorTime,
} from "@/components/sa/ServiceAdvisorUi";

type InspectionPart = {
  id_sparepart: string;
  quantity: number;
  area: string;
};

export default function InspectionPage({
  services,
  spareparts,
}: {
  services: ServiceAdvisorService[];
  spareparts: ServiceAdvisorSparepart[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(services[0]?.id ?? "");
  const [openOptions, setOpenOptions] = useState(false);
  const [parts, setParts] = useState<InspectionPart[]>(() =>
    (services[0]?.parts ?? []).map((part) => ({
      id_sparepart: part.id,
      quantity: part.quantity,
      area: part.area ?? "",
    })),
  );
  const [result, setResult] = useState(services[0]?.inspection ?? "");
  const [needs, setNeeds] = useState(services[0]?.needs ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const servicePickerRef = useRef<HTMLDivElement>(null);
  const servicePickerButtonRef = useRef<HTMLButtonElement>(null);
  const selected = services.find((service) => service.id === selectedId);
  const availableParts = useMemo(
    () => spareparts.filter((part) => part.stock > 0),
    [spareparts],
  );
  const partsJson = JSON.stringify(
    parts.map(({ id_sparepart, quantity, area }) => ({
      id_sparepart,
      jumlah_sparepart: quantity,
      bagian_diganti: area,
    })),
  );

  useEffect(() => {
    if (!openOptions) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !servicePickerRef.current?.contains(event.target)
      ) {
        setOpenOptions(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenOptions(false);
        servicePickerButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openOptions]);

  function addPart(id: string) {
    if (!id || parts.some((part) => part.id_sparepart === id)) return;
    setParts((current) => [
      ...current,
      { id_sparepart: id, quantity: 1, area: "" },
    ]);
    setOpenOptions(false);
  }

  async function saveInspection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    const formData = new FormData();
    formData.set("id_servis", selected.id);
    formData.set("hasil_pemeriksaan", result);
    formData.set("kebutuhan_servis", needs);
    formData.set("parts", partsJson);

    try {
      const response = await saveServiceInspection(formData);
      if (!response.success) {
        setError(response.message);
        return;
      }

      setNotice("Hasil pemeriksaan berhasil dicatat. Servis dilanjutkan ke penyusunan biaya.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="sa-inspection mx-auto w-full max-w-[1160px]">
      <ServiceAdvisorHero
        title="HASIL PEMERIKSAAN SERVIS"
        subtitle={
          notice && selected
            ? `State setelah konfirmasi • Kebutuhan tersedia; servis ${selected.number} dilanjutkan ke penyusunan biaya.`
            : "Tinjau hasil pemeriksaan mekanik dan pastikan kebutuhan servis tersedia sebelum dilanjutkan."
        }
      />
      {error ? (
        <div className="mb-3">
          <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice>
        </div>
      ) : null}

      <form className="sa-inspection-form" onSubmit={saveInspection}>
        <div className="sa-inspection-grid">
          <div className="sa-inspection-left">
            <ServiceAdvisorPanel
              className="sa-inspection-result-panel"
              title="Hasil Pemeriksaan"
              subtitle="Pilih servis untuk melihat kebutuhan dan hasil pemeriksaan mekanik"
            >
              <div className="sa-inspection-service-mechanic">
                <div className="sa-inspection-service-field">
                  <label htmlFor="sa-service-select-button">
                    Servis dipilih
                  </label>
                  <div className="sa-inspection-service-picker" ref={servicePickerRef}>
                    <button
                      aria-controls="sa-service-select-options"
                      aria-expanded={openOptions}
                      aria-haspopup="listbox"
                      className="sa-inspection-service-button"
                      id="sa-service-select-button"
                      onClick={() => setOpenOptions((open) => !open)}
                      ref={servicePickerButtonRef}
                      type="button"
                    >
                      <span>
                        {selected
                          ? `${selected.number} • ${selected.customer} • ${selected.plate}`
                          : "Pilih servis"}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`sa-inspection-chevron ${openOptions ? "is-open" : ""}`}
                      />
                    </button>
                    {openOptions ? (
                      <ul
                        className="sa-inspection-dropdown"
                        id="sa-service-select-options"
                        role="listbox"
                      >
                        {services.map((service) => (
                          <li key={service.id}>
                            <button
                              aria-selected={service.id === selectedId}
                              className="sa-inspection-dropdown-option"
                              onClick={() => {
                                setSelectedId(service.id);
                                setResult(service.inspection ?? "");
                                setNeeds(service.needs ?? "");
                                setParts(
                                  service.parts.map((part) => ({
                                    id_sparepart: part.id,
                                    quantity: part.quantity,
                                    area: part.area ?? "",
                                  })),
                                );
                                setOpenOptions(false);
                                setNotice("");
                                setError("");
                              }}
                              role="option"
                              type="button"
                            >
                              <span className="block font-bold">
                                {service.number} • {service.customer} • {service.plate}
                              </span>
                              <span>
                                {service.complaint}
                              </span>
                            </button>
                          </li>
                        ))}
                        {services.length === 0 ? (
                          <li className="sa-inspection-dropdown-empty">
                            Tidak ada servis yang menunggu pemeriksaan.
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                </div>
                <div className="sa-inspection-mechanic">
                  <p>Mekanik pemeriksa</p>
                  <p>
                    {selected?.mechanic
                      ? `${selected.mechanic}${selected.updatedAt ? ` • ${formatServiceAdvisorTime(selected.updatedAt)} WIB` : ""}`
                      : "—"}
                  </p>
                </div>
              </div>
              <div className={`sa-inspection-information ${selected ? "" : "is-empty"}`}>
                <p>
                  {selected
                    ? `Keluhan customer • ${selected.complaint}`
                    : "Keluhan customer"}
                </p>
                {selected ? (
                  <>
                    <label className="sr-only" htmlFor="sa-inspection-result">
                      Hasil pemeriksaan mekanik
                    </label>
                    <textarea
                      className="sa-inspection-result-input"
                      id="sa-inspection-result"
                      maxLength={300}
                      onChange={(event) => setResult(event.target.value)}
                      placeholder="Hasil pemeriksaan belum dicatat."
                      required
                      rows={1}
                      value={result}
                    />
                  </>
                ) : (
                  <p>Belum ada servis dipilih</p>
                )}
              </div>
            </ServiceAdvisorPanel>

            <ServiceAdvisorPanel
              className={`sa-inspection-parts-panel ${parts.length === 0 ? "is-empty" : ""}`}
              title="Daftar Kebutuhan Sparepart"
              subtitle="Stok gudang saat ini • Jumlah belum dikurangi sebelum servis dimulai"
            >
              <div className="overflow-x-auto">
                <table className="sa-inspection-parts-table">
                  <thead>
                    <tr>
                      {["Kode", "Nama sparepart", "Kebutuhan", "Stok", "Ketersediaan"].map(
                        (label) => (
                          <th key={label} scope="col">
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((part) => {
                      const item = spareparts.find(
                        ({ id }) => id === part.id_sparepart,
                      );
                      const available = !!item && item.stock >= part.quantity;
                      return (
                        <tr key={part.id_sparepart}>
                          <td className="font-bold">{part.id_sparepart}</td>
                          <td>{item?.name ?? part.id_sparepart}</td>
                          <td>
                            <label className="sr-only" htmlFor={`qty-${part.id_sparepart}`}>
                              Jumlah {item?.name}
                            </label>
                            <input
                              className="sa-inspection-quantity"
                              id={`qty-${part.id_sparepart}`}
                              min={1}
                              onChange={(event) =>
                                setParts((current) =>
                                  current.map((entry) =>
                                    entry.id_sparepart === part.id_sparepart
                                      ? { ...entry, quantity: Number(event.target.value) }
                                      : entry,
                                  ),
                                )
                              }
                              type="number"
                              value={part.quantity}
                            />{" "}
                            {item?.unit}
                          </td>
                          <td>
                            {item?.stock ?? 0} {item?.unit}
                          </td>
                          <td className="sa-inspection-availability-cell">
                            <span data-available={available}>
                              {available ? "Tersedia" : "Tidak tersedia"}
                            </span>
                            <button
                              aria-label={`Hapus ${item?.name ?? part.id_sparepart}`}
                              className="sa-inspection-remove-part"
                              onClick={() =>
                                setParts((current) =>
                                  current.filter(
                                    (entry) => entry.id_sparepart !== part.id_sparepart,
                                  ),
                                )
                              }
                              type="button"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {parts.length === 0 ? (
                      <tr className="sa-inspection-empty-row">
                        <td colSpan={5}>
                          {services.length
                            ? "Belum ada data. Tambahkan sparepart yang dibutuhkan."
                            : "Belum ada data. Pilih servis terlebih dahulu."}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="sa-inspection-parts-footer">
                <span>
                  Menampilkan {parts.length} dari {parts.length} data
                </span>
                <div className="sa-inspection-parts-footer-actions">
                  {selected ? (
                    <select
                      aria-label="Pilih sparepart untuk ditambahkan"
                      className="sa-inspection-add-part"
                      onChange={(event) => addPart(event.target.value)}
                      value=""
                    >
                      <option value="">+ Tambah sparepart</option>
                      {availableParts
                        .filter(
                          ({ id }) => !parts.some((part) => part.id_sparepart === id),
                        )
                        .map((part) => (
                          <option key={part.id} value={part.id}>
                            {part.id} • {part.name} ({part.stock} {part.unit})
                          </option>
                        ))}
                    </select>
                  ) : null}
                  <nav aria-label="Halaman daftar kebutuhan sparepart" className="sa-inspection-pagination">
                    <button aria-label="Halaman sebelumnya" disabled type="button">
                      ‹
                    </button>
                    <span>1</span>
                    <button aria-label="Halaman selanjutnya" disabled type="button">
                      ›
                    </button>
                  </nav>
                </div>
              </div>
            </ServiceAdvisorPanel>
          </div>

          <ServiceAdvisorPanel
            className="sa-inspection-confirmation-panel"
            title="Konfirmasi Kelanjutan"
            subtitle={
              selected
                ? `${selected.number} • ${selected.customer}`
                : "—"
            }
          >
            {selected && !notice ? (
              <div className="sa-inspection-status">
                <ServiceAdvisorStatus value={selected.status} />
              </div>
            ) : null}
            {notice ? (
              <div className="sa-inspection-status">
                <ServiceAdvisorStatus value="Penyusunan biaya" />
              </div>
            ) : null}
            <dl className="sa-inspection-confirmation-details">
              <div>
                <dt>Tindakan servis</dt>
                <dd>
                  {selected ? (
                    <textarea
                      aria-label="Tindakan servis yang dibutuhkan"
                      className="sa-inspection-action-input"
                      id="sa-service-needs"
                      maxLength={300}
                      onChange={(event) => setNeeds(event.target.value)}
                      placeholder="Tindakan servis belum dicatat."
                      required
                      value={needs}
                    />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>Estimasi pengerjaan</dt>
                <dd>
                  {selected ? "90 menit setelah persetujuan biaya" : "—"}
                </dd>
              </div>
            </dl>
            <TransientNotice
              autoDismiss={Boolean(notice)}
              className={`sa-inspection-guidance ${notice ? "is-success" : ""} ${selected ? "" : "is-empty"}`}
              onDismiss={() => setNotice("")}
              role="status"
            >
              <span aria-hidden="true" className="sa-inspection-guidance-icon" />
              <div>
                <p>
                  {notice
                    ? "Kebutuhan tersedia"
                    : selected
                      ? "Seluruh kebutuhan tersedia"
                      : "Belum ada servis dipilih"}
                </p>
                <p>
                  {notice
                    ? "Servis dilanjutkan ke tahap penyusunan biaya."
                    : selected
                      ? "Konfirmasi untuk melanjutkan servis ke tahap penyusunan biaya."
                      : "Pilih servis untuk melihat hasil pemeriksaan dan kebutuhan."}
                </p>
              </div>
            </TransientNotice>
            {!notice ? (
              <button
                className="sa-inspection-confirm-button"
                disabled={
                  !selected ||
                  submitting ||
                  !["Ditugaskan", "Diperiksa", "Diproses", "Menunggu Persetujuan"].includes(
                    selected.status,
                  ) ||
                  parts.some((part) => {
                    const item = spareparts.find(
                      ({ id }) => id === part.id_sparepart,
                    );
                    return !item || item.stock < part.quantity;
                  })
                }
                type="submit"
              >
                {submitting ? "Menyimpan..." : "Konfirmasi & lanjutkan"}
              </button>
            ) : null}
            {selected ? (
              <p className="sa-inspection-confirmation-note">
                Konfirmasi hanya dilakukan setelah hasil pemeriksaan dan jumlah kebutuhan dipastikan benar.
              </p>
            ) : null}
          </ServiceAdvisorPanel>
        </div>
      </form>
    </section>
  );
}
