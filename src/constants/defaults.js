import { todayISO } from "../utils/appUtils";

export const BRAND = "AquaBiz";

export const emptyBooking = {
  name: "",
  mobile: "",
  address: "",
  complaintNotes: "",
  priority: "Normal",
  serviceId: "",
  paymentMethod: "pending",
  emiMonths: "6",
  emiAdvance: "0",
  emiMonthly: "",
  emiStartDate: todayISO(),
  emiNotes: "",
  technicianId: "",
};

export const emptyLead = {
  customer_name: "",
  mobile: "",
  source: "Manual",
  interest: "Service",
  status: "New",
  assigned_telecaller_id: "",
  follow_up_date: todayISO(),
  notes: "",
};

export const emptyTechnicianPart = {
  technician_id: "",
  inventory_item_id: "",
  quantity: "1",
  notes: "",
};

export const emptyPart = {
  name: "",
  category_id: "",
  purchase_price: "",
  selling_price: "",
  stock_qty: "",
  low_stock_qty: "2",
  supplier_name: "",
};

export const emptyCategory = { name: "" };

export const emptyPlan = {
  name: "",
  price: "",
  validity_days: "365",
  free_visits_enabled: true,
  free_visits: "4",
  service_reminder_days: "90",
  coverage_type: "selected",
  covered_category_ids: [],
  covered_part_ids: [],
  notes: "",
};

export const emptyProduct = {
  name: "",
  price: "",
  min_down_payment: "",
  warranty_validity_days: "365",
  free_visits_enabled: true,
  free_visits: "4",
  service_reminder_days: "180",
  coverage_type: "selected",
  covered_category_ids: [],
  covered_part_ids: [],
  notes: "",
};

export const emptyActivation = {
  type: "amc",
  customer_name: "",
  mobile: "",
  amc_plan_id: "",
  product_id: "",
  discount: "0",
  cash_amount: "0",
  upi_amount: "0",
};

export const emptyPayment = {
  cash_amount: "",
  upi_amount: "",
  payment_date: todayISO(),
  note: "",
  mark_next_emi: true,
};
