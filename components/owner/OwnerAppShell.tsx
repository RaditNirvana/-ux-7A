"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const links = [
  { href: "/owner/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/owner/buat-laporan", label: "Buat Laporan", icon: "report" },
  { href: "/owner/akun", label: "Kelola Akun", icon: "users" },
] as const;

function OwnerMenuIcon({ name }: { name: (typeof links)[number]["icon"] }) {
  const common = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "dashboard") return <svg {...common}><path d="M3.33 2.5H7.5c.46 0 .83.37.83.83v5.84c0 .46-.37.83-.83.83H3.33a.83.83 0 0 1-.83-.83V3.33c0-.46.37-.83.83-.83Zm9.17 0h4.17c.46 0 .83.37.83.83v2.5c0 .46-.37.84-.83.84H12.5a.83.83 0 0 1-.83-.84v-2.5c0-.46.37-.83.83-.83Zm0 7.5h4.17c.46 0 .83.37.83.83v5.84c0 .46-.37.83-.83.83H12.5a.83.83 0 0 1-.83-.83v-5.84c0-.46.37-.83.83-.83Zm-9.17 3.33H7.5c.46 0 .83.37.83.84v2.5c0 .46-.37.83-.83.83H3.33a.83.83 0 0 1-.83-.83v-2.5c0-.47.37-.84.83-.84Z"/></svg>;
  if (name === "report") return <svg {...common}><path d="M5 2.5h6.25L16 7.25v10.5a.75.75 0 0 1-.75.75H4.75A.75.75 0 0 1 4 17.75V3.5a1 1 0 0 1 1-1Z"/><path d="M11 2.75V7.5h4.75M7 10h6M7 13h6M7 16h4"/></svg>;
  return <svg {...common}><path d="M13.33 17.5v-1.67A3.33 3.33 0 0 0 10 12.5H5a3.33 3.33 0 0 0-3.33 3.33v1.67M13.33 2.61a3.33 3.33 0 0 1 0 6.45M18.33 17.5v-1.67a3.33 3.33 0 0 0-2.5-3.22M10.83 5.83a3.33 3.33 0 1 1-6.67 0 3.33 3.33 0 0 1 6.67 0Z"/></svg>;
}

export default function OwnerAppShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const activeItem = pathname === "/owner/dashboard" ? "dashboard"
    : pathname === "/owner/laporan" || pathname.startsWith("/owner/buat-laporan") ? "report"
    : pathname.startsWith("/owner/akun") || pathname.startsWith("/owner/kelola-akun") ? "users"
    : "";
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", key); };
  }, [open]);
  return <div className="owner-shell">
    <header className={`owner-header ${pathname !== "/owner/dashboard" ? "owner-standard-header" : ""}`}><button className="owner-hamburger" aria-label="Buka menu" onClick={() => setOpen(true)}><i/><i/><i/></button><b className="owner-brand">Mitra Jaya Service</b><div className="owner-user"><span><b>{name}</b><small>Owner</small></span><i>{initials.slice(0, 1)}</i></div></header>
    <main className="owner-main">{children}</main>
    {open && <div className="owner-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><aside className="owner-sidebar"><div className="owner-side-head"><span className="owner-badge">M</span><b><span>Mitra Jaya</span><small>Service</small></b><button aria-label="Tutup menu" onClick={() => setOpen(false)}><Image alt="" height={20} src="/figma-assets/owner-sidebar-close.svg" width={20}/></button></div><nav>{links.map(({ href, label, icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={activeItem === icon ? "active" : ""}><OwnerMenuIcon name={icon}/>{label}</Link>)}</nav><button className="owner-logout" onClick={() => { setOpen(false); router.push("/owner-logout"); }}><span className="owner-logout-glyph" aria-hidden="true">↪</span><span className="owner-logout-label">Keluar</span></button><div className="owner-side-divider"/><div className="owner-side-profile"><span className="owner-side-avatar"><Image alt="" height={40} src="/figma-assets/owner-sidebar-avatar.svg" width={40}/><b>{initials.slice(0, 1)}</b></span><span><b>{name}</b><small>Owner</small></span></div></aside></div>}
  </div>;
}
