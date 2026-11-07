import MechanicsPage from "@/components/sa/screens/MechanicsPage";
import { getServiceAdvisorMechanics } from "@/lib/service-advisor-data";

export const instant = false;

export default async function ServiceMechanicsRoute() {
  const mechanics = await getServiceAdvisorMechanics();
  return <MechanicsPage mechanics={mechanics} />;
}
