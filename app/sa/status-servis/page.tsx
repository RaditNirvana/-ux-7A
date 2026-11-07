import ServiceStatusPage from "@/components/sa/screens/ServiceStatusPage";
import { getServiceAdvisorStatusData } from "@/lib/service-advisor-data";

export const instant = false;

export default async function ServiceStatusRoute() {
  const services = await getServiceAdvisorStatusData();
  return <ServiceStatusPage services={services} />;
}
