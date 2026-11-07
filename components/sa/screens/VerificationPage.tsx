"use client";

import { useMemo, useState } from "react";
import { verifyServiceRegistration } from "@/app/sa/actions";
import type { ServiceAdvisorService } from "@/components/sa/service-advisor-types";
import {
  formatServiceAdvisorDate,
  saInput,
  saPrimaryButton,
  ServiceAdvisorHero,
  ServiceAdvisorNotice,
  ServiceAdvisorPanel,
  ServiceAdvisorStatus,
} from "@/components/sa/ServiceAdvisorUi";
import { TransientNotice } from "@/components/notifications/TransientNotice";

function formatRegistrationDateTime(value: string) {
  const date = new Date(value);
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);

  return `${dateLabel} • ${timeLabel} WIB`;
}

export default function VerificationPage({
  services,
}: {
  services: ServiceAdvisorService[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [verifiedId, setVerifiedId] = useState("");
  const [search, setSearch] = useState("");
  const [successMessage, setSuccessMessage] = useState<{
    number: string;
    customer: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selected = services.find((service) => service.id === selectedId);
  const filteredServices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return services;
    return services.filter((service) =>
      [
        service.number,
        service.customer,
        service.plate,
        service.complaint,
      ].some((value) => value.toLocaleLowerCase("id-ID").includes(query)),
    );
  }, [search, services]);

  async function verifySelected() {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    setSuccessMessage(null);

    try {
      const result = await verifyServiceRegistration(selected.id);
      if (!result.success) {
        setError(result.message);
        return;
      }

      setVerifiedId(selected.id);
      setSuccessMessage({
        number: selected.number,
        customer: selected.customer,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const pageState = successMessage ? "success" : selected ? "selected" : "empty";

  return (
    <section className="sa-verification mx-auto w-full max-w-[1160px]" data-state={pageState}>
      <ServiceAdvisorHero
        title="VERIFIKASI PENDAFTARAN SERVIS"
        subtitle={
          successMessage
            ? `State setelah aksi • Pendaftaran ${successMessage.number} berhasil diverifikasi.`
            : "Periksa nomor antrian dan data customer sebelum melanjutkan ke penugasan mekanik."
        }
      />

      <div className="sa-verification-grid">
        <div className="sa-verification-left">
          <ServiceAdvisorPanel
            className="sa-verification-list-panel"
            title="Daftar Pendaftaran Servis"
            subtitle={`${formatServiceAdvisorDate(new Date())} • ${services.length} pendaftaran baru`}
          >
            <form
              className="sa-verification-search"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(search.trim());
              }}
            >
              <label className="sa-verification-search-field">
                <span
                  aria-hidden="true"
                  className="sa-verification-icon text-[#555569]"
                />
                <input
                  aria-label="Cari nomor antrian, customer, atau plat nomor"
                  className={saInput}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="A-010"
                  value={search}
                />
              </label>
              <button className={saPrimaryButton} type="submit">
                Cari
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="sa-verification-table">
                <thead>
                  <tr>
                    <th scope="col">No. antrian</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Plat nomor</th>
                    <th scope="col">Status</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((service) => {
                    const isVerified = verifiedId === service.id;

                    return (
                      <tr
                        data-selected={service.id === selectedId}
                        key={service.id}
                      >
                        <td>{service.number}</td>
                        <td>{service.customer}</td>
                        <td>{service.plate}</td>
                        <td>
                          <span
                            className="sa-verification-table-status"
                            data-verified={isVerified}
                          >
                            {isVerified ? "Terverifikasi" : service.verification}
                          </span>
                        </td>
                        <td>
                          <button
                            className="sa-verification-detail-link"
                            onClick={() => {
                              setSelectedId(service.id);
                              setSuccessMessage(null);
                              setError("");
                            }}
                            type="button"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex min-h-[100px] items-center justify-center text-center text-sm text-[#555569]">
                          {services.length === 0
                            ? "Tidak ada pendaftaran yang menunggu verifikasi."
                            : "Tidak ada pendaftaran yang cocok dengan pencarian."}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="sa-verification-result-footer">
              <span>
                Menampilkan {filteredServices.length} dari {services.length} data
              </span>
              <nav
                aria-label="Halaman daftar pendaftaran"
                className="sa-verification-pagination"
              >
                <button aria-label="Halaman sebelumnya" disabled type="button">
                  ‹
                </button>
                <span>1</span>
                <button aria-label="Halaman selanjutnya" disabled type="button">
                  ›
                </button>
              </nav>
            </div>

            {successMessage ? (
              <TransientNotice className="sa-verification-toast" onDismiss={() => setSuccessMessage(null)}>
                <span
                  aria-hidden="true"
                  className="sa-verification-toast-icon"
                />
                <div>
                  <p className="sa-verification-toast-title">
                    Verifikasi berhasil
                  </p>
                  <p className="sa-verification-toast-copy">
                    {successMessage.number} • {successMessage.customer} sudah
                    masuk ke daftar servis terverifikasi. Lanjutkan dengan
                    memilih mekanik.
                  </p>
                </div>
              </TransientNotice>
            ) : null}

            {error ? (
              <ServiceAdvisorNotice onDismiss={() => setError("")} tone="error">{error}</ServiceAdvisorNotice>
            ) : null}
          </ServiceAdvisorPanel>

          <ServiceAdvisorPanel
            className="sa-verification-guide-panel"
            title="Tahapan Verifikasi"
          >
            <div className="grid gap-6 text-[13px] leading-[1.5] sm:grid-cols-3">
              {[
                ["01 • Cari pendaftaran", "Masukkan nomor antrian"],
                ["02 • Cocokkan data", "Periksa customer & kendaraan"],
                ["03 • Verifikasi", "Lanjutkan ke penugasan"],
              ].map(([label, description]) => (
                <div key={label}>
                  <p className="text-[#555569]">{label}</p>
                  <p className="mt-[3px] text-[15px] font-bold text-[#090912]">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </ServiceAdvisorPanel>
        </div>

        <ServiceAdvisorPanel
          className="sa-verification-detail-panel"
          title="Detail Pendaftaran"
          subtitle={selected ? `Pendaftaran dipilih • ${selected.number}` : undefined}
        >
          {selected ? (
            <div className="flex flex-col gap-[14px]">
              <div>
                <ServiceAdvisorStatus
                  value={
                    verifiedId === selected.id
                      ? "Terverifikasi"
                      : selected.verification
                  }
                />
              </div>
              <dl className="sa-verification-detail-grid">
                <div>
                  <dt>Nama customer</dt>
                  <dd>{selected.customer}</dd>
                </div>
                <div>
                  <dt>Plat nomor</dt>
                  <dd>{selected.plate}</dd>
                </div>
                <div className="sa-verification-detail-wide">
                  <dt>Kendaraan</dt>
                  <dd>{selected.vehicle}</dd>
                </div>
                <div className="sa-verification-detail-wide">
                  <dt>Waktu pendaftaran</dt>
                  <dd>{formatRegistrationDateTime(selected.date)}</dd>
                </div>
                <div className="sa-verification-detail-wide">
                  <dt>Keluhan customer</dt>
                  <dd>{selected.complaint}</dd>
                </div>
                {selected.arrivalNote ? (
                  <div className="sa-verification-detail-wide">
                    <dt>Catatan kedatangan</dt>
                    <dd>{selected.arrivalNote}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="text-[12px] leading-5 text-[#555569]">
                Cocokkan nama, plat nomor, dan keluhan dengan customer sebelum
                memverifikasi pendaftaran.
              </p>
              <button
                className={`${saPrimaryButton} w-fit`}
                disabled={
                  submitting ||
                  verifiedId === selected.id ||
                  selected.verification !== "Menunggu" ||
                  services.every((service) => service.id !== selected.id)
                }
                onClick={verifySelected}
                type="button"
              >
                {submitting ? "Memverifikasi..." : "Verifikasi pendaftaran"}
              </button>
            </div>
          ) : null}
        </ServiceAdvisorPanel>
      </div>
    </section>
  );
}
