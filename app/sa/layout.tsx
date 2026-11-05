import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import ServiceAdvisorAppShell from "@/components/sa/ServiceAdvisorAppShell";
import { getRoleDashboardPath } from "@/lib/role-routing";
import { getSessionUser } from "@/lib/session-user";

export const instant = false;

export default async function ServiceAdvisorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/masuk");
  }

  if (user.role !== "Service Advisor") {
    redirect(getRoleDashboardPath(user.role));
  }

  return (
    <ServiceAdvisorAppShell name={user.nama}>{children}</ServiceAdvisorAppShell>
  );
}
