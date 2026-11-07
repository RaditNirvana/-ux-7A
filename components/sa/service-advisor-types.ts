export type ServiceAdvisorDashboardData = {
  registrations: {
    id: string;
    number: string;
    customer: string;
    plate: string;
    issue: string;
  }[];
  progress: { id: string; plate: string; status: string }[];
  summary: {
    title: string;
    subtitle: string;
    count: number;
    icon: "document" | "people" | "box";
  }[];
};

export type ServiceAdvisorService = {
  id: string;
  number: string;
  customer: string;
  plate: string;
  vehicle: string;
  complaint: string;
  arrivalNote: string | null;
  date: string;
  verification: string;
  status: string;
  inspection: string | null;
  needs: string | null;
  result: string | null;
  mechanicId: string | null;
  mechanic: string | null;
  updatedAt: string | null;
  timeline: { stage: string; note: string | null; time: string }[];
  parts: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    stock: number;
    availability: string;
    area: string | null;
  }[];
};

export type ServiceAdvisorMechanic = {
  id: string;
  displayId: string;
  name: string;
  phone: string;
  availability: string;
  login: string;
  activeAssignmentCount: number;
  activeAssignment: string | null;
};

export type ServiceAdvisorSparepart = {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minimum: number;
  location: string | null;
  updatedAt: string;
  supplier: string | null;
};

export type ServiceAdvisorSupplier = {
  id: string;
  name: string;
  phone: string | null;
};

export type ServiceAdvisorOrder = {
  id: string;
  sparepartId: string;
  sparepart: string;
  unit: string;
  quantity: number;
  stock: number;
  supplierId: string;
  supplier: string;
  supplierPhone: string | null;
  orderDate: string;
  estimatedDate: string | null;
  status: string;
  note: string | null;
};
