import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/customer-session";

export const instant = false;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function CustomerServiceStatusPage() {
  const customer = await requireCustomerContext();
  const services = await prisma.servis.findMany({
    where: { kendaraan: { id_customer: customer.id_customer } },
    include: {
      kendaraan: {
        select: { merek: true, tipe_kendaraan: true, nomor_plat: true },
      },
      riwayat_status_servis: {
        orderBy: { waktu: "desc" },
      },
    },
    orderBy: [{ tanggal_daftar: "desc" }, { id_servis: "desc" }],
  });

  return (
    <section className="mx-auto w-full max-w-[1160px] px-6 py-8 max-md:px-4">
      <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#334ce8]">
        Customer
      </p>
      <h1 className="mt-2 text-2xl font-bold text-[#182033]">Status Servis</h1>
      <p className="mt-2 text-[13px] text-[#6d7789]">
        Pantau status dan riwayat servis kendaraan Anda.
      </p>

      {services.length === 0 ? (
        <section className="mt-7 rounded-xl border border-[#e5eaf2] bg-white p-10 text-center">
          <h2 className="text-[15px] font-semibold text-[#26324a]">
            Belum ada pendaftaran servis
          </h2>
          <p className="mt-2 text-[12px] text-[#778195]">
            Status servis akan muncul setelah Anda mendaftarkan kendaraan.
          </p>
        </section>
      ) : (
        <div className="mt-7 grid gap-4">
          {services.map((service) => (
            <article
              className="rounded-xl border border-[#e4e9f1] bg-white p-5 shadow-[0_3px_12px_rgba(19,39,79,.04)]"
              key={service.id_servis}
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#788397]">
                    Nomor antrean
                  </p>
                  <h2 className="mt-1 text-[15px] font-bold text-[#1c2b61]">
                    {service.nomor_antrian}
                  </h2>
                </div>
                <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-[10px] font-semibold text-[#334ce8]">
                  {service.status_servis}
                </span>
              </header>
              <div className="mt-4 grid gap-3 text-[12px] sm:grid-cols-2">
                <div>
                  <span className="text-[#818a99]">Kendaraan</span>
                  <p className="mt-1 font-semibold text-[#354054]">
                    {service.kendaraan.merek} {service.kendaraan.tipe_kendaraan}
                  </p>
                </div>
                <div>
                  <span className="text-[#818a99]">Nomor polisi</span>
                  <p className="mt-1 font-semibold text-[#354054]">
                    {service.kendaraan.nomor_plat}
                  </p>
                </div>
                <div>
                  <span className="text-[#818a99]">Tanggal pendaftaran</span>
                  <p className="mt-1 font-semibold text-[#354054]">
                    {dateFormatter.format(service.tanggal_daftar)}
                  </p>
                </div>
                <div>
                  <span className="text-[#818a99]">Verifikasi</span>
                  <p className="mt-1 font-semibold text-[#354054]">
                    {service.status_verifikasi}
                  </p>
                </div>
              </div>
              {service.kebutuhan_servis && (
                <div className="mt-4 rounded-lg bg-[#f8faff] p-4">
                  <p className="text-[11px] font-semibold text-[#3c4659]">
                    Kebutuhan servis
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#687386]">
                    {service.kebutuhan_servis}
                  </p>
                </div>
              )}
              <div className="mt-5 border-t border-[#edf0f5] pt-4">
                <h3 className="text-[11px] font-semibold text-[#3c4659]">
                  Riwayat status
                </h3>
                {service.riwayat_status_servis.length ? (
                  <ol className="mt-3 grid gap-3">
                    {service.riwayat_status_servis.map((entry) => (
                      <li
                        className="flex flex-wrap justify-between gap-2 text-[11px]"
                        key={entry.id_riwayat}
                      >
                        <span className="font-medium text-[#354054]">
                          {entry.tahap}
                          {entry.keterangan ? ` — ${entry.keterangan}` : ""}
                        </span>
                        <time className="text-[#818a99]">
                          {dateFormatter.format(entry.waktu)}
                        </time>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-[11px] text-[#818a99]">
                    Belum ada riwayat status.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
