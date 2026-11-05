"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/auth";

type AuthDashboardProps = {
  name: string;
  role: UserRole;
};

export default function AuthDashboard({ name, role }: AuthDashboardProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  async function logout() {
    setIsLoggingOut(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        setErrorMessage("Logout belum dapat diproses. Silakan coba kembali.");
        setIsLoggingOut(false);
        return;
      }

      router.replace(
        `/login/${role.toLowerCase().replaceAll(" ", "-")}`,
      );
    } catch {
      setErrorMessage("Logout belum dapat diproses. Periksa koneksi Anda.");
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-card">
        <Link className="dashboard-brand" href="/">
          Mitra Jaya Servis
        </Link>
        <p className="dashboard-eyebrow">DASHBOARD {role.toUpperCase()}</p>
        <h1>Selamat datang, {name}</h1>
        <p>
          Anda masuk sebagai <strong>{role}</strong>.
        </p>
        {errorMessage && (
          <p className="auth-error" role="alert">
            {errorMessage}
          </p>
        )}
        <button
          className="dashboard-logout"
          disabled={isLoggingOut}
          onClick={logout}
          type="button"
        >
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </button>
      </section>
    </main>
  );
}
