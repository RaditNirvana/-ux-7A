import type { ReactNode } from "react";
import CustomerAppShell from "@/components/customer/CustomerAppShell";
import { requireCustomerContext } from "@/lib/customer-session";

export const instant = false;

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const customer = await requireCustomerContext();

  return (
    <CustomerAppShell name={customer.nama}>{children}</CustomerAppShell>
  );
}
