import { redirect } from "next/navigation";

export const instant = false;

export default function ProsesServisPage() {
  redirect("/sa/status-servis");
}
