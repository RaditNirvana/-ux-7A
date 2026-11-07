import VerificationPage from "@/components/sa/screens/VerificationPage";
import { getServiceAdvisorVerificationData } from "@/lib/service-advisor-data";

export const instant = false;

export default async function ServiceVerificationRoute() {
  const services = await getServiceAdvisorVerificationData();
  return <VerificationPage services={services} />;
}
