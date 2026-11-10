import OwnerReportScreen from "@/components/owner/OwnerReportScreen";

export const instant = false;

export default async function OwnerReportPage({ searchParams }: { searchParams: Promise<{ awal?: string; akhir?: string; jenis?: string; langkah?: string }> }) {
  const query = await searchParams;
  return <OwnerReportScreen key={`legacy-${query.awal ?? ""}-${query.akhir ?? ""}-${query.jenis ?? ""}-${query.langkah ?? ""}`} initialSearch={query} />;
}
