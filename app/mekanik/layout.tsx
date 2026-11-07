import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getRoleDashboardPath } from "@/lib/role-routing";
import { getSessionUser } from "@/lib/session-user";
import MekanikAppShell from "@/components/MekanikAppShell";

export const instant = false;

export default async function MechanicLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  if (user.role !== "Mekanik") redirect(getRoleDashboardPath(user.role));
  return <MekanikAppShell name={user.nama}>{children}</MekanikAppShell>;
}
