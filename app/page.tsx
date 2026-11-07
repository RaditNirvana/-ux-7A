import Image from "next/image";
import Link from "next/link";

const services = [
  {
    name: "Ganti Oli dan Filter",
    description:
      "Penggantian oli mesin, filter oli, dan filter udara sesuai jadwal.",
    icon: "/figma-assets/landing-oil-can.png",
    circle: "/figma-assets/landing-oil-circle.svg",
  },
  {
    name: "Servis Berkala",
    description:
      "Pemeriksaan menyeluruh kendaraan sesuai kilometer pemakaian.",
    icon: "/figma-assets/landing-wrench.png",
    circle: "/figma-assets/landing-service-circle.svg",
  },
  {
    name: "Kelistrikan dan AC",
    description:
      "Perbaikan aki, lampu, klakson, dan pengisian freon AC.",
    icon: "/figma-assets/landing-accumulator.png",
    circle: "/figma-assets/landing-service-circle.svg",
  },
  {
    name: "Rem dan Suspensi",
    description:
      "Perbaikan kampas rem, minyak rem, dan shockbreaker.",
    icon: "/figma-assets/landing-brake.png",
    circle: "/figma-assets/landing-service-circle.svg",
  },
];

const steps = [
  {
    name: "Daftar Servis Online",
    description: "Isi data kendaraan dan keluhan lewat akun Anda.",
  },
  {
    name: "Terima Nomor Antrian",
    description: "Dapatkan nomor antrian dan perkiraan waktu tunggu.",
  },
  {
    name: "Pemeriksaan & Persetujuan Biaya",
    description: "Mekanik memeriksa, lalu Anda menyetujui rincian biaya.",
  },
  {
    name: "Bayar & Ambil Kendaraan",
    description: "Lakukan pembayaran, pantau status, lalu ambil kendaraan.",
  },
];

function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="landing-brand" href="#home" aria-label="Mitra Jaya Servis, beranda">
          <Image
            src="/figma-assets/landing-logo-blue.png"
            alt=""
            width={67}
            height={67}
            priority
          />
          <span>Mitra Jaya Servis</span>
        </a>
        <nav className="main-nav" aria-label="Navigasi utama">
          <a
            className="nav-link nav-link--home cursor-pointer drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-all duration-300 ease-out hover:bg-[#0515FA] hover:font-semibold hover:text-white"
            href="#home"
          >
            Beranda
          </a>
          <a
            className="nav-link cursor-pointer transition-all duration-300 ease-out hover:bg-[#0515FA] hover:font-semibold hover:text-white"
            href="#layanan"
          >
            Layanan
          </a>
          <a
            className="nav-link cursor-pointer transition-all duration-300 ease-out hover:bg-[#0515FA] hover:font-semibold hover:text-white"
            href="#cara-kerja"
          >
            Cara Kerja
          </a>
          <a
            className="nav-link cursor-pointer transition-all duration-300 ease-out hover:bg-[#0515FA] hover:font-semibold hover:text-white"
            href="#kontak"
          >
            Kontak
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="home">
      <Header />
      <div className="hero__inner">
        <div className="hero-copy">
          <h1>Servis Kendaraan Lebih Mudah dan Transparan</h1>
          <p>
            Daftar servis secara online, pantau antrian dan status pengerjaan,
            serta lihat rincian biaya sebelum servis dikerjakan.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <Image
            src="/figma-assets/landing-tools-3d.png"
            alt=""
            fill
            priority
            sizes="(max-width: 720px) 90vw, 40vw"
          />
        </div>
        <Link
          className="login-button cursor-pointer transition-all duration-300 ease-out hover:bg-[#0515FA] hover:font-bold hover:text-white"
          href="/masuk"
        >
          Masuk
        </Link>
      </div>
    </section>
  );
}

