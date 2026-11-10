"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import LogoutAction from "@/components/customer/LogoutAction";

const items = [
  ["/kasir/dashboard", "Dashboard", "⌂"],
  ["/kasir/rincian-biaya", "Rincian Biaya Servis", "▤"],
  ["/kasir/pembayaran", "Pembayaran", "▣"],
  ["/kasir/akun", "Kelola Akun Pengguna", "♙"],
];

export default function KasirAppShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  useEffect(() => {
    if (!menuOpen) {
      if (wasOpen.current) triggerRef.current?.focus();
      wasOpen.current = false;
      return;
    }

    wasOpen.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setMenuOpen(false);
      return;
    }

    if (event.key !== "Tab" || !menuRef.current) return;
    const focusable = Array.from(menuRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
    const first = focusable[0];
    const last = focusable.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className={`kasir-shell${menuOpen ? " is-menu-open" : ""}`}>
      <div className="kasir-main">
        <header className="kasir-header">
          <strong>Mitra Jaya Service</strong>
          <span className="kasir-header-avatar">{initials}</span>
        </header>
        <main className={`kasir-content${pathname === "/kasir/dashboard" ? " kasir-dashboard-content" : ""}`}>
          {children}
        </main>
      </div>

      <button
        aria-controls="kasir-sidebar"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
        className="kasir-menu-trigger"
        onClick={() => setMenuOpen((open) => !open)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
      </button>

      <div
        aria-hidden={!menuOpen}
        className={`kasir-sidebar-backdrop${menuOpen ? " is-open" : ""}`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setMenuOpen(false);
        }}
      />

      <aside
        aria-hidden={!menuOpen}
        aria-label="Menu navigasi Kasir"
        aria-modal={menuOpen || undefined}
        className={`kasir-sidebar${menuOpen ? " is-open" : ""}`}
        id="kasir-sidebar"
        inert={!menuOpen}
        onKeyDown={handleMenuKeyDown}
        ref={menuRef}
        role="dialog"
      >
        <div className="kasir-profile">
          <span className="kasir-avatar">{initials}</span>
          <span className="kasir-profile-copy"><b>{name}</b><small>Kasir</small></span>
        </div>
        <nav aria-label="Menu Kasir">
          {items.map(([href, label, icon]) => {
            const active = pathname === href
              || (href !== "/kasir/dashboard" && pathname.startsWith(`${href}/`))
              || (href === "/kasir/pembayaran" && pathname.startsWith("/kasir/transaksi/"));
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={active ? "kasir-nav-item active" : "kasir-nav-item"}
                href={href}
                key={href}
                onClick={() => setMenuOpen(false)}
              >
                <span aria-hidden="true">{icon}</span><b>{label}</b>
              </Link>
            );
          })}
        </nav>
        <div className="kasir-logout">
          <LogoutAction className="kasir-logout-button" label="Keluar" name={name} variant="service-advisor" onLoggedOut={() => setMenuOpen(false)} />
        </div>
      </aside>
    </div>
  );
}
