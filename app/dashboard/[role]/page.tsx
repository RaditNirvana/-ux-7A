import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AuthDashboard from "@/components/auth/AuthDashboard";
import {
  getRoleFromSlug,
  getRoleSlug,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DashboardPageProps = {
  params: Promise<{ role: string }>;
};

export default function DashboardPage(props: DashboardPageProps) {
  return (
    <Suspense
      fallback={
        <main className="dashboard-page" aria-busy="true">
          Memuat dashboard...
        </main>
      }
    >
      <ProtectedDashboard {...props} />
    </Suspense>
  );
}

async function ProtectedDashboard({ params }: DashboardPageProps) {
  const { role: roleSlug } = await params;
  const role = getRoleFromSlug(roleSlug);

  if (!role) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    redirect(`/login/${roleSlug}`);
  }

  if (session.role !== role) {
    redirect(`/dashboard/${getRoleSlug(session.role)}`);
  }

  const user = await prisma.pengguna.findUnique({
    where: { id_pengguna: session.id_pengguna },
    select: { nama: true, role: true, login: true },
  });

  if (!user || user.login !== "Aktif" || user.role !== role) {
    redirect(`/login/${roleSlug}`);
  }

  return <AuthDashboard name={user.nama} role={role} />;
}
