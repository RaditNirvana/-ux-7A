import { redirect } from "next/navigation";

export const instant = false;

export default function SparepartPage() {
  redirect("/sa/stok-sparepart");
}
