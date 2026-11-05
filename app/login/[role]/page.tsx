import { Suspense } from "react";
import { notFound } from "next/navigation";
import AuthLoginForm from "@/components/auth/AuthLoginForm";
import { getRoleFromSlug } from "@/lib/auth";

type LoginPageProps = {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ registered?: string | string[] }>;
};

export default function LoginPage(props: LoginPageProps) {
  return (
    <Suspense fallback={<div className="auth-loading">Memuat halaman masuk...</div>}>
      <LoginPageContent {...props} />
    </Suspense>
  );
}

async function LoginPageContent({
  params,
  searchParams,
}: LoginPageProps) {
  const [{ role: roleSlug }, query] = await Promise.all([params, searchParams]);
  const role = getRoleFromSlug(roleSlug);

  if (!role) {
    notFound();
  }

  return (
    <AuthLoginForm
      role={role}
      roleSlug={roleSlug}
      showRegisteredMessage={query.registered === "1"}
    />
  );
}
