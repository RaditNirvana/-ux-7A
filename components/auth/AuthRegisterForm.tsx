"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AuthRegisterForm() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const year = Number(formData.get("tahun_kendaraan"));

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: formData.get("nama"),
          no_hp: formData.get("no_hp"),
          email: formData.get("email"),
          password: formData.get("password"),
          merek: formData.get("merek"),
          tipe_kendaraan: formData.get("tipe_kendaraan"),
          tahun_kendaraan: year,
          nomor_plat: formData.get("nomor_plat"),
          nomor_rangka: formData.get("nomor_rangka"),
        }),
      });

      const result: { message?: string; redirect?: string } =
        await response.json();

      if (!response.ok || !result.redirect) {
        setErrorMessage(
          result.message ?? "Pendaftaran belum dapat diproses. Silakan coba kembali.",
        );
        return;
      }

      router.push(result.redirect);
    } catch {
      setErrorMessage("Pendaftaran belum dapat diproses. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="register-page">
      <header className="register-header">
        <Link className="register-brand" href="/">
          <Image
            src="/figma-assets/logo-white.png"
            alt=""
            width={32}
            height={22}
            priority
          />
          Mitra Jaya Service
        </Link>
        <span>Bantuan&nbsp; • &nbsp;0821 2312 312</span>
      </header>

      <div className="register-content">
        <h1>Daftar sebagai customer</h1>
        <p className="register-subtitle">
          Lengkapi data akun dan kendaraan Anda.
        </p>

        <form className="register-form" onSubmit={handleSubmit}>
          <section className="register-card">
            <h2>Data pengguna</h2>
            <div className="register-fields">
              <label className="register-field">
                <span>Nama lengkap</span>
                <input
                  autoComplete="name"
                  maxLength={100}
                  name="nama"
                  placeholder="Nama lengkap"
                  required
                />
              </label>
              <label className="register-field">
                <span>Nomor telepon</span>
                <input
                  autoComplete="tel"
                  maxLength={15}
                  name="no_hp"
                  placeholder="08xx xxxx xxxx"
                  required
                  type="tel"
                />
              </label>
              <label className="register-field register-field--wide">
                <span>Email / username</span>
                <input
                  autoComplete="email"
                  maxLength={50}
                  name="email"
                  placeholder="nama@email.com"
                  required
                  type="email"
                />
              </label>
              <label className="register-field register-field--wide">
                <span>Kata sandi</span>
                <input
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  name="password"
                  placeholder="Minimal 8 karakter"
                  required
                  type="password"
                />
              </label>
              <p className="register-hint">
                Email Anda akan digunakan sebagai username untuk masuk.
              </p>
            </div>
          </section>

          <section className="register-card register-card--vehicle">
            <h2>Data kendaraan pertama</h2>
            <div className="register-fields">
              <label className="register-field">
                <span>Merek</span>
                <input
                  maxLength={50}
                  name="merek"
                  placeholder="Honda"
                  required
                />
              </label>
              <label className="register-field">
                <span>Tipe / model</span>
                <input
                  maxLength={50}
                  name="tipe_kendaraan"
                  placeholder="Brio Satya"
                  required
                />
              </label>
              <label className="register-field">
                <span>Tahun</span>
                <input
                  max={2100}
                  min={1980}
                  name="tahun_kendaraan"
                  placeholder="2021"
                  required
                  type="number"
                />
              </label>
              <label className="register-field">
                <span>Nomor pelat</span>
                <input
                  autoCapitalize="characters"
                  maxLength={15}
                  name="nomor_plat"
                  placeholder="B 1234 XYZ"
                  required
                />
              </label>
              <label className="register-field register-field--wide">
                <span>Nomor rangka (opsional)</span>
                <input
                  maxLength={30}
                  name="nomor_rangka"
                  placeholder="Nomor rangka kendaraan"
                />
              </label>
            </div>

            {errorMessage && (
              <p className="register-error" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              className="register-submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Mengirim..." : "Kirim formulir pendaftaran"}
            </button>
          </section>
        </form>

        <Link className="register-login-link" href="/login/customer">
          Sudah punya akun? Masuk ke portal customer.
        </Link>
      </div>
    </main>
  );
}
