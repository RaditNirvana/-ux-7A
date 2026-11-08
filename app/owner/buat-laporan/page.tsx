import OwnerReportScreen from "@/components/owner/OwnerReportScreen";

export const instant = false;

export default async function OwnerCreateReportPage({ searchParams }: { searchParams: Promise<{ awal?: string; akhir?: string; jenis?: string; langkah?: string }> }) {
  return <OwnerReportScreen initialSearch={await searchParams} />;
}
