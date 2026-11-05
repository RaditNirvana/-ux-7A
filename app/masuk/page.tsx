import Image from "next/image";
import Link from "next/link";

const roles = [
  {
    name: "Customer",
    description: "Daftar servis, ambil antrian, dan pantau status kendaraan",
    href: "/login/customer",
    icon: "/figma-assets/role-user.png",
    row: "top",
  },
  {
    name: "Kasir",
    description: "Kelola pembayaran dan serah terima kendaraan",
    href: "/login/kasir",
    icon: "/figma-assets/role-cash-machine.png",
    row: "top",
  },
  {
    name: "Service Advisor",
    description: "Catat keluhan, susun rincian servis, dan konfirmasi biaya",
    href: "/login/service-advisor",
    icon: "/figma-assets/role-checklist.png",
    row: "top",
  },
  {
    name: "Mekanik",
    description: "Kerjakan servis dan perbarui status pengerjaan",
    href: "/login/mekanik",
    icon: "/figma-assets/role-wrench.png",
    row: "bottom",
  },
  {
    name: "Owner",
    description: "Pantau laporan, pendapatan, dan operasional bengkel",
    href: "/login/owner",
    icon: "/figma-assets/role-owner-monitor.png",
    row: "bottom",
  },
];

function RoleCard({
  name,
  description,
  href,
  icon,
  row,
}: (typeof roles)[number]) {
  return (
    <Link
      className={`role-card role-card--${row} group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-gradient-to-br hover:from-[#0515FA] hover:to-[#A5ADFF] hover:shadow-xl`}
      href={href}
      aria-label={`Masuk sebagai ${name}`}
    >
      <Image
        className="role-card__circle transition-all duration-300 ease-out group-hover:brightness-0 group-hover:invert"
        src="/figma-assets/role-icon-circle.svg"
        alt=""
        width={55}
        height={55}
      />
      <Image
        className="role-card__icon"
        src={icon}
        alt=""
        width={40}
        height={40}
      />
      <h2 className="transition-colors duration-300 ease-out group-hover:text-white">
        {name}
      </h2>
      <p className="transition-colors duration-300 ease-out group-hover:text-white">
        {description}
      </p>
      <span className="role-card__button transition-colors duration-300 ease-out group-hover:bg-white">
        <span>Masuk</span>
        <Image
          src="/figma-assets/role-arrow-right.svg"
          alt=""
          width={32}
          height={28}
        />
      </span>
    </Link>
  );
}

export default function MasukPage() {
  return (
    <main className="role-selector">
      <Link className="role-selector__logo" href="/" aria-label="Beranda">
        <Image
          src="/figma-assets/landing-logo-blue.png"
          alt=""
          width={67}
          height={67}
          priority
        />
      </Link>
      <h1 className="role-selector__title">MITRA JAYA SERVIS</h1>
      <h2 className="role-selector__welcome">Selamat Datang</h2>
      <p className="role-selector__subtitle">
        Silahkan pilih untuk melanjutkan
      </p>
      <div className="role-selector__cards">
        <div className="role-row role-row--top">
          {roles
            .filter((role) => role.row === "top")
            .map((role) => (
              <RoleCard key={role.name} {...role} />
            ))}
        </div>
        <div className="role-row role-row--bottom">
          {roles
            .filter((role) => role.row === "bottom")
            .map((role) => (
              <RoleCard key={role.name} {...role} />
            ))}
        </div>
      </div>
    </main>
  );
}
