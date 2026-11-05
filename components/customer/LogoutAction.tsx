"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type LogoutActionProps = {
  name: string;
  className: string;
  icon?: string;
  label?: string;
  onLoggedOut?: () => void;
};

export default function LogoutAction({
  name,
  className,
  icon,
  label = "Keluar",
  onLoggedOut,
}: LogoutActionProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  const portalRoot =
    typeof document === "undefined" ? null : document.body;

  useEffect(() => {
    if (!loggedOut) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [loggedOut]);

  async function logout() {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        setErrorMessage("Logout belum dapat diproses. Silakan coba kembali.");
        return;
      }

      onLoggedOut?.();
      setLoggedOut(true);
    } catch {
      setErrorMessage("Logout belum dapat diproses. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        className={className}
        disabled={isSubmitting}
        onClick={logout}
        type="button"
      >
        {icon && <Image alt="" height={19} src={icon} width={19} />}
        <span>{isSubmitting ? `${label}...` : label}</span>
      </button>
      {errorMessage && (
        <span className="customer-logout-error" role="alert">
          {errorMessage}
        </span>
      )}
      {loggedOut &&
        portalRoot &&
        createPortal(
          <main className="customer-logout-screen">
            <Link className="customer-logout-brand" href="/">
              MITRA JAYA SERVICE
            </Link>
            <section
              aria-labelledby="customer-logout-title"
              aria-modal="true"
              className="customer-logout-card"
              role="dialog"
            >
              <h1 id="customer-logout-title">Sampai jumpa, {name}!</h1>
              <p>
                Sesi Anda sudah diakhiri. Semoga perjalanan menyenangkan.
              </p>
              <Link className="customer-logout-home" href="/">
                Kembali ke halaman utama
              </Link>
              <p className="customer-logout-help">Bantuan: 021 555 0148</p>
            </section>
          </main>,
          portalRoot,
        )}
    </>
  );
}
