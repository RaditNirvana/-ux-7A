import Image from "next/image";
import Link from "next/link";
import { getServiceAdvisorDashboardData } from "@/lib/service-advisor-data";

export const instant = false;

const summaryIcons = {
  document: {
    src: "/figma-assets/sa-summary-verification.svg",
    width: 24,
    height: 24,
  },
  people: {
    src: "/figma-assets/sa-summary-mechanics.svg",
    width: 31,
    height: 31,
  },
  box: {
    src: "/figma-assets/sa-summary-stock.svg",
    width: 27.405,
    height: 29.7414,
  },
} as const;

export default async function ServiceAdvisorDashboardPage() {
  const { registrations, progress, summary } =
    await getServiceAdvisorDashboardData();

  return (
    <section className="text-[var(--sa-page-ink)]">
      <div className="ml-[7px] flex h-[200px] items-center justify-between overflow-hidden rounded-[16px] bg-gradient-to-r from-[#493cdf] from-[5.769%] to-[#9d9ac2] to-[99.038%] pl-[34px] pr-[47px]">
        <div className="max-w-[640px]">
          <h1 className="text-[32px] font-bold leading-[normal] tracking-[-0.64px] text-white">
            HALO, SERVICE ADVISOR!
          </h1>
          <p className="mt-[7px] text-[17px] font-normal leading-[normal] tracking-[-0.34px] text-white">
            Kelola pendaftaran servis, penugasan mekanik, kebutuhan sparepart, dan pantau proses servis kendaraan dalam satu tempat
          </p>
        </div>
        <Image
          alt="Peralatan servis"
          className="h-[183px] w-[184px] shrink-0 object-cover"
          height={500}
          loading="eager"
          src="/figma-assets/tools-3d.png"
          width={500}
        />
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,735fr)_minmax(0,426fr)] gap-4">
        <section>
          <div className="flex h-8 items-start justify-between px-[11px]">
            <h2 className="text-[18px] font-bold leading-6">
              Pendaftaran Servis Terbaru
            </h2>
            <Link
              className="flex items-center gap-1 text-[14px] font-bold leading-6 hover:text-[var(--sa-sidebar-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sa-sidebar-accent)]"
              href="/sa/verifikasi"
            >
              Lihat Lengkap
              <span aria-hidden="true" className="sa-dashboard-arrow" />
            </Link>
          </div>

          <div className="h-[266px] overflow-hidden rounded-[16px] bg-[var(--sa-panel)] px-[15px] pb-1 pt-[10px]">
            <div className="sa-dashboard-table-header grid-cols-[140px_152px_110px_minmax(0,1fr)] text-left">
              <span>Nomor Antrian</span>
              <span>Nama Customer</span>
              <span>Plat Nomor</span>
              <span>Keluhan</span>
            </div>

            {registrations.map((item) => (
              <div
                className="sa-dashboard-table-row grid-cols-[140px_152px_110px_minmax(0,1fr)]"
                key={item.id}
              >
                <span>{item.number}</span>
                <span>{item.customer}</span>
                <span>{item.plate}</span>
                <span className="truncate px-1 text-[13px]">{item.issue}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex h-8 items-start justify-between px-[12px]">
            <h2 className="text-[18px] font-bold leading-6">
              Progres Servis Hari Ini
            </h2>
            <Link
              className="flex items-center gap-1 text-[14px] font-bold leading-6 hover:text-[var(--sa-sidebar-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sa-sidebar-accent)]"
              href="/sa/status-servis"
            >
              Lihat Lengkap
              <span aria-hidden="true" className="sa-dashboard-arrow" />
            </Link>
          </div>

          <div className="h-[266px] overflow-hidden rounded-[16px] bg-[var(--sa-panel)] px-4 pb-1 pt-[10px]">
            <div className="sa-dashboard-table-header grid-cols-[1.2fr_1fr]">
              <span>Plat Nomor</span>
              <span className="text-center">Status</span>
            </div>

            {progress.map((item) => (
              <div
                className="sa-dashboard-table-row grid-cols-[1.2fr_1fr]"
                key={item.id}
              >
                <span className="text-center">{item.plate}</span>
                <span>{item.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 h-[194px] rounded-[16px] bg-[var(--sa-panel)] px-[11px] pt-[10px]">
        <h2 className="text-[28px] font-bold leading-[34px]">
          RINGKASAN OPERASIONAL
        </h2>

        <div className="mt-[18px] grid max-w-[1032px] grid-cols-3 text-center">
          {summary.map((item) => {
            const icon = summaryIcons[item.icon];

            return (
              <div key={item.title} className="flex flex-col items-center">
                <Image
                  alt=""
                  height={icon.height}
                  src={icon.src}
                  width={icon.width}
                />
                <p className="mt-0 h-[23px] text-[15px] font-normal leading-[23px]">
                  {item.title}
                </p>
                <p className="mt-1 h-[30px] text-[28px] font-bold leading-[30px]">
                  {item.count}
                </p>
                <p className="-mt-[2px] h-[23px] text-[15px] font-normal leading-[23px]">
                  {item.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
