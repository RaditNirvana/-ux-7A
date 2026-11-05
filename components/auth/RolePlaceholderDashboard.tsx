import { redirect } from "next/navigation";
import LogoutAction from "@/components/customer/LogoutAction";
import { getRoleDashboardPath } from "@/lib/role-routing";
import { getSessionUser } from "@/lib/session-user";
import type { UserRole } from "@/lib/auth";

export default async function RolePlaceholderDashboard({
  role,
}: {
  role: UserRole;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/masuk");
  }

  if (user.role !== role) {
    redirect(getRoleDashboardPath(user.role));
  }

  return (
    <main className="role-placeholder-screen">
      <section className="role-placeholder-card">
        <p className="customer-eyebrow">AREA {role.toUpperCase()}</p>
        <h1>Halo, {user.nama}</h1>
        <p>Dashboard {role} belum dibangun.</p>
        <LogoutAction
          className="role-placeholder-logout"
          name={user.nama}
        />
      </section>
    </main>
  );
}
