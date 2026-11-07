import SparepartsPage from "@/components/sa/screens/SparepartsPage";
import { getServiceAdvisorSpareparts } from "@/lib/service-advisor-data";

export const instant = false;

export default async function SparepartStockRoute() {
  const spareparts = await getServiceAdvisorSpareparts();
  return <SparepartsPage spareparts={spareparts} />;
}
