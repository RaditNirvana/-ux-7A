"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import LogoutAction from "@/components/customer/LogoutAction";

const items = [
  ["/kasir/dashboard", "Dashboard", "⌂"],
  ["/kasir/rincian-biaya", "Rincian Biaya Servis", "▤"],
  ["/kasir/pembayaran", "Pembayaran", "▣"],
  ["/kasir/akun", "Kelola Akun", "♙"],
];

export default function KasirAppShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="kasir-shell">
    <aside className="kasir-sidebar">
      <div className="kasir-profile"><span className="kasir-avatar">{initials}</span><span><b>{name}</b><small>Kasir</small></span></div>
      <nav aria-label="Menu Kasir">{items.map(([href, label, icon]) => {
        const active = pathname === href || (href !== "/kasir/dashboard" && pathname.startsWith(`${href}/`));
        return <Link aria-current={active ? "page" : undefined} className={active ? "kasir-nav-item active" : "kasir-nav-item"} href={href} key={href}><span aria-hidden="true">{icon}</span>{label}</Link>;
      })}</nav>
      <div className="kasir-logout"><LogoutAction className="kasir-logout-button" label="Keluar" name={name} variant="service-advisor" /></div>
    </aside>
    <div className="kasir-main"><header className="kasir-header"><strong>Mitra Jaya Service</strong><span className="kasir-header-avatar">{initials}</span></header><main className="kasir-content">{children}</main></div>
  </div>;
}
