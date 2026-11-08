"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AUTH_ROLES, ROLE_SLUGS, type UserRole } from "@/lib/auth";

type AuthLoginFormProps = {
  role: UserRole;
  roleSlug: string;
  showRegisteredMessage: boolean;
};

const roleLabels: Record<UserRole, string> = {
  Customer: "Customer",
  "Service Advisor": "Service Advisor",
  Mekanik: "Mekanik",
  Owner: "Owner",
  Kasir: "Kasir",
};

export default function AuthLoginForm({
  role,
  roleSlug,
  showRegisteredMessage,
}: AuthLoginFormProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
          role,
        }),
      });

      const result: { message?: string; redirect?: string } =
        await response.json();

      if (!response.ok || !result.redirect) {
        setErrorMessage(
          response.status === 401
            ? "Login Gagal. Username atau kata sandi belum sesuai."
            : result.message ?? "Login belum dapat diproses. Silakan coba kembali.",
        );
        return;
      }

      router.push(result.redirect);
    } catch {
      setErrorMessage("Login belum dapat diproses. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel auth-panel--brand">
        <Link
          className="auth-brand"
          href="/"
          aria-label="Mitra Jaya Servis, beranda"
        >
          <Image
            src="/figma-assets/logo-white.png"
            alt=""
            width={42}
            height={28}
            priority
          />
          <span>Mitra Jaya Servis</span>
        </Link>
        <div className="auth-brand-copy">
          <span className="auth-role-badge">AKSES {role.toUpperCase()}</span>
          <h1>
            Semua urusan
            <br />
            bengkel, satu pintu.
          </h1>
          <p> Pantau kendaraan dan servis tanpa harus bolak-balik menelepon.</p>
        </div>
        <p className="auth-brand-footer">
          BENGKEL UMUM • TERPERCAYA • TRANSPARAN
        </p>
      </section>

      <section className="auth-panel auth-panel--form">
        <div className="auth-content">
          <h2>Selamat datang kembali</h2>
          <p className="auth-intro">
            Masuk dengan ID pengguna atau email Anda.
          </p>

          {showRegisteredMessage && (
            <p className="auth-success" role="status">
              Pendaftaran berhasil. Silakan masuk dengan email dan kata sandi
              Anda.
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>ID pengguna / email</span>
              <input
                autoComplete="username"
                maxLength={50}
                name="username"
                placeholder="nama@email.com"
                required
              />
            </label>

            <label className="auth-field">
              <span>Kata sandi</span>
              <input
                autoComplete="current-password"
                maxLength={72}
                name="password"
                placeholder="Masukkan password"
                required
                type="password"
              />
            </label>

            <a className="auth-forgot-link" href="#bantuan">
              Lupa kata sandi?
            </a>

            <button className="auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Memeriksa..." : "Masuk ke dashboard"}
            </button>
          </form>

          {errorMessage && (
            <p className="auth-error" role="alert">
              {errorMessage}
            </p>
          )}

          {role === "Customer" && (
            <div className="auth-signup">
              <p>Anda pelanggan baru?</p>
              <Link href="/register">Daftar akun</Link>
            </div>
          )}

          <nav className="auth-role-links" aria-label="Masuk dengan peran lain">
            <span>Masuk sebagai:</span>
            {AUTH_ROLES.map((loginRole) => {
              const slug = ROLE_SLUGS[loginRole];

              return (
              <Link
                aria-current={slug === roleSlug ? "page" : undefined}
                href={`/login/${slug}`}
                key={slug}
              >
                  {roleLabels[loginRole]}
              </Link>
              );
            })}
          </nav>
        </div>
      </section>
    </main>
  );
}
