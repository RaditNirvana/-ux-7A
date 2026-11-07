import InspectionPage from "@/components/sa/screens/InspectionPage";
import { getServiceAdvisorInspectionData } from "@/lib/service-advisor-data";

export const instant = false;

export default async function ServiceInspectionRoute() {
  const { services, spareparts } = await getServiceAdvisorInspectionData();
  return <InspectionPage services={services} spareparts={spareparts} />;
}
