import { NextResponse, type NextRequest } from "next/server";
import { getRoleDashboardPath } from "@/lib/role-routing";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

const protectedPaths: Array<{ prefix: string; role: UserRole }> = [
  { prefix: "/customer", role: "Customer" },
  { prefix: "/sa", role: "Service Advisor" },
  { prefix: "/mekanik", role: "Mekanik" },
  { prefix: "/kasir", role: "Kasir" },
  { prefix: "/owner", role: "Owner" },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const mechanicApi =
    pathname === "/api/mekanik" || pathname.startsWith("/api/mekanik/");
  const kasirApi = pathname === "/api/kasir" || pathname.startsWith("/api/kasir/");
  const requiredRole = protectedPaths.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.role;
  const legacyDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (!requiredRole && !legacyDashboard && !mechanicApi && !kasirApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (mechanicApi && (!session || session.role !== "Mekanik")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  if (mechanicApi) {
    return NextResponse.next();
  }

  if (kasirApi) {
    if (!session || session.role !== "Kasir") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/masuk", request.url));
  }

  const dashboardPath = getRoleDashboardPath(session.role);

  if (legacyDashboard || session.role !== requiredRole) {
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/customer/:path*",
    "/sa/:path*",
    "/mekanik/:path*",
    "/api/mekanik/:path*",
    "/api/kasir/:path*",
    "/kasir/:path*",
    "/owner/:path*",
    "/dashboard/:path*",
  ],
};
