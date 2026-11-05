import Link from "next/link";
import type { CustomerVehicle } from "@/components/customer/types";

export default function VehicleSelection({
  vehicles,
  selectedId,
}: {
  vehicles: CustomerVehicle[];
  selectedId?: string;
}) {
  const selectedVehicle = vehicles.find(
    (vehicle) => vehicle.id_kendaraan === selectedId,
  );

  if (selectedVehicle) {
    return (
      <div className="customer-page-content">
        <p className="customer-eyebrow">AREA CUSTOMER</p>
        <h1 className="customer-page-title">Pendaftaran servis</h1>
        <section className="customer-empty-panel">
          <h2>Kendaraan dipilih</h2>
          <p>
            {selectedVehicle.merek} {selectedVehicle.tipe_kendaraan} •{" "}
            {selectedVehicle.nomor_plat}
          </p>
          <p>Formulir pendaftaran servis belum tersedia.</p>
          <Link
            className="customer-outline-button"
            href="/customer/service-registration"
          >
            Pilih kendaraan lain
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="customer-page-content">
      <p className="customer-eyebrow">AREA CUSTOMER</p>
      <h1 className="customer-page-title">Pilih kendaraan servis</h1>
      {vehicles.length > 0 ? (
        <div className="customer-selection-list">
          {vehicles.map((vehicle) => (
            <article
              className="customer-selection-card"
              key={vehicle.id_kendaraan}
            >
              <div>
                <h2>Kendaraan terdaftar</h2>
                <h3>
                  {vehicle.merek} {vehicle.tipe_kendaraan} •{" "}
                  {vehicle.nomor_plat}
                </h3>
                <p>
                  {vehicle.tahun_kendaraan} •{" "}
                  {vehicle.nomor_rangka || "Nomor rangka belum diisi"}
                </p>
              </div>
              <Link
                className="customer-primary-button"
                href={`/customer/service-registration?vehicle=${encodeURIComponent(vehicle.id_kendaraan)}`}
              >
                Gunakan kendaraan ini
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <section className="customer-selection-card customer-selection-empty">
          <div>
            <h2>Belum ada kendaraan Anda?</h2>
            <p>
              Simpan data kendaraan terlebih dahulu sebelum mendaftar servis.
            </p>
          </div>
          <Link
            className="customer-outline-button"
            href="/customer/vehicles"
          >
            Tambah kendaraan
          </Link>
        </section>
      )}
      <Link
        className="customer-outline-button customer-selection-back"
        href="/customer/dashboard"
      >
        Kembali
      </Link>
    </div>
  );
}
