import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/session-user";

export type CustomerContext = SessionUser & { id_customer: string };

export async function requireCustomerContext(): Promise<CustomerContext> {
  const user = await getSessionUser();

  if (!user || user.role !== "Customer" || !user.id_customer) {
    redirect("/masuk");
  }

  return { ...user, id_customer: user.id_customer };
}

export async function getCustomerApiContext(): Promise<CustomerContext | null> {
  const user = await getSessionUser();

  if (!user || user.role !== "Customer" || !user.id_customer) {
    return null;
  }

  return { ...user, id_customer: user.id_customer };
}
