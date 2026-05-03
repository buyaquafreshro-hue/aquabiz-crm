import { supabase } from "../supabaseClient";

export async function fetchAppData() {
  const [
    servicesRes,
    techRes,
    telecallerRes,
    bookingsRes,
    jobsRes,
    customersRes,
    customersFullRes,
    categoryRes,
    inventoryRes,
    planRes,
    productRes,
    coverageRes,
    invoiceRes,
    invoicePaymentsRes,
    invoiceItemsRes,
    usageRes,
    technicianPartsRes,
    businessSettingsRes,
    inventoryPurchasesRes,
    leadsRes,
    salesPersonsRes,
  ] = await Promise.all([
    supabase.from("services").select("*").order("name", { ascending: true }),
    supabase.from("technicians").select("*").order("name", { ascending: true }),
    supabase.from("telecallers").select("*").order("name", { ascending: true }),
    supabase.from("bookings").select("*").order("created_at", { ascending: false }),
    supabase.from("job_assignments").select("*").order("created_at", { ascending: false }),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
    supabase.from("part_categories").select("*").order("name", { ascending: true }),
    supabase.from("inventory_items").select("*").order("name", { ascending: true }),
    supabase.from("amc_plans").select("*").order("name", { ascending: true }),
    supabase.from("ro_products").select("*").order("name", { ascending: true }),
    supabase.from("customer_coverages").select("*").order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").order("created_at", { ascending: false }),
    supabase.from("invoice_payments").select("*").order("payment_date", { ascending: false }),
    supabase.from("invoice_items").select("*").order("created_at", { ascending: false }),
    supabase.from("inventory_usage").select("*").order("created_at", { ascending: false }),
    supabase.from("technician_parts").select("*").order("created_at", { ascending: false }),
    supabase.from("business_settings").select("*").limit(1).maybeSingle(),
    supabase.from("inventory_purchases").select("*").order("restock_date", { ascending: false }),
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("sales_persons").select("*").order("name", { ascending: true }),
  ]);

  const responses = [
    ["services", servicesRes],
    ["technicians", techRes],
    ["telecallers", telecallerRes],
    ["bookings", bookingsRes],
    ["job_assignments", jobsRes],
    ["customers_count", customersRes],
    ["customers", customersFullRes],
    ["part_categories", categoryRes],
    ["inventory_items", inventoryRes],
    ["amc_plans", planRes],
    ["ro_products", productRes],
    ["customer_coverages", coverageRes],
    ["invoices", invoiceRes],
    ["invoice_payments", invoicePaymentsRes],
    ["invoice_items", invoiceItemsRes],
    ["inventory_usage", usageRes],
    ["technician_parts", technicianPartsRes],
    ["business_settings", businessSettingsRes],
    ["inventory_purchases", inventoryPurchasesRes],
    ["leads", leadsRes],
    ["sales_persons", salesPersonsRes],
  ];

  const dataErrors = responses
    .filter(([, res]) => res?.error)
    .map(([name, res]) => `${name}: ${res.error.message}`);

  if (dataErrors.length) {
    console.error("AquaBiz data load errors:", dataErrors);
  }

  const categories = categoryRes.data || [];
  const inventory = (inventoryRes.data || []).map((item) => ({
    ...item,
    category_name: categories.find((category) => String(category.id) === String(item.category_id))?.name || item.category || "Other",
  }));

  return {
    services: servicesRes.data || [],
    technicians: techRes.data || [],
    telecallers: telecallerRes.data || [],
    bookings: bookingsRes.data || [],
    jobs: jobsRes.data || [],
    customersCount: customersRes.count || 0,
    customers: customersFullRes.data || [],
    categories,
    inventory,
    amcPlans: planRes.data || [],
    products: productRes.data || [],
    coverages: coverageRes.data || [],
    invoices: invoiceRes.data || [],
    invoicePayments: invoicePaymentsRes.data || [],
    invoiceItems: invoiceItemsRes.data || [],
    usage: usageRes.data || [],
    technicianParts: technicianPartsRes.data || [],
    businessSettings: businessSettingsRes.data || null,
    inventoryPurchases: inventoryPurchasesRes.data || [],
    leads: leadsRes.data || [],
    salesPersons: salesPersonsRes.data || [],
    dataErrors,
  };
}
