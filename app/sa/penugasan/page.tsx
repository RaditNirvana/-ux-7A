import AssignmentPage from "@/components/sa/screens/AssignmentPage";
import { getServiceAdvisorAssignmentData } from "@/lib/service-advisor-data";

export const instant = false;

export default async function ServiceAssignmentRoute() {
  const { services, mechanics } = await getServiceAdvisorAssignmentData();
  return <AssignmentPage mechanics={mechanics} services={services} />;
}
