"use client";

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
  { href: "/sa/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/sa/verifikasi", label: "Pendaftaran Service", icon: "registration" },
  { href: "/sa/penugasan", label: "Penugasan Mekanik", icon: "mechanic" },
  { href: "/sa/hasil-pemeriksaan", label: "Hasil dan Kebutuhan Service", icon: "inspection" },
  { href: "/sa/stok-sparepart", label: "Stok Sparepart", icon: "stock" },
  { href: "/sa/pemesanan-sparepart", label: "Pemesanan Sparepart", icon: "orders" },
  { href: "/sa/status-servis", label: "Status Servis", icon: "status" },
];

function HamburgerIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="28"
      viewBox="0 0 28 28"
      width="28"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 6.5h22M3 14h22M3 21.5h22"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

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

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setMenuOpen(false);
      return;
    }

    if (event.key !== "Tab" || !menuRef.current) {
      return;
    }

    const focusable = Array.from(
      menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      ),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-[var(--sa-canvas)] text-slate-900 antialiased">
      <main className="relative h-screen overflow-y-auto overflow-x-hidden">
          <button
            aria-controls="sa-sidebar"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          className="sa-menu-trigger sa-menu-trigger--page"
            onClick={() => setMenuOpen((open) => !open)}
            ref={triggerRef}
            type="button"
          >
            <HamburgerIcon />
          </button>
        <div className="ml-[240px] mr-[40px] w-[calc(100%-280px)] max-w-[1160px] pb-5 pt-6">
          {children}
        </div>
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

      <aside
        aria-hidden={!menuOpen}
        aria-label="Menu navigasi service advisor"
        aria-modal={menuOpen || undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-[220px] max-w-[85vw] transform flex-col overflow-y-auto bg-[var(--sa-sidebar-background)] text-[var(--sa-sidebar-text)] shadow-[12px_0_36px_rgba(15,23,42,0.18)] transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        id="sa-sidebar"
        inert={!menuOpen}
        onKeyDown={handleMenuKeyDown}
        ref={menuRef}
        role="dialog"
      >
        <div className="border-b border-[var(--sa-sidebar-separator)]">
          <div className="flex items-center px-[18px] pb-[10px] pt-[18px]">
            <button
              aria-label="Tutup menu"
              className="sa-menu-trigger size-7"
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              <HamburgerIcon />
            </button>
          </div>
          <div className="flex items-center gap-[10px] px-[18px] pb-[20px]">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[20px] bg-[var(--sa-sidebar-accent)] text-[22px] font-bold text-white">
              K
            </div>
            <div className="leading-[normal]">
              <div className="text-[13px] font-bold tracking-[-0.26px] text-[var(--sa-sidebar-ink)]">Mitra Jaya</div>
              <div className="text-[11px] font-medium tracking-[-0.22px] text-[var(--sa-sidebar-accent)]">Service</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-[2px] px-[10px] pb-[8px] pt-[19px]" aria-label="Sidebar navigasi service advisor">
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className="sa-sidebar-link"
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                <span aria-hidden="true" className="sa-sidebar-icon" data-sa-icon={item.icon} />
                <span>{item.icon === "inspection" ? <>Hasil dan Kebutuhan<br />Service</> : item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-[14px] mb-[10px] mt-auto border-b border-[var(--sa-sidebar-separator)] pb-1">
          <LogoutAction
            className="flex h-6 w-full items-center pl-[54px] text-left text-[16px] font-semibold text-[var(--sa-sidebar-text)] transition-colors hover:text-[var(--sa-sidebar-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sa-sidebar-accent)]"
            label="Keluar"
            name={name}
            onLoggedOut={() => setMenuOpen(false)}
            variant="service-advisor"
          />
        </div>
      </aside>
    </div>
  );
}
