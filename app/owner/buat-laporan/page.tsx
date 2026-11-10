import OwnerReportScreen from "@/components/owner/OwnerReportScreen";

export const instant = false;

export default async function OwnerCreateReportPage({ searchParams }: { searchParams: Promise<{ awal?: string; akhir?: string; jenis?: string; langkah?: string }> }) {
  const query = await searchParams;
  return <OwnerReportScreen key={`create-${query.awal ?? ""}-${query.akhir ?? ""}-${query.jenis ?? ""}-${query.langkah ?? ""}`} initialSearch={query} />;
}
