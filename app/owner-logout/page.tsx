import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session-user";
import OwnerLogoutConfirm from "./screen";
import "./style.css";

export const instant = false;
export default async function OwnerLogoutPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "Owner") redirect("/masuk");
  return <OwnerLogoutConfirm />;
}
