import Image from "next/image";
import Link from "next/link";
import LogoutAction from "@/components/customer/LogoutAction";
import type {
  CustomerServiceActivity,
  CustomerVehicle,
} from "@/components/customer/types";

type CustomerDashboardProps = {
  name: string;
  vehicles: CustomerVehicle[];
  activeServiceCount: number;
  pendingBillAmount: number;
  latestService: CustomerServiceActivity | null;
};

function formatCurrency(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SummaryIcon({ src }: { src: string }) {
  return (
    <span aria-hidden="true" className="customer-summary-icon">
      <Image
        alt=""
        height={34}
        src="/figma-assets/customer-icon-circle.svg"
        width={34}
      />
      <Image alt="" height={20} src={src} width={20} />
    </span>
  );
}

export default function CustomerDashboard({
  name,
  vehicles,
  activeServiceCount,
  pendingBillAmount,
  latestService,
}: CustomerDashboardProps) {
  const firstVehicle = vehicles[0];
  const latestStatusLabel = latestService?.status_servis.toUpperCase();

  return (
    <div className="customer-page-content customer-dashboard-content">
      <p className="customer-eyebrow">AREA CUSTOMER</p>
      <h1 className="customer-page-title customer-greeting">
        Halo, {name} 👋
      </h1>

      <section aria-label="Ringkasan akun" className="customer-summary-grid">
        <article className="customer-summary-card">
          <SummaryIcon src="/figma-assets/customer-dashboard-car.svg" />
          <h2>Kendaraan saya</h2>
          <p className="customer-summary-value">
            {vehicles.length} kendaraan terdaftar
          </p>
          {firstVehicle ? (
            <span className="customer-summary-chip">
              {firstVehicle.merek.toUpperCase()}{" "}
              {firstVehicle.tipe_kendaraan.toUpperCase()} •{" "}
              {firstVehicle.nomor_plat}
            </span>
          ) : (
            <Link className="customer-summary-chip" href="/customer/vehicles">
              TAMBAH KENDARAAN
            </Link>
          )}
        </article>

        <article className="customer-summary-card">
          <SummaryIcon src="/figma-assets/customer-dashboard-service.svg" />
          <h2>Servis aktif</h2>
          <p className="customer-summary-value">
            {activeServiceCount} kendaraan di bengkel
          </p>
          {latestService ? (
            <Link
              className="customer-summary-chip customer-summary-chip--status"
              href="/customer/service-status"
            >
              <span aria-hidden="true" className="customer-summary-status-dot" />
              {latestStatusLabel}
            </Link>
          ) : null}
        </article>

        <article className="customer-summary-card customer-summary-card--billing">
          <SummaryIcon src="/figma-assets/customer-dashboard-cost.svg" />
          <h2>Tagihan menunggu</h2>
          <p className="customer-summary-amount">
            {formatCurrency(pendingBillAmount)}
          </p>
          <Link className="customer-billing-link" href="/customer/payments">
            Periksa rincian biaya terbaru
          </Link>
          <span aria-hidden="true" className="customer-billing-underline" />
        </article>
      </section>

      <div className="customer-dashboard-bottom">
        <section
          aria-labelledby="customer-latest-activity-title"
          className="customer-activity-card"
        >
          <div className="customer-activity-heading">
            <h2 id="customer-latest-activity-title">
              Aktivitas servis terbaru
            </h2>
            <Image
              alt=""
              height={20}
              src="/figma-assets/customer-dashboard-registration.svg"
              width={20}
            />
          </div>
          {latestService ? (
            <>
              <h3>
                {latestService.kendaraan.merek}{" "}
                {latestService.kendaraan.tipe_kendaraan}{" "}
                {latestService.kendaraan.tahun_kendaraan} •{" "}
                {latestService.kendaraan.nomor_plat}
              </h3>
              <span className="customer-service-chip">
                <Image
                  alt=""
                  height={6}
                  src="/figma-assets/customer-status-dot.svg"
                  width={6}
                />
                {latestStatusLabel}
              </span>
              <p className="customer-activity-description">
                {latestService.keluhan} • Masuk{" "}
                {formatDate(latestService.tanggal_daftar)}
              </p>
              <p className="customer-activity-detail">
                {(latestService.kebutuhan_servis ??
                  latestService.hasil_pemeriksaan ??
                  `Status servis: ${latestService.status_servis}.`).replace(/^\[|\]$/g, "")}
              </p>
              <Link
                className="customer-activity-action"
                href="/customer/service-status"
              >
                Lihat status servis
              </Link>
              {latestService.perlu_pembayaran && (
                <Link
                  className="customer-activity-action customer-activity-pay"
                  href={`/customer/payments?serviceId=${latestService.id_servis}`}
                >
                  Bayar sekarang
                </Link>
              )}
            </>
          ) : (
            <div className="customer-activity-empty">
              <h3>Belum ada aktivitas servis</h3>
              <p>Aktivitas servis kendaraan Anda akan muncul di sini.</p>
              <Link
                className="customer-activity-action"
                href="/customer/service-registration"
              >
                Daftar servis
              </Link>
            </div>
          )}
        </section>

        <section
          aria-labelledby="customer-main-menu-title"
          className="customer-main-menu-card"
        >
          <h2 id="customer-main-menu-title">Menu utama</h2>
          <Link href="/customer/vehicles">
            <Image
              alt=""
              height={20}
              src="/figma-assets/customer-dashboard-car.svg"
              width={20}
            />
            Data Kendaraan
          </Link>
          <Link href="/customer/service-registration">
            <Image
              alt=""
              height={20}
              src="/figma-assets/customer-dashboard-registration.svg"
              width={20}
            />
            Pendaftaran Servis
          </Link>
          <Link href="/customer/service-status">
            <Image
              alt=""
              height={20}
              src="/figma-assets/customer-dashboard-status.svg"
              width={20}
            />
            Status Servis
          </Link>
          <Link href="/customer/payments">
            <Image
              alt=""
              height={20}
              src="/figma-assets/customer-dashboard-cost.svg"
              width={20}
            />
            Biaya &amp; Pembayaran
          </Link>
          <LogoutMenuItem name={name} />
        </section>
      </div>
    </div>
  );
}

function LogoutMenuItem({ name }: { name: string }) {
  return (
    <div className="customer-dashboard-logout-row">
      <Image
        alt=""
        height={20}
        src="/figma-assets/customer-dashboard-logout.svg"
        width={20}
      />
      <LogoutAction
        className="customer-dashboard-logout"
        label="Logout"
        name={name}
      />
    </div>
  );
}
