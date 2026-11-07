import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getRoleDashboardPath } from "@/lib/role-routing";
import { getSessionUser } from "@/lib/session-user";
import OwnerAppShell from "@/components/owner/OwnerAppShell";
import "./owner.css";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  if (user.role !== "Owner") redirect(getRoleDashboardPath(user.role));
  return <OwnerAppShell name={user.nama}>{children}</OwnerAppShell>;
}
