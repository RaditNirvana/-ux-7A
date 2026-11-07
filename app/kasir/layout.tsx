import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import KasirAppShell from "@/components/kasir/KasirAppShell";
import { getRoleDashboardPath } from "@/lib/role-routing";
import { getSessionUser } from "@/lib/session-user";
import "./kasir.css";

export default async function KasirLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  if (user.role !== "Kasir") redirect(getRoleDashboardPath(user.role));
  return <KasirAppShell name={user.nama}>{children}</KasirAppShell>;
}
