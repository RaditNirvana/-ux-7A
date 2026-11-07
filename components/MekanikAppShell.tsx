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

const navigation = [
  {
    href: "/mekanik/dashboard",
    label: "Dashboard",
    icon: "/figma-assets/mekanik-sidebar-dashboard-inactive.svg",
    activeIcon: "/figma-assets/mekanik-sidebar-dashboard.svg",
  },
  {
    href: "/mekanik/penugasan",
    label: "Penugasan",
    icon: "/figma-assets/mekanik-sidebar-assignment.svg",
    activeIcon: "/figma-assets/mekanik-sidebar-assignment-active.svg",
  },
  {
    href: "/mekanik/pemeriksaan",
    label: "Pemeriksaan",
    icon: "/figma-assets/mekanik-sidebar-inspection.svg",
    activeIcon: "/figma-assets/mekanik-sidebar-inspection-active.svg",
  },
  {
    href: "/mekanik/konfirmasi-servis",
    label: "Konfirmasi Servis",
    icon: "/figma-assets/mekanik-sidebar-confirmation.svg",
    activeIcon: "/figma-assets/mekanik-sidebar-confirmation-active.svg",
  },
  {
    href: "/mekanik/pelaksanaan-servis",
    label: "Pelaksanaan Servis",
    icon: "/figma-assets/mekanik-sidebar-execution.svg",
    activeIcon: "/figma-assets/mekanik-sidebar-execution-active.svg",
  },
];

export default function MekanikAppShell({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) trigger.current?.focus();
      wasOpen.current = false;
      return;
    }

    wasOpen.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }

    if (event.key !== "Tab" || !sidebar.current) return;
    const focusable = Array.from(
      sidebar.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    );
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
    <div className="min-h-screen bg-[#eef0ff] font-[var(--font-poppins)] text-[#111827] antialiased">
      <main className="min-h-screen">{children}</main>
      <button
        ref={trigger}
        aria-label="Buka menu"
        aria-controls="mekanik-sidebar"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed left-1/2 top-4 z-20 grid size-10 -translate-x-[688px] grid-rows-[repeat(3,2px)] place-content-center place-items-center gap-[5px] rounded-[8px] bg-[#0f14f0] hover:bg-[#0f14f0] max-md:left-4 max-md:translate-x-0"
      >
        <span aria-hidden="true" className="h-[2px] w-5 rounded-[2px] bg-white" />
        <span aria-hidden="true" className="h-[2px] w-5 rounded-[2px] bg-white" />
        <span aria-hidden="true" className="h-[2px] w-5 rounded-[2px] bg-white" />
      </button>

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      />

      <aside
        ref={sidebar}
        id="mekanik-sidebar"
        aria-hidden={!open}
        aria-label="Menu navigasi mekanik"
        aria-modal={open || undefined}
        inert={!open}
        onKeyDown={handleKeyDown}
        role="dialog"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[240px] flex-col gap-2 overflow-y-auto bg-[linear-gradient(160deg,#0a0ad8_0%,#2f3bff_60%,#8f9bff_100%)] p-6 text-white shadow-[12px_0_36px_rgba(15,23,42,0.18)] transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex w-full shrink-0 flex-col items-start pb-10 pt-2">
          <div className="flex w-full items-center gap-3 py-px">
            <Image
              alt=""
              src="/figma-assets/mekanik-wing-logo.svg"
              width={46}
              height={30}
              className="h-[30px] w-[46px] shrink-0"
            />
            <div className="text-[16px] font-semibold leading-[22px] text-white">
              <div>Mitra Jaya</div>
              <div>Servis</div>
            </div>
          </div>
        </div>

        <nav aria-label="Menu Mekanik" className="w-full space-y-2">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex h-11 w-full items-center gap-3 rounded-[10px] px-4 text-[14px] font-medium leading-normal transition-colors ${active ? "bg-white" : "text-white/85 hover:bg-white/10"}`}
                style={{
                  color: active ? "#0f14f0" : "rgba(255, 255, 255, 0.85)",
                  fontSize: "14px",
                  fontWeight: 500,
                  lineHeight: "normal",
                }}
              >
                <Image
                  alt=""
                  src={active ? item.activeIcon : item.icon}
                  width={20}
                  height={20}
                  className="h-5 w-5 shrink-0"
                />
                {item.label === "Pelaksanaan Servis" ? (
                  <span>Pelaksanaan<br />Servis</span>
                ) : (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto w-full border-t border-white/20">
          <LogoutAction
            name={name}
            icon="/figma-assets/mekanik-sidebar-logout.svg"
            label="Keluar"
            className="flex h-14 w-full items-center gap-3 px-4 text-left text-[14px] font-medium leading-5 text-white/85 hover:text-white"
          />
        </div>
      </aside>
    </div>
  );
}
