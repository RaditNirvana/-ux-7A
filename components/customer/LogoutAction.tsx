"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { TransientNotice } from "@/components/notifications/TransientNotice";

type LogoutActionProps = {
  name: string;
  className: string;
  icon?: string;
  label?: string;
  onLoggedOut?: () => void;
  variant?: "default" | "service-advisor";
};

export default function LogoutAction({
  name,
  className,
  icon,
  label = "Keluar",
  onLoggedOut,
  variant = "default",
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
        <TransientNotice as="span" className="customer-logout-error" onDismiss={() => setErrorMessage("")} role="alert">
          {errorMessage}
        </TransientNotice>
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
                {variant === "service-advisor"
                  ? "Sesi Anda sudah diakhiri."
                  : "Sesi Anda sudah diakhiri. Semoga perjalanan menyenangkan."}
              </p>
              <Link className="customer-logout-home" href="/">
                Kembali ke halaman utama
              </Link>
              {variant === "default" ? (
                <p className="customer-logout-help">Bantuan: 021 555 0148</p>
              ) : null}
            </section>
          </main>,
          portalRoot,
        )}
    </>
  );
}
