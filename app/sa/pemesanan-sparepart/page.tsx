import OrdersPage from "@/components/sa/screens/OrdersPage";
import {
  getServiceAdvisorOrders,
  getServiceAdvisorSpareparts,
  getServiceAdvisorSuppliers,
} from "@/lib/service-advisor-data";

export const instant = false;

export default async function SparepartOrdersRoute() {
  const [orders, spareparts, suppliers] = await Promise.all([
    getServiceAdvisorOrders(),
    getServiceAdvisorSpareparts(),
    getServiceAdvisorSuppliers(),
  ]);
  return (
    <OrdersPage orders={orders} spareparts={spareparts} suppliers={suppliers} />
  );
}
