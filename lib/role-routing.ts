import type { UserRole } from "@/lib/auth";

const roleDashboardPaths: Record<UserRole, string> = {
  Customer: "/customer/dashboard",
  "Service Advisor": "/sa/dashboard",
  Mekanik: "/mekanik/dashboard",
  Kasir: "/kasir/dashboard",
  Owner: "/owner/dashboard",
};

export function getRoleDashboardPath(role: UserRole) {
  return roleDashboardPaths[role];
}
