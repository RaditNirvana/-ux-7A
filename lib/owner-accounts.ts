import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const ROLES = ["Owner", "Service Advisor", "Mekanik", "Kasir"] as const;
export type AccountRole = (typeof ROLES)[number];
const roleConfig = {
  Customer: { model: "customer", field: "id_customer", prefix: "C", width: 3 },
  "Service Advisor": { model: "service_advisor", field: "id_sa", prefix: "SA", width: 2 },
  Mekanik: { model: "mekanik", field: "id_mekanik", prefix: "M", width: 3 },
  Kasir: { model: "kasir", field: "id_kasir", prefix: "K", width: 3 },
  Owner: { model: "owner", field: "id_owner", prefix: "O", width: 3 },
} as const;

export async function nextAccountCode(tx: Prisma.TransactionClient, model: keyof typeof roleConfig | "pengguna") {
  const cfg = model === "pengguna" ? { model: "pengguna", field: "id_pengguna", prefix: "P", width: 3 } : roleConfig[model];
  const accessor = tx[cfg.model as keyof Prisma.TransactionClient] as unknown as { findMany: (args: { select: Record<string, boolean> }) => Promise<Record<string, string>[]> };
  const rows = await accessor.findMany({ select: { [cfg.field]: true } });
  const used = new Set(rows.map((row) => row[cfg.field]));
  for (let i = 1; i < 10 ** cfg.width; i++) { const code = `${cfg.prefix}${String(i).padStart(cfg.width, "0")}`; if (!used.has(code)) return code; }
  throw new Error("Kode akun sudah habis.");
}

export async function hasAccountHistory(id: string, role: AccountRole) {
  switch (role) {
    case "Service Advisor": return (await prisma.servis.count({ where: { service_advisor: { id_pengguna: id } } })) > 0 || (await prisma.penugasan_mekanik.count({ where: { servis: { service_advisor: { id_pengguna: id } } } })) > 0 || (await prisma.riwayat_stok.count({ where: { service_advisor: { id_pengguna: id } } })) > 0 || (await prisma.pemesanan_sparepart.count({ where: { service_advisor: { id_pengguna: id } } })) > 0;
    case "Mekanik": return (await prisma.penugasan_mekanik.count({ where: { mekanik: { id_pengguna: id } } })) > 0;
    case "Kasir": return (await prisma.pembayaran.count({ where: { kasir: { id_pengguna: id } } })) > 0;
    case "Owner": return (await prisma.laporan.count({ where: { owner: { id_pengguna: id } } })) > 0;
  }
}
