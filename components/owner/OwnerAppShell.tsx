"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import OwnerIcon from "@/components/owner/OwnerIcon";

const links = [["/owner/dashboard", "Dashboard", "dashboard"], ["/owner/laporan", "Buat Laporan", "report"], ["/owner/akun", "Kelola Akun", "users"]];

export default function OwnerAppShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [logout, setLogout] = useState(false);
  const [busy, setBusy] = useState(false);
  const initials = name.split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  useEffect(() => {
    if (!open && !logout) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); setLogout(false); } };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", key); };
  }, [open, logout]);
  async function doLogout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/masuk");
  }
  return <div className="owner-shell">
    <header className="owner-header"><button className="owner-hamburger" aria-label="Buka menu" onClick={() => setOpen(true)}><i/><i/><i/></button><b className="owner-brand">Mitra Jaya Service</b><div className="owner-user"><span><b>{name}</b><small>Owner</small></span><i>{initials.slice(0,1)}</i></div></header>
    <main className="owner-main">{children}</main>
    {open && <div className="owner-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}><aside className="owner-sidebar"><div className="owner-side-head"><span className="owner-badge">M</span><b>Mitra Jaya Service</b><button aria-label="Tutup menu" onClick={() => setOpen(false)}><OwnerIcon name="close" size={20}/></button></div><nav>{links.map(([href,label,icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname === href ? "active" : ""}><span><OwnerIcon name={icon} size={17}/></span>{label}</Link>)}</nav><div className="owner-side-bottom"><button className="owner-logout" onClick={() => { setOpen(false); setLogout(true); }}><OwnerIcon name="logout" size={16}/> Keluar</button><div className="owner-side-profile"><i>{initials.slice(0,1)}</i><span><b>{name}</b><small>Owner</small></span></div></div></aside></div>}
    {logout && <div className="owner-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setLogout(false); }}><section className="owner-modal owner-confirm"><button className="owner-close" onClick={() => setLogout(false)} aria-label="Tutup"><OwnerIcon name="close" size={20}/></button><div className="owner-modal-icon"><OwnerIcon name="logout" size={22}/></div><h2>Konfirmasi Keluar</h2><p>Apakah Anda yakin ingin keluar dari akun?</p><div className="owner-actions"><button className="owner-button secondary" onClick={() => setLogout(false)}>Batal</button><button disabled={busy} className="owner-button primary" onClick={doLogout}>Ya, Keluar</button></div></section></div>}
  </div>;
}