function ServiceCard({
  name,
  description,
  icon,
  circle,
}: {
  name: string;
  description: string;
  icon: string;
  circle: string;
}) {
  return (
    <article className="service-card group transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-gradient-to-br hover:from-[#0515FA] hover:to-[#A5ADFF] hover:shadow-xl">
      <div className="service-card__icon">
        <Image
          className="service-card__circle transition-all duration-300 ease-out group-hover:brightness-0 group-hover:invert"
          src={circle}
          alt=""
          fill
          sizes="85px"
        />
        <Image
          className="service-card__symbol"
          src={icon}
          alt=""
          fill
          sizes="65px"
        />
      </div>
      <h3 className="transition-all duration-300 ease-out group-hover:-translate-y-5 group-hover:text-white">
        {name}
      </h3>
      <p className="service-card__description transition-all duration-300 ease-out group-hover:opacity-100">
        {description}
      </p>
    </article>
  );
}

function Services() {
  return (
    <section className="services" id="layanan">
      <div className="services__inner">
        <header className="section-heading">
          <h2>Layanan Kami</h2>
          <p>Berbagai layanan servis untuk mobil dan motor Anda.</p>
        </header>
        <div className="service-grid">
          {services.map((service) => (
            <ServiceCard key={service.name} {...service} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section className="workflow" id="cara-kerja">
      <div className="workflow__inner">
        <header className="section-heading section-heading--light">
          <h2>Bagaimana Cara Kerja Layanan Kami?</h2>
          <p>
            Empat langkah sederhana untuk membuat servis kendaraan Anda lebih
            teratur dan mudah dipantau.
          </p>
        </header>
        <div className="workflow-list">
          {steps.map((step, index) => (
          <div className="workflow-item" key={step.name}>
            <article className="workflow-card group transition-all duration-300 ease-out hover:bg-gradient-to-b hover:from-[#333333] hover:to-black hover:shadow-xl">
              <h3 className="transition-all duration-300 ease-out group-hover:-translate-y-4 group-hover:text-white">
                {step.name}
              </h3>
              <p className="workflow-card__description transition-all duration-300 ease-out group-hover:opacity-100">
                {step.description}
              </p>
            </article>
            {index < steps.length - 1 && (
                <Image
                  className="workflow-arrow"
                  src="/figma-assets/landing-arrow-right.svg"
                  alt=""
                  width={53}
                  height={42}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="contact-row">
      <Image src={icon} alt="" width={20} height={20} />
      <span>{children}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer" id="kontak">
      <div className="site-footer__inner">
        <h2>Ada Pertanyaan? Hubungi Kami</h2>
        <div className="footer-columns">
          <section className="footer-contact" aria-labelledby="contact-title">
            <h3 id="contact-title">Kontak</h3>
            <ContactRow icon="/figma-assets/landing-map-location.svg">
              Jl. Kp. Kalawi No. Kel. 32, Kec. Kuranji, Kota Padang, Sumatera
              Barat 25172
            </ContactRow>
            <ContactRow icon="/figma-assets/landing-phone.svg">
              08212312312
            </ContactRow>
            <ContactRow icon="/figma-assets/landing-envelope.svg">
              MitraJaya@gmail.com
            </ContactRow>
          </section>
          <section className="footer-social" aria-labelledby="social-title">
            <h3 id="social-title">Sosial Media</h3>
            <div className="social-row" role="group" aria-label="Media sosial">
              <a href="#kontak" aria-label="Instagram">
                <Image
                  src="/figma-assets/landing-social-instagram.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              </a>
              <a href="#kontak" aria-label="Facebook">
                <Image
                  src="/figma-assets/landing-social-facebook.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              </a>
              <a href="#kontak" aria-label="Twitter">
                <Image
                  src="/figma-assets/landing-social-twitter.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              </a>
              <span>Mitra Jaya Servis</span>
            </div>
            <div className="footer-brand">
              <Image
                src="/figma-assets/landing-logo-white.png"
                alt=""
                width={59}
                height={39}
              />
              <span>Mitra Jaya Servis</span>
            </div>
          </section>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className="landing-page">
      <Hero />
      <Services />
      <Workflow />
      <Footer />
    </main>
  );
}
