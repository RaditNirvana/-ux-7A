import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session-user";
import OwnerPdfSuccess from "./screen";
import "./style.css";

export const instant = false;
export default async function OwnerPdfSuccessPage({ searchParams }: { searchParams: Promise<{ awal?: string; akhir?: string; jenis?: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "Owner") redirect("/masuk");
  return <OwnerPdfSuccess query={new URLSearchParams(await searchParams).toString()} />;
}
