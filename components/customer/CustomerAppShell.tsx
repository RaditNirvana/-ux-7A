"use client";

import Image from "next/image";
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

type CustomerAppShellProps = {
  name: string;
  children: ReactNode;
};

const navigation = [
  {
    label: "Dashboard",
    href: "/customer/dashboard",
    icon: "/figma-assets/customer-menu-dashboard.svg",
  },
  {
    label: "Data Kendaraan",
    href: "/customer/vehicles",
    icon: "/figma-assets/customer-menu-car.svg",
  },
  {
    label: "Pendaftaran Servis",
    href: "/customer/service-registration",
    icon: "/figma-assets/customer-menu-registration.svg",
  },
  {
    label: "Status Servis",
    href: "/customer/service-status",
    icon: "/figma-assets/customer-menu-status.svg",
  },
  {
    label: "Biaya & Pembayaran",
    href: "/customer/payments",
    icon: "/figma-assets/customer-menu-cost.svg",
  },
];

export default function CustomerAppShell({
  name,
  children,
}: CustomerAppShellProps) {
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

  function handleMenuKeyDown(event: KeyboardEvent<HTMLElement>) {
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

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="customer-app">
      <header className="customer-header">
        <button
          aria-controls="customer-sidebar"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          className="customer-menu-trigger"
          onClick={() => setMenuOpen((open) => !open)}
          ref={triggerRef}
          type="button"
        >
          <Image
            alt=""
            height={22}
            src="/figma-assets/customer-hamburger.svg"
            width={22}
          />
        </button>
        <Link className="customer-brand" href="/customer/dashboard">
          MITRA JAYA SERVICE
        </Link>
        <div className="customer-header-meta">
          <span className="customer-help">Bantuan&nbsp; • &nbsp;021 555 0148</span>
          <span className="customer-user-name">{name}</span>
        </div>
      </header>

      <main className="customer-main">{children}</main>

      <div
        aria-hidden={!menuOpen}
        className={`customer-sidebar-backdrop${menuOpen ? " is-open" : ""}`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setMenuOpen(false);
          }
        }}
      />
      <nav
        aria-hidden={!menuOpen}
        aria-label="Menu navigasi customer"
        aria-modal={menuOpen || undefined}
        className={`customer-sidebar${menuOpen ? " is-open" : ""}`}
        id="customer-sidebar"
        inert={!menuOpen}
        onKeyDown={handleMenuKeyDown}
        ref={menuRef}
        role="dialog"
      >
        <div className="customer-sidebar-brand">
          <button
            aria-label="Tutup menu"
            className="customer-sidebar-close"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <Image
              alt=""
              height={22}
              src="/figma-assets/customer-hamburger.svg"
              width={22}
            />
          </button>
          <span>MITRA JAYA SERVICE</span>
        </div>
        <div className="customer-sidebar-links">
          {navigation.map((item) => (
            <Link
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`customer-sidebar-link${isActive(item.href) ? " is-active" : ""}`}
              href={item.href}
              key={item.href}
              onClick={() => setMenuOpen(false)}
            >
              <Image alt="" height={19} src={item.icon} width={19} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        <LogoutAction
          className="customer-sidebar-logout"
          icon="/figma-assets/customer-menu-logout.svg"
          name={name}
          onLoggedOut={() => setMenuOpen(false)}
        />
      </nav>
    </div>
  );
}
