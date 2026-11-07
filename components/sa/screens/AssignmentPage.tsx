"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { assignMechanic } from "@/app/sa/actions";
import type {
  ServiceAdvisorMechanic,
  ServiceAdvisorService,
} from "@/components/sa/service-advisor-types";
import {
  formatServiceAdvisorDate,
  formatServiceAdvisorTime,
  saInput,
  saPrimaryButton,
  saSecondaryButton,
  ServiceAdvisorEmpty,
  ServiceAdvisorHero,
  ServiceAdvisorModal,
  ServiceAdvisorNotice,
  ServiceAdvisorPanel,
  ServiceAdvisorStatus,
  ServiceAdvisorTabs,
} from "@/components/sa/ServiceAdvisorUi";
import { TransientNotice } from "@/components/notifications/TransientNotice";

type AssignmentNotice = {
  number: string;
  mechanicName: string;
  mechanicDisplayId: string;
};

export default function AssignmentPage({
  services,
  mechanics,
}: {
  services: ServiceAdvisorService[];
  mechanics: ServiceAdvisorMechanic[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mechanicId, setMechanicId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<AssignmentNotice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selected = services.find((service) => service.id === selectedId);
  const availableMechanics = mechanics.filter(
    (mechanic) =>
      mechanic.availability === "Tersedia" && mechanic.login === "Aktif",
  );
  const busyMechanicCount = mechanics.filter(
    (mechanic) => mechanic.availability === "Sedang Bekerja",
  ).length;
  const filteredServices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return services;
    return services.filter((service) =>
      [service.number, service.customer, service.plate]
        .join(" ")
        .toLocaleLowerCase("id-ID")
        .includes(query),
    );
  }, [search, services]);

  async function saveAssignment() {
    if (!selected || !mechanicId) return;
    const assignedMechanic = mechanics.find(
      (mechanic) => mechanic.id === mechanicId,
    );
    if (!assignedMechanic) {
      setError("Mekanik yang dipilih tidak ditemukan.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await assignMechanic(selected.id, mechanicId);
      if (!result.success) {
        setError(result.message);
        return;
      }

      setDialogOpen(false);
      setNotice({
        number: selected.number,
        mechanicName: assignedMechanic.name,
        mechanicDisplayId: assignedMechanic.displayId,
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const pageState = notice ? "success" : selected ? "selected" : "empty";

  return (
    <section
      className="sa-assignment mx-auto w-full max-w-[1160px]"
      data-state={pageState}
    >
      <ServiceAdvisorHero
        title="PENUGASAN MEKANIK"
        subtitle={
          notice
            ? `State setelah aksi • ${notice.mechanicName} berhasil ditugaskan untuk servis ${notice.number}.`
            : "Kelola servis terverifikasi dan tentukan mekanik sesuai keahlian serta ketersediaannya."
        }
      />
      <ServiceAdvisorTabs
        active="/sa/penugasan"
        links={[
          { href: "/sa/penugasan", label: "Daftar penugasan" },
          { href: "/sa/data-mekanik", label: "Data Mekanik" },
        ]}
      />
      {error && !dialogOpen ? (
        <div className="mb-3">
            <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice>
        </div>
      ) : null}

      <div className="sa-assignment-grid">
        <ServiceAdvisorPanel
          className="sa-assignment-list-panel"
          title="Daftar Servis Terverifikasi"
          subtitle={`Snapshot operasional • ${formatServiceAdvisorDate(new Date())}`}
        >
          {!notice ? (
            <form
              className="sa-assignment-search"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(search.trim());
              }}
            >
              <label className="sa-assignment-search-field">
                <span
                  aria-hidden="true"
                  className="sa-assignment-search-icon text-[#555569]"
                />
                <input
                  aria-label="Cari nomor antrian, customer, atau plat nomor"
                  className={saInput}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nomor antrian, customer, atau plat nomor"
                  value={search}
                />
              </label>
              <button className={saPrimaryButton} type="submit">
                Cari
              </button>
            </form>
          ) : null}

          <div
            aria-label="Daftar servis terverifikasi"
            className="sa-assignment-table"
            role="table"
          >
            <div role="rowgroup">
              <div className="sa-assignment-table-header" role="row">
                {[
                  "Antrian / Customer",
                  "Plat nomor",
                  "Mekanik",
                  "Status servis",
                  "Aksi",
                ].map((heading) => (
                  <span key={heading} role="columnheader">
                    {heading}
                  </span>
                ))}
              </div>
            </div>
            <div role="rowgroup">
              {filteredServices.map((service) => (
                <div
                  className="sa-assignment-table-row"
                  data-selected={service.id === selectedId}
                  key={service.id}
                  role="row"
                >
                  <span className="font-bold" role="cell">
                    {service.number} • {service.customer}
                  </span>
                  <span role="cell">{service.plate}</span>
                  <span role="cell">{service.mechanic ?? "Belum dipilih"}</span>
                  <span
                    className="sa-assignment-status"
                    data-status={service.status}
                    role="cell"
                  >
                    {service.status === "Menunggu Penugasan"
                      ? "Menunggu penugasan"
                      : service.status}
                  </span>
                  <span role="cell">
                    <button
                      className="sa-assignment-table-action"
                      onClick={() => {
                        setSelectedId(service.id);
                        setNotice(null);
                        setError("");
                      }}
                      type="button"
                    >
                      {service.status === "Menunggu Penugasan"
                        ? "Pilih"
                        : "Detail"}
                    </button>
                  </span>
                </div>
              ))}
              {filteredServices.length === 0 ? (
                <div className="sa-assignment-empty-row" role="row">
                  <div aria-colspan={5} role="cell">
                    <ServiceAdvisorEmpty>
                      {services.length
                        ? "Tidak ada servis yang cocok dengan pencarian."
                        : "Tidak ada servis yang menunggu penugasan."}
                    </ServiceAdvisorEmpty>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="sa-assignment-result-footer">
            <span>
              Menampilkan {filteredServices.length} dari {services.length} data
            </span>
            <nav aria-label="Halaman daftar servis" className="sa-assignment-pagination">
              <button aria-label="Halaman sebelumnya" disabled type="button">
                ‹
              </button>
              <span>1</span>
              <button aria-label="Halaman selanjutnya" disabled type="button">
                ›
              </button>
            </nav>
          </div>

          {notice ? (
            <TransientNotice className="sa-assignment-toast" onDismiss={() => setNotice(null)}>
              <span aria-hidden="true" className="sa-assignment-toast-icon" />
              <div>
                <p className="sa-assignment-toast-title">
                  Mekanik berhasil ditugaskan
                </p>
                <p className="sa-assignment-toast-copy">
                  {notice.mechanicName} • {notice.mechanicDisplayId} menangani{" "}
                  {notice.number}. Penugasan berhasil disimpan
                  {selected?.updatedAt
                    ? ` pada ${formatServiceAdvisorTime(selected.updatedAt)} WIB.`
                    : "."}
                </p>
              </div>
            </TransientNotice>
          ) : null}
        </ServiceAdvisorPanel>

        <div className="sa-assignment-sidebar">
          <ServiceAdvisorPanel
            className="sa-assignment-mechanics-panel"
            title="Ketersediaan Mekanik"
            subtitle={`${availableMechanics.length} tersedia • ${busyMechanicCount} sedang bertugas`}
          >
            <ul className="sa-assignment-mechanics-list">
              {availableMechanics.map((mechanic) => (
                <li className="sa-assignment-mechanic-row" key={mechanic.id}>
                  <p className="font-bold">{mechanic.name}</p>
                  <ServiceAdvisorStatus value={mechanic.availability} />
                </li>
              ))}
              {availableMechanics.length === 0 ? (
                <li>
                  <ServiceAdvisorEmpty>
                    Tidak ada mekanik tersedia saat ini.
                  </ServiceAdvisorEmpty>
                </li>
              ) : null}
            </ul>
          </ServiceAdvisorPanel>

          <ServiceAdvisorPanel
            className="sa-assignment-selected-panel"
            title="Servis Dipilih"
            subtitle={
              selected
                ? `${selected.number} • ${selected.customer} • ${selected.plate}`
                : undefined
            }
          >
            {selected ? (
              <>
                <p className="sa-assignment-complaint">{selected.complaint}</p>
                {notice ? (
                  <div aria-hidden="true" className="h-[40.333px]" />
                ) : (
                  <div>
                    <button
                      className={saPrimaryButton}
                      disabled={
                        selected.status !== "Menunggu Penugasan" ||
                        availableMechanics.length === 0
                      }
                      onClick={() => {
                        setError("");
                        setMechanicId(availableMechanics[0]?.id ?? "");
                        setDialogOpen(true);
                      }}
                      type="button"
                    >
                      Pilih mekanik
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </ServiceAdvisorPanel>
        </div>
      </div>

      {dialogOpen ? (
        <ServiceAdvisorModal
          className="sa-assignment-modal"
          onClose={() => setDialogOpen(false)}
          title="Pilih & Tugaskan Mekanik"
        >
          {selected ? (
            <p className="sa-assignment-modal-description">
              {selected.number} • {selected.customer} • {selected.plate}. Pilih
              mekanik yang tersedia untuk menangani servis ini.
            </p>
          ) : null}
          <div className="sa-assignment-modal-field">
            <label htmlFor="sa-selected-service">Servis terpilih</label>
            <input
              className={saInput}
              id="sa-selected-service"
              readOnly
              value={
                selected
                  ? `${selected.number} — ${selected.complaint}`
                  : ""
              }
            />
          </div>
          <fieldset className="sa-assignment-options">
            <legend className="sr-only">Pilih mekanik</legend>
            {availableMechanics.map((mechanic) => (
              <label
                className="sa-assignment-option"
                data-selected={mechanicId === mechanic.id}
                key={mechanic.id}
              >
                <input
                  checked={mechanicId === mechanic.id}
                  name="mechanic"
                  onChange={() => setMechanicId(mechanic.id)}
                  type="radio"
                  value={mechanic.id}
                />
                <span className="sa-assignment-option-details">
                  <span className="sa-assignment-option-name">
                    {mechanic.name} • {mechanic.displayId}
                  </span>
                </span>
                <ServiceAdvisorStatus value={mechanic.availability} />
              </label>
            ))}
            {availableMechanics.length === 0 ? (
              <ServiceAdvisorEmpty>
                Tidak ada mekanik tersedia saat ini.
              </ServiceAdvisorEmpty>
            ) : null}
          </fieldset>
          {error ? <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice> : null}
          <div className="sa-assignment-modal-actions">
            <button
              className={saSecondaryButton}
              onClick={() => setDialogOpen(false)}
              type="button"
            >
              Batal
            </button>
            <button
              className={saPrimaryButton}
              disabled={!mechanicId || submitting}
              onClick={saveAssignment}
              type="button"
            >
              {submitting ? "Menyimpan..." : "Simpan penugasan"}
            </button>
          </div>
        </ServiceAdvisorModal>
      ) : null}
    </section>
  );
}
