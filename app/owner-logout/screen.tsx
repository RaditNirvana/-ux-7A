"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OwnerLogoutConfirm() {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  async function logout() { setBusy(true); await fetch("/api/auth/logout", { method: "POST" }); router.push("/masuk"); }
  return <main className="owner-full-page owner-logout-page"><header>Mitra Jaya Service</header><h1>Konfirmasi Keluar</h1><section><div className="logout-mark">↪</div><h2>Yakin ingin keluar?</h2><p>Anda akan kembali ke halaman Dashboard Owner.</p><div className="logout-actions"><button onClick={() => router.back()}>Batal</button><button disabled={busy} onClick={logout}>Keluar</button></div></section></main>;
}
