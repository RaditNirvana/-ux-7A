"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import LogoutAction from "@/components/customer/LogoutAction";

type ServiceAdvisorAppShellProps = {
  name: string;
  children: ReactNode;
};

const navigation = [
  { href: "/sa/dashboard", label: "Dashboard", icon: "/figma-assets/customer-menu-dashboard.svg" },
  { href: "/sa/pendaftaran-servis", label: "Pendaftaran Servis", icon: "/figma-assets/customer-menu-registration.svg" },
  { href: "/sa/proses-servis", label: "Proses Servis", icon: "/figma-assets/customer-menu-status.svg" },
  { href: "/sa/penugasan-mekanik", label: "Penugasan Mekanik", icon: "/figma-assets/customer-menu-car.svg" },
  { href: "/sa/pemeriksaan-servis", label: "Pemeriksaan Servis", icon: "/figma-assets/customer-menu-status.svg" },
  { href: "/sa/sparepart", label: "Sparepart", icon: "/figma-assets/customer-menu-cost.svg" },
  { href: "/sa/pemesanan-sparepart", label: "Pemesanan Sparepart", icon: "/figma-assets/customer-menu-cost.svg" },
  { href: "/sa/penggunaan-sparepart", label: "Penggunaan Sparepart", icon: "/figma-assets/customer-menu-cost.svg" },
  { href: "/sa/rincian-biaya", label: "Rincian Biaya", icon: "/figma-assets/customer-menu-cost.svg" },
];

export default function ServiceAdvisorAppShell({
  name,
  children,
}: ServiceAdvisorAppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!menuOpen) {
      if (wasOpen.current) {
        triggerRef.current?.focus();
      }
      wasOpen.current = false;
      return;
    }

    wasOpen.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLElement>("button, a")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[#f5f5fb] text-slate-900">
      <header className="relative z-20 flex h-[74px] items-center justify-between border-b border-slate-200 bg-white px-4 shadow-[0_2px_12px_rgba(15,23,42,0.06)] sm:px-6">
        <button
          aria-controls="sa-sidebar"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          className="relative inline-flex h-14 w-14 items-center justify-center rounded-lg border border-transparent bg-[#0b218e] text-white shadow-[0_4px_12px_rgba(11,33,142,0.2)] transition hover:bg-[#091d74] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]"
          onClick={() => setMenuOpen((open) => !open)}
          ref={triggerRef}
          type="button"
        >
          <Image alt="" height={20} src="/figma-assets/customer-hamburger.svg" width={20} />
        </button>

        <Link className="ml-2 mr-auto text-[18px] font-bold tracking-[0.06em] text-slate-900" href="/sa/dashboard">
          MITRA JAYA SERVICE
        </Link>

        <div className="hidden items-center gap-6 text-[12px] text-slate-600 sm:flex">
          <a className="font-medium text-slate-700 hover:text-[#0b218e]" href="tel:0215550148">
            Bantuan • 021 555 0148
          </a>
          <span className="text-[14px] font-semibold text-slate-900">{name}</span>
        </div>
      </header>

      <div className="fixed left-0 top-[74px] z-10 hidden h-[calc(100vh-74px)] w-16 border-r border-white/10 bg-[#101c5c] lg:block" aria-hidden="true" />

      <main className="min-h-[calc(100vh-74px)] lg:ml-16">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>

      <div
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-40 bg-slate-900/35 transition-opacity duration-200 ${menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setMenuOpen(false);
          }
        }}
      />

      <nav
        aria-hidden={!menuOpen}
        aria-label="Menu navigasi service advisor"
        aria-modal={menuOpen || undefined}
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] transform bg-[#111a5c] text-white shadow-[12px_0_36px_rgba(15,23,42,0.2)] transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        id="sa-sidebar"
        inert={!menuOpen}
        onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setMenuOpen(false);
          }
        }}
        ref={menuRef}
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <button
            aria-label="Tutup menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <Image alt="" height={18} src="/figma-assets/customer-hamburger.svg" width={18} />
          </button>
          <span className="text-[11px] font-bold tracking-[0.12em] text-white/90">MITRA JAYA SERVICE</span>
        </div>

        <div className="space-y-2 px-3 pb-4 pt-5">
          {navigation.map((item) => (
            <Link
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition ${isActive(item.href) ? "bg-white/12 text-white" : "text-white/80 hover:bg-white/8 hover:text-white"}`}
              href={item.href}
              key={item.href}
              onClick={() => setMenuOpen(false)}
            >
              <Image alt="" height={18} src={item.icon} width={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-auto border-t border-white/10 p-3">
          <LogoutAction
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium text-white/80 transition hover:bg-white/8 hover:text-white disabled:opacity-60"
            icon="/figma-assets/customer-menu-logout.svg"
            label="Keluar"
            name={name}
            onLoggedOut={() => setMenuOpen(false)}
          />
        </div>
      </nav>
    </div>
  );
}
