
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import "./index.css";

const TEXT = {
  en: {
    dashboard: "Dashboard",
    controlCenter: "AquaBiz Control Center",
    heroText: "Sales, AMC, payments, service reminders, and jobs in one place.",
    newBooking: "New Booking",
    amcNewSale: "AMC / New Sale",
    plansProducts: "Plans / Products",
    inventory: "Inventory",
    reports: "Reports",
    businessSettings: "Business Settings",
    customerHistory: "Customer History",
    technicianApp: "Technician App",
    quickActions: "Quick Actions",
    shortcuts: "Important daily shortcuts",
    serviceReminders: "Service Reminders",
    dueOverdue: "Due / overdue customers",
    noReminders: "No reminders due",
    remindersEmpty: "Upcoming service reminders will appear here.",
    recentBookings: "Recent Bookings",
    latestRequests: "Latest customer requests",
    allJobs: "All Jobs",
    noBookings: "No bookings yet",
    newSales: "New Sales",
    amcSales: "AMC Sales",
    monthCollection: "Month Collection",
    bookings: "Bookings",
    reminders: "Reminders",
    lowStock: "Low Stock",
    completedJobs: "Completed Jobs",
    customers: "Customers",
    pending: "Pending",
    view: "View",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    controlCenter: "AquaBiz कंट्रोल सेंटर",
    heroText: "सेल्स, AMC, पेमेंट, सर्विस रिमाइंडर और जॉब्स एक जगह.",
    newBooking: "नई बुकिंग",
    amcNewSale: "AMC / नई बिक्री",
    plansProducts: "प्लान / प्रोडक्ट",
    inventory: "इन्वेंटरी",
    reports: "रिपोर्ट",
    businessSettings: "बिजनेस सेटिंग्स",
    customerHistory: "ग्राहक हिस्ट्री",
    technicianApp: "टेक्नीशियन ऐप",
    quickActions: "क्विक एक्शन",
    shortcuts: "रोजाना इस्तेमाल के जरूरी शॉर्टकट",
    serviceReminders: "सर्विस रिमाइंडर",
    dueOverdue: "ड्यू / ओवरड्यू ग्राहक",
    noReminders: "कोई रिमाइंडर ड्यू नहीं",
    remindersEmpty: "आने वाले सर्विस रिमाइंडर यहां dikhenge.",
    recentBookings: "हाल की बुकिंग",
    latestRequests: "लेटेस्ट ग्राहक रिक्वेस्ट",
    allJobs: "सभी जॉब्स",
    noBookings: "अभी कोई बुकिंग नहीं",
    newSales: "नई बिक्री",
    amcSales: "AMC बिक्री",
    monthCollection: "महीने का कलेक्शन",
    bookings: "बुकिंग",
    reminders: "रिमाइंडर",
    lowStock: "लो स्टॉक",
    completedJobs: "पूरे हुए जॉब्स",
    customers: "ग्राहक",
    pending: "पेंडिंग",
    view: "देखें",
  },
  hinglish: {
    dashboard: "Dashboard",
    controlCenter: "AquaBiz Control Center",
    heroText: "Sales, AMC, payments, service reminders aur jobs ek jagah.",
    newBooking: "New Booking",
    amcNewSale: "AMC / New Sale",
    plansProducts: "Plans / Products",
    inventory: "Inventory",
    reports: "Reports",
    businessSettings: "Business Settings",
    customerHistory: "Customer History",
    technicianApp: "Technician App",
    quickActions: "Quick Actions",
    shortcuts: "Daily use ke important shortcuts",
    serviceReminders: "Service Reminders",
    dueOverdue: "Due / overdue customers",
    noReminders: "No reminders due",
    remindersEmpty: "Upcoming service reminders yahan dikhenge.",
    recentBookings: "Recent Bookings",
    latestRequests: "Latest customer requests",
    allJobs: "All Jobs",
    noBookings: "No bookings yet",
    newSales: "New Sales",
    amcSales: "AMC Sales",
    monthCollection: "Month Collection",
    bookings: "Bookings",
    reminders: "Reminders",
    lowStock: "Low Stock",
    completedJobs: "Completed Jobs",
    customers: "Customers",
    pending: "Pending",
    view: "View",
  },
};

function getText(language) {
  return TEXT[language] || TEXT.en;
}


const BRAND = "AquaBiz";

const emptyBooking = {
  name: "",
  mobile: "",
  address: "",
  complaintNotes: "",
  serviceId: "",
  paymentMethod: "pending",
  emiMonths: "6",
  emiAdvance: "0",
  emiMonthly: "",
  emiStartDate: todayISO(),
  emiNotes: "",
  technicianId: "",
};

const emptyLead = {
  customer_name: "",
  mobile: "",
  source: "Manual",
  interest: "Service",
  status: "New",
  follow_up_date: todayISO(),
  notes: "",
};

const emptyPart = {
  name: "",
  category_id: "",
  purchase_price: "",
  selling_price: "",
  stock_qty: "",
  low_stock_qty: "2",
  supplier_name: "",
};

const emptyCategory = { name: "" };

const emptyPlan = {
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

const emptyProduct = {
  name: "",
  price: "",
  warranty_validity_days: "365",
  free_visits_enabled: true,
  free_visits: "4",
  service_reminder_days: "180",
  coverage_type: "selected",
  covered_category_ids: [],
  covered_part_ids: [],
  notes: "",
};

const emptyActivation = {
  type: "amc",
  customer_name: "",
  mobile: "",
  amc_plan_id: "",
  product_id: "",
  discount: "0",
  cash_amount: "0",
  upi_amount: "0",
};

const emptyPayment = {
  cash_amount: "",
  upi_amount: "",
  payment_date: todayISO(),
  note: "",
  mark_next_emi: true,
};

function formatINR(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const d = new Date(dateString + "T00:00:00");
  d.setDate(d.getDate() + Number(days || 0));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalMonthKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getRecordMonthKey(record) {
  const rawDate = record?.invoice_date || record?.created_at || record?.date;
  if (!rawDate) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(rawDate))) return String(rawDate).slice(0, 7);
  return getLocalMonthKey(rawDate);
}

function getDashboardMonthKey(bookings = [], invoices = []) {
  const currentMonth = getLocalMonthKey();
  const hasCurrentActivity = [...bookings, ...invoices].some((record) => getRecordMonthKey(record) === currentMonth);
  if (hasCurrentActivity) return currentMonth;

  const latestRecord = [...invoices, ...bookings]
    .filter((record) => record?.invoice_date || record?.created_at || record?.date)
    .sort((a, b) => {
      const aDate = new Date(a.invoice_date || a.created_at || a.date).getTime();
      const bDate = new Date(b.invoice_date || b.created_at || b.date).getTime();
      return bDate - aDate;
    })[0];

  return getRecordMonthKey(latestRecord) || currentMonth;
}

function getPaidAmount(invoice) {
  const cash = Number(invoice?.cash_amount || 0);
  const upi = Number(invoice?.upi_amount || 0);
  const paid = Number(invoice?.paid_amount || 0);
  if (cash || upi) return cash + upi;
  if (paid) return paid;
  return String(invoice?.payment_status || "").toLowerCase() === "paid" ? Number(invoice?.total_amount || 0) : 0;
}

function getDueAmount(invoice) {
  const explicitDue = Number(invoice?.due_amount || 0);
  if (explicitDue) return explicitDue;
  return Math.max(Number(invoice?.total_amount || 0) - getPaidAmount(invoice), 0);
}

function nextMonthlyDate(dateString) {
  const d = new Date((dateString || todayISO()) + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isCompletedStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  return ["completed", "complete", "done", "closed"].includes(value);
}

function getCompletedJobsCount(jobs = [], invoices = []) {
  const completedBookingIds = new Set();

  jobs.forEach((job) => {
    if (isCompletedStatus(job.status)) {
      completedBookingIds.add(String(job.booking_id || job.id));
    }
  });

  invoices.forEach((invoice) => {
    if (invoice.booking_id && !["amc", "new_sale"].includes(invoice.invoice_type)) {
      completedBookingIds.add(String(invoice.booking_id));
    }
  });

  return completedBookingIds.size;
}

function uniqueServices(services = []) {
  const seen = new Set();
  return services.filter((service) => {
    const key = `${String(service.name || "").trim().toLowerCase()}-${Number(service.price || 0)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isActive(record) {
  if (!record) return false;
  return String(record.expiry_date || "") >= todayISO();
}

function arrIncludes(arr, id) {
  return Array.isArray(arr) && arr.map(String).includes(String(id));
}

function itemCoveredByRecord(item, record) {
  if (!record || !item) return false;
  if (record.coverage_type === "all") return true;
  if (record.coverage_type === "none") return false;

  // Electric parts rule: Pump + SMPS only, Membrane not covered.
  if (record.coverage_type === "electric") {
    const name = String(item.name || "").toLowerCase();
    const cat = String(item.category_name || item.category || "").toLowerCase();
    const text = `${name} ${cat}`;
    return text.includes("pump") || text.includes("smps");
  }

  // selected categories/items
  if (record.coverage_type === "selected") {
    return arrIncludes(record.covered_part_ids, item.id) || arrIncludes(record.covered_category_ids, item.category_id);
  }

  return false;
}

function coverageLabel(value) {
  if (value === "all") return "All Parts Covered";
  if (value === "electric") return "Electric Parts (Pump + SMPS)";
  if (value === "selected") return "Selected Parts/Categories";
  if (value === "none") return "No Parts Covered";
  return "Selected Coverage";
}

async function saveJobAssignment(bookingId, technicianId) {
  const { data: existing, error: findError } = await supabase
    .from("job_assignments")
    .select("id")
    .eq("booking_id", bookingId)
    .limit(1)
    .maybeSingle();

  if (findError) return { error: findError };

  if (existing?.id) {
    return supabase
      .from("job_assignments")
      .update({ technician_id: technicianId, status: "Assigned" })
      .eq("id", existing.id);
  }

  return supabase
    .from("job_assignments")
    .insert([{ booking_id: bookingId, technician_id: technicianId, status: "Assigned" }]);
}

export default function App() {
  const [page, setPage] = useState("login");
  const [reportFilter, setReportFilter] = useState("all");
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [amcPlans, setAmcPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [coverages, setCoverages] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [usage, setUsage] = useState([]);
  const [inventoryPurchases, setInventoryPurchases] = useState([]);
  const [businessSettings, setBusinessSettings] = useState(null);
  const [leads, setLeads] = useState([]);
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [dataErrors, setDataErrors] = useState([]);


  async function downloadBackup() {
    try {
      const tables = [
        "services",
        "technicians",
        "telecallers",
        "customers",
        "bookings",
        "job_assignments",
        "part_categories",
        "inventory_items",
        "inventory_purchases",
        "amc_plans",
        "ro_products",
        "customer_coverages",
        "invoices",
        "invoice_payments",
        "invoice_items",
        "inventory_usage",
        "business_settings",
        "user_roles",
        "leads"
      ];

      const backup = {
        app: "AquaBiz",
        backup_date: new Date().toISOString(),
        version: "json-backup-v1",
        tables: {}
      };

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*");

        if (error) {
          backup.tables[table] = { error: error.message, data: [] };
          continue;
        }

        backup.tables[table] = { count: data?.length || 0, data: data || [] };
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];

      a.href = url;
      a.download = `aquabiz-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
      alert("Backup downloaded successfully.");
    } catch (err) {
      console.error("Backup failed", err);
      alert("Backup failed. Please check console.");
    }
  }

  async function restoreBackup(event) {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const confirmRestore = window.confirm(
        "Restore backup? This will add/update records from the selected JSON file."
      );

      if (!confirmRestore) {
        event.target.value = "";
        return;
      }

      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup?.tables) {
        alert("Invalid AquaBiz backup file.");
        event.target.value = "";
        return;
      }

      const restoreOrder = [
        "services",
        "technicians",
        "telecallers",
        "customers",
        "bookings",
        "job_assignments",
        "part_categories",
        "inventory_items",
        "inventory_purchases",
        "amc_plans",
        "ro_products",
        "customer_coverages",
        "invoices",
        "invoice_payments",
        "invoice_items",
        "inventory_usage",
        "business_settings",
        "user_roles",
        "leads"
      ];

      let restored = 0;
      const errors = [];

      for (const table of restoreOrder) {
        const records = backup.tables?.[table]?.data || [];
        if (!records.length) continue;

        const { error } = await supabase.from(table).upsert(records, { onConflict: "id" });

        if (error) {
          console.error(`Restore error in ${table}:`, error);
          errors.push(`${table}: ${error.message}`);
          continue;
        }

        restored += records.length;
      }

      event.target.value = "";
      await loadAll();

      if (errors.length) {
        alert(`Restore completed with some errors.\nRestored records: ${restored}\nErrors:\n${errors.slice(0, 5).join("\n")}`);
      } else {
        alert(`Restore completed successfully.\nRestored records: ${restored}`);
      }
    } catch (err) {
      console.error("Restore failed", err);
      alert("Restore failed. Please check backup file and console.");
      event.target.value = "";
    }
  }


async function loadAll() {
    setLoading(true);

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
      businessSettingsRes,
      inventoryPurchasesRes,
      leadsRes,
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
      supabase.from("business_settings").select("*").limit(1).maybeSingle(),
      supabase.from("inventory_purchases").select("*").order("restock_date", { ascending: false }),
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
    ]);

    const responseNames = [
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
      ["business_settings", businessSettingsRes],
      ["inventory_purchases", inventoryPurchasesRes],
      ["leads", leadsRes],
    ];
    const loadErrors = responseNames
      .filter(([, res]) => res?.error)
      .map(([name, res]) => `${name}: ${res.error.message}`);

    if (loadErrors.length) {
      console.error("AquaBiz data load errors:", loadErrors);
    }
    setDataErrors(loadErrors);

    setServices(servicesRes.data || []);
    setTechnicians(techRes.data || []);
    setTelecallers(telecallerRes.data || []);
    setBookings(bookingsRes.data || []);
    setJobs(jobsRes.data || []);
    setCustomersCount(customersRes.count || 0);
    setCustomers(customersFullRes.data || []);
    setCategories(categoryRes.data || []);
    setInventory((inventoryRes.data || []).map((item) => ({
      ...item,
      category_name: (categoryRes.data || []).find((c) => String(c.id) === String(item.category_id))?.name || item.category || "Other",
    })));
    setAmcPlans(planRes.data || []);
    setProducts(productRes.data || []);
    setCoverages(coverageRes.data || []);
    setInvoices(invoiceRes.data || []);
    setInvoicePayments(invoicePaymentsRes.data || []);
    setInvoiceItems(invoiceItemsRes.data || []);
    setUsage(usageRes.data || []);
    setBusinessSettings(businessSettingsRes.data || null);
    setLeads(leadsRes.data || []);
    setLanguage(businessSettingsRes.data?.app_language || "en");
    setInventoryPurchases(inventoryPurchasesRes.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setAuthUser(data.session.user);
        setPage("dashboard");
      }
      setAuthLoading(false);
    }

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
      } else {
        setAuthUser(null);
        setPage("login");
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const stats = useMemo(() => {
    const month = getDashboardMonthKey(bookings, invoices);
    const currentMonthInvoices = invoices.filter((i) => getRecordMonthKey(i) === month);
    const currentMonthAmc = currentMonthInvoices.filter((i) => i.invoice_type === "amc");
    const currentMonthSales = currentMonthInvoices.filter((i) => i.invoice_type === "new_sale");
    const currentMonthService = currentMonthInvoices.filter((i) => !["amc", "new_sale"].includes(i.invoice_type));
    const currentMonthBookings = bookings.filter((b) => getRecordMonthKey(b) === month);
    const totalCollection = currentMonthInvoices.reduce((sum, i) => sum + getPaidAmount(i), 0);
    const pending = currentMonthInvoices.reduce((sum, i) => sum + getDueAmount(i), 0);
    const assignedIds = new Set(jobs.map((j) => String(j.booking_id)));
    const lowStock = inventory.filter((p) => Number(p.stock_qty || 0) <= Number(p.low_stock_qty || 0)).length;
    const serviceDue = coverages.filter((c) => c.next_service_due_date && String(c.next_service_due_date) <= todayISO() && isActive(c)).length;
    const emiDue = invoices.filter((i) => i.payment_method === "emi" && getDueAmount(i) > 0 && i.emi_next_due_date && String(i.emi_next_due_date) <= todayISO()).length;
    const paymentFollowUpsDue = invoices.filter((i) => getDueAmount(i) > 0 && i.collection_follow_up_date && String(i.collection_follow_up_date) <= todayISO()).length;
    const leadFollowUpsDue = leads.filter((l) => l.follow_up_date && String(l.follow_up_date) <= todayISO() && !["Converted", "Lost"].includes(l.status)).length;
    const remindersDue = serviceDue + emiDue + paymentFollowUpsDue + leadFollowUpsDue;
    const completedJobs = getCompletedJobsCount(jobs, invoices);

    return {
      monthInvoices: currentMonthInvoices.length,
      month,
      currentMonthSales: currentMonthSales.reduce((s, i) => s + getPaidAmount(i), 0),
      currentMonthAmc: currentMonthAmc.reduce((s, i) => s + getPaidAmount(i), 0),
      currentMonthService: currentMonthService.reduce((s, i) => s + getPaidAmount(i), 0),
      totalBookings: currentMonthBookings.length || bookings.length,
      totalCollection,
      pending,
      pendingJobs: bookings.filter((b) => !assignedIds.has(String(b.id))).length,
      totalJobs: jobs.length,
      openJobs: Math.max(jobs.length - completedJobs, 0),
      completedJobs,
      lowStock,
      activeCoverages: coverages.filter(isActive).length,
      remindersDue,
      customers: customersCount,
    };
  }, [bookings, jobs, customersCount, inventory, coverages, invoices, leads]);

  
  if (authLoading) {
    return (
      <div className="login-page">
        <section className="login-card">
          <h2>Loading AquaBiz...</h2>
          <p className="muted">Checking login session.</p>
        </section>
      </div>
    );
  }

  if (page === "login" || !authUser) {
    return (
      <LoginScreen
        onAdminLogin={(user) => {
          setAuthUser(user);
          setPage("dashboard");
        }}
        onTechnicianOpen={() => {
          setAuthUser({ id: "technician-mode", email: "technician@aquabiz.local" });
          setPage("technician");
        }}
        onTelecallerOpen={() => {
          setAuthUser({ id: "telecaller-mode", email: "telecaller@aquabiz.local" });
          setPage("telecaller");
        }}
      />
    );
  }

  const isTechnicianMode = authUser?.id === "technician-mode";
  const isTelecallerMode = authUser?.id === "telecaller-mode";

  if (isTechnicianMode) {
    return (
      <div className="app-shell technician-only-shell">
        <TopBar
          title={BRAND}
          onRefresh={loadAll}
          loading={loading}
          language={language}
          setLanguage={setLanguage}
          authUser={authUser}
          onLocalLogout={() => {
            setAuthUser(null);
            setPage("login");
          }}
          onBackup={downloadBackup}
          onRestore={restoreBackup}
        />

        <main className="main-content">
          <TechnicianPanel
            jobs={jobs}
            bookings={bookings}
            technicians={technicians}
            inventory={inventory}
            coverages={coverages}
            invoices={invoices}
            amcPlans={amcPlans}
            products={products}
            onUpdated={loadAll}
          />
        </main>
      </div>
    );
  }

  if (isTelecallerMode) {
    return (
      <div className="app-shell technician-only-shell">
        <TopBar
          title={BRAND}
          onRefresh={loadAll}
          loading={loading}
          language={language}
          setLanguage={setLanguage}
          authUser={authUser}
          onLocalLogout={() => {
            setAuthUser(null);
            setPage("login");
          }}
          onBackup={downloadBackup}
          onRestore={restoreBackup}
        />

        <main className="main-content">
          <TelecallerPanel
            telecallers={telecallers}
            leads={leads}
            services={services}
            technicians={technicians}
            onUpdated={loadAll}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        title={BRAND}
        onRefresh={loadAll}
        loading={loading}
        language={language}
        setLanguage={setLanguage}
        authUser={authUser}
        onLocalLogout={() => {
          setAuthUser(null);
          setPage("login");
        }}
        onBackup={downloadBackup}
          onRestore={restoreBackup}
        />
      <main className="main-content">
        {page === "dashboard" && (
          <Dashboard
            stats={stats}
            bookings={bookings}
            jobs={jobs}
            technicians={technicians}
            inventory={inventory}
            coverages={coverages}
            invoices={invoices}
            amcPlans={amcPlans}
            products={products}
            leads={leads}
            dataErrors={dataErrors}
            setPage={setPage}
            setReportFilter={setReportFilter}
            language={language}
            onUpdated={loadAll}
          />
        )}

        {page === "booking" && <NewBooking services={services} technicians={technicians} onDone={async () => { await loadAll(); setPage("jobs"); }} />}
        {page === "jobs" && <JobsPage bookings={bookings} jobs={jobs} technicians={technicians} inventory={inventory} coverages={coverages} invoices={invoices}
            amcPlans={amcPlans}
            products={products} onUpdated={loadAll} />}
        {page === "technician" && <TechnicianPanel jobs={jobs} bookings={bookings} technicians={technicians} inventory={inventory} coverages={coverages} invoices={invoices}
            amcPlans={amcPlans}
            products={products} onUpdated={loadAll} />}
        {page === "inventory" && <InventoryPage categories={categories} inventory={inventory} inventoryPurchases={inventoryPurchases} onUpdated={loadAll} />}
        {page === "plans" && <PlansPage categories={categories} inventory={inventory} amcPlans={amcPlans} products={products} onUpdated={loadAll} />}
        {page === "sale" && <AmcSalePage amcPlans={amcPlans} products={products} coverages={coverages} invoices={invoices} onUpdated={loadAll} />}
        {page === "leads" && <LeadsPage leads={leads} onUpdated={loadAll} setPage={setPage} />}
        {page === "collections" && <CollectionsPage invoices={invoices} invoicePayments={invoicePayments} onUpdated={loadAll} />}
        {page === "reminders" && <ReminderCenter coverages={coverages} invoices={invoices} leads={leads} onUpdated={loadAll} />}
        {page === "reports" && <ReportsPage invoices={invoices} invoiceItems={invoiceItems} usage={usage} jobs={jobs} technicians={technicians} bookings={bookings} customers={customers} inventory={inventory} coverages={coverages} leads={leads} initialFilter={reportFilter} />}
        {page === "customers" && <CustomerHistoryPage customers={customers} bookings={bookings} jobs={jobs} technicians={technicians} invoices={invoices} invoiceItems={invoiceItems} invoicePayments={invoicePayments} coverages={coverages} leads={leads} />}
        {page === "business" && <BusinessSettingsPage settings={businessSettings} language={language} setLanguage={setLanguage} onUpdated={loadAll} />}
        {page === "invoices" && <InvoicesPage invoices={invoices} invoiceItems={invoiceItems} invoicePayments={invoicePayments} businessSettings={businessSettings} onUpdated={loadAll} />}
        {page === "settings" && <SettingsPage services={services} setPage={setPage} onUpdated={loadAll} />}
      </main>

      <button className="fab" onClick={() => setPage("booking")}>+</button>
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}


function LoginScreen({ onAdminLogin, onTechnicianOpen, onTelecallerOpen }) {
  const [mode, setMode] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function adminLogin() {
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Email and password are required.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.user) {
      onAdminLogin(data.user);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="logo-mark">💧</div>
        <h1>AquaBiz</h1>
        <p>RO Service Business App</p>
      </section>

      <section className="login-card auth-card">
        <div className="auth-tabs">
          <button className={mode === "admin" ? "active" : ""} onClick={() => setMode("admin")} type="button">
            Admin Login
          </button>
          <button className={mode === "technician" ? "active" : ""} onClick={() => setMode("technician")} type="button">
            Technician Login
          </button>
          <button className={mode === "telecaller" ? "active" : ""} onClick={() => setMode("telecaller")} type="button">
            Telecaller Login
          </button>
        </div>

        {mode === "admin" ? (
          <>
            <h2>Admin / Shop Owner Login</h2>
            <p className="muted">Login with the email and password created in Supabase Authentication.</p>

            <label>Email Address</label>
            <input
              placeholder="admin@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <label>Password</label>
            <input
              placeholder="Enter password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") adminLogin();
              }}
            />

            {message && <div className="error-box">{message}</div>}

            <button className="primary-btn big" onClick={adminLogin} disabled={saving}>
              {saving ? "Logging in..." : "Login to Dashboard"}
            </button>
          </>
        ) : mode === "technician" ? (
          <>
            <h2>Technician Login</h2>
            <p className="muted">Technician login uses mobile number and 6-digit PIN inside the Technician App.</p>

            <button className="primary-btn big" onClick={onTechnicianOpen}>
              Open Technician Login
            </button>

            <button className="ghost-btn" onClick={() => setMode("admin")} type="button">
              Back to Admin Login
            </button>
          </>
        ) : (
          <>
            <h2>Telecaller Login</h2>
            <p className="muted">Telecaller login uses mobile number and 6-digit PIN.</p>

            <button className="primary-btn big" onClick={onTelecallerOpen}>
              Open Telecaller Login
            </button>

            <button className="ghost-btn" onClick={() => setMode("admin")} type="button">
              Back to Admin Login
            </button>
          </>
        )}
      </section>
    </div>
  );
}



function TopBar({ title, onRefresh, loading, language, setLanguage, authUser, onLocalLogout, onBackup, onRestore }) {
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    if (authUser?.id === "technician-mode" || authUser?.id === "telecaller-mode") {
      onLocalLogout?.();
      return;
    }

    await supabase.auth.signOut();
    onLocalLogout?.();
  }

  return (
    <header className="topbar compact-topbar">
      <div className="brand">
        <span className="brand-icon">💧</span>
        <div>
          <strong>{title}</strong>
          {authUser?.email && (
            <small className="admin-email">
              {authUser.email === "technician@aquabiz.local" ? "Technician Mode" : authUser.email === "telecaller@aquabiz.local" ? "Telecaller Mode" : authUser.email}
            </small>
          )}
        </div>
      </div>

      <div className="topbar-menu-wrap">
        <button className="menu-trigger" type="button" onClick={() => setMenuOpen(!menuOpen)}>
          ☰ Menu
        </button>

        {menuOpen && (
          <div className="topbar-dropdown">
            <label>
              Language
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </label>

            <button type="button" onClick={() => { onBackup?.(); setMenuOpen(false); }}>Backup</button>

            <label className="dropdown-upload">
              Restore
              <input type="file" accept="application/json" hidden onChange={(e) => { onRestore?.(e); setMenuOpen(false); }} />
            </label>

            <button type="button" onClick={() => { onRefresh?.(); setMenuOpen(false); }}>
              {loading ? "Loading..." : "Refresh"}
            </button>

            {authUser?.email && (
              <button className="logout-menu-btn" type="button" onClick={logout}>Logout</button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function Dashboard({ stats, bookings, jobs, technicians, inventory, coverages, invoices, amcPlans, products, leads = [], dataErrors = [], onUpdated, setPage, setReportFilter, language }) {
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const recent = bookings.slice(0, 5);
  const coverageReminders = coverages
    .filter((c) => c.next_service_due_date && String(c.next_service_due_date) <= todayISO() && isActive(c))
    .map((c) => ({ ...c, reminder_type: "Service", due_date: c.next_service_due_date }));
  const emiReminders = bookings
    .filter((b) => b.payment_option === "emi" && b.emi_next_due_date && String(b.emi_next_due_date) <= todayISO())
    .map((b) => ({ id: `emi-${b.id}`, customer_name: b.customer_name, mobile: b.mobile, reminder_type: "EMI", due_date: b.emi_next_due_date }));
  const reminders = [...coverageReminders, ...emiReminders].slice(0, 5);
  const t = getText(language);

  function openReport(filter) {
    setReportFilter(filter);
    setPage("reports");
  }

  return (
    <>
      <section className="premium-hero">
        <div>
          <span className="eyebrow">{t.controlCenter}</span>
          <h2>{t.dashboard}</h2>
          <p>{t.heroText}</p>
        </div>
        <button className="hero-btn" onClick={() => setPage("booking")}>
          + New Booking
        </button>
      </section>

      <section className="summary-strip">
        <button onClick={() => openReport("collection")}>
          <span>{t.monthCollection} ({stats.month})</span>
          <strong>{formatINR(stats.totalCollection)}</strong>
        </button>
        <button onClick={() => setPage("collections")}>
          <span>{t.pending}</span>
          <strong>{formatINR(stats.pending)}</strong>
        </button>
        <button onClick={() => openReport("customers")}>
          <span>{t.customers}</span>
          <strong>{stats.customers}</strong>
        </button>
      </section>

      {dataErrors.length > 0 && (
        <section className="error-box dashboard-warning">
          Data load issue found: {dataErrors.slice(0, 3).join(" | ")}
        </section>
      )}

      {invoices.length === 0 && jobs.some((job) => job.status === "Completed") && (
        <section className="error-box dashboard-warning">
          Completed jobs found, but invoices table returned 0 records. Run the Supabase SQL policies again, then refresh.
        </section>
      )}

      <section className="premium-grid">
        <StatCard icon="🛒" label={t.newSales} value={formatINR(stats.currentMonthSales)} onClick={() => openReport("new_sale")} />
        <StatCard icon="🛡️" label={t.amcSales} value={formatINR(stats.currentMonthAmc)} onClick={() => openReport("amc")} />
        <StatCard icon="I" label="Invoices" value={invoices.length} onClick={() => setPage("invoices")} />
        <StatCard icon="L" label="Leads" value={leads.length} onClick={() => setPage("leads")} />
        <StatCard icon="📋" label={t.bookings} value={stats.totalBookings} onClick={() => openReport("bookings")} />
        <StatCard icon="J" label="Total Jobs" value={stats.totalJobs} onClick={() => setPage("jobs")} />
        <StatCard icon="O" label="Open Jobs" value={stats.openJobs} onClick={() => setPage("jobs")} />
        <StatCard icon="🔔" label={t.reminders} value={stats.remindersDue} onClick={() => setPage("reminders")} />
        <StatCard icon="⚠️" label={t.lowStock} value={stats.lowStock} onClick={() => openReport("low_stock")} />
        <StatCard icon="👨‍🔧" label={t.completedJobs} value={stats.completedJobs} onClick={() => openReport("completed_jobs")} />
      </section>

      <section className="action-panel">
        <div className="section-head">
          <div>
            <h3>{t.quickActions}</h3>
            <p>{t.shortcuts}</p>
          </div>
        </div>
        <div className="action-grid">
          <button onClick={() => setPage("booking")}>{t.newBooking}</button>
          <button onClick={() => setPage("leads")}>Leads</button>
          <button onClick={() => setPage("sale")}>{t.amcNewSale}</button>
          <button onClick={() => setPage("collections")}>Collections</button>
          <button onClick={() => setPage("reminders")}>Reminders</button>
          <button onClick={() => setPage("plans")}>{t.plansProducts}</button>
          <button onClick={() => setPage("inventory")}>{t.inventory}</button>
          <button onClick={() => setPage("reports")}>{t.reports}</button>
          <button onClick={() => setPage("business")}>{t.businessSettings}</button>
          <button onClick={() => setPage("customers")}>{t.customerHistory}</button>
          <button onClick={() => setPage("technician")}>{t.technicianApp}</button>
        </div>
      </section>

      <section className="dashboard-columns">
        <section className="panel premium-panel">
          <div className="section-head">
            <div>
              <h3>{t.serviceReminders}</h3>
              <p>{t.dueOverdue}</p>
            </div>
            <button className="link-btn" onClick={() => setPage("reminders")}>{t.view}</button>
          </div>

          {reminders.length === 0 ? (
            <div className="empty-state">
              <strong>{t.noReminders}</strong>
              <p>{t.remindersEmpty}</p>
            </div>
          ) : (
            reminders.map((r) => (
              <div className="premium-list-row" key={r.id}>
                <div>
                  <strong>{r.customer_name}</strong>
                  <p>{r.mobile} • {r.reminder_type} Due: {r.due_date}</p>
                </div>
                <div className="row-actions">
                  <a className="ghost-btn small" href={`tel:${r.mobile}`}>Call</a>
                  <a className="ghost-btn small" href={`https://wa.me/91${r.mobile}`} target="_blank" rel="noreferrer">WA</a>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="panel premium-panel">
          <div className="section-head">
            <div>
              <h3>{t.recentBookings}</h3>
              <p>{t.latestRequests}</p>
            </div>
            <button className="link-btn" onClick={() => setPage("jobs")}>{t.allJobs}</button>
          </div>

          {recent.length === 0 ? (
            <div className="empty-state">
              <strong>{t.noBookings}</strong>
              <p>New bookings will appear here.</p>
            </div>
          ) : (
            recent.map((b) => {
              const job = jobs.find((j) => String(j.booking_id) === String(b.id));
              const hasInvoice = invoices.some((i) => String(i.booking_id) === String(b.id));
              return (
                <div className="premium-booking-card" key={b.id}>
                  <div className="booking-card-head">
                    <div>
                      <strong>{b.customer_name}</strong>
                      <p>{b.mobile}</p>
                    </div>
                    <span className={job ? "status assigned" : "status unassigned"}>
                      {job ? job.status : "Unassigned"}
                    </span>
                  </div>
                  <p>{b.service_type} • {formatINR(b.booking_amount)}</p>
                  {b.complaint_notes && <p className="muted">Notes: {b.complaint_notes}</p>}
                  <div className="row-actions">
                    {!job && <button className="ghost-btn small" onClick={() => setPage("jobs")}>Assign</button>}
                    {job && !hasInvoice && (
                      <button className="primary-btn small" onClick={() => setInvoiceJobId(invoiceJobId === job.id ? null : job.id)}>
                        Invoice
                      </button>
                    )}
                    {hasInvoice && <span className="status assigned">Invoice Generated</span>}
                  </div>

                  {invoiceJobId === job?.id && (
                    <InvoiceBuilder
                      job={job}
                      booking={b}
                      inventory={inventory}
                      coverages={coverages}
                      invoices={invoices}
                      amcPlans={amcPlans}
                      products={products}
                      onClose={() => setInvoiceJobId(null)}
                      onDone={async () => {
                        setInvoiceJobId(null);
                        await onUpdated();
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </section>
      </section>
    </>
  );
}


function StatCard({ icon, label, value, onClick }) {
  const content = (
    <>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-arrow">→</span>
      </div>
      <strong>{value}</strong>
      <small>{label}</small>
    </>
  );

  if (onClick) {
    return (
      <button className="stat-card premium-stat clickable" type="button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="stat-card premium-stat">{content}</div>;
}

function NewBooking({ services, technicians, onDone }) {
  const [form, setForm] = useState(emptyBooking);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const cleanServices = uniqueServices(services);
  const selectedService = cleanServices.find((s) => s.id === form.serviceId) || cleanServices[0];
  const serviceAmount = Number(selectedService?.price || 0);

  useEffect(() => {
    if (!form.serviceId && cleanServices[0]?.id) setForm((prev) => ({ ...prev, serviceId: cleanServices[0].id }));
  }, [cleanServices, form.serviceId]);

  async function saveBooking() {
    setMessage("");
    if (!form.name.trim() || !form.mobile.trim() || !form.address.trim()) {
      setMessage("Name, mobile, and address are required.");
      return;
    }
    if (!selectedService?.id) {
      setMessage("Please add/select a service price first from More > Admin Settings.");
      return;
    }
    setSaving(true);
    const cleanMobile = form.mobile.trim();

    const { data: existingCustomer, error: customerFindError } = await supabase.from("customers").select("*").eq("mobile", cleanMobile).limit(1).maybeSingle();
    if (customerFindError) { setMessage("Customer check error: " + customerFindError.message); setSaving(false); return; }

    if (!existingCustomer) {
      const { error } = await supabase.from("customers").insert([{ name: form.name.trim(), mobile: cleanMobile, address: form.address.trim() }]);
      if (error) { setMessage("Customer save error: " + error.message); setSaving(false); return; }
    }

    const { data: booking, error: bookingError } = await supabase.from("bookings").insert([{
      customer_name: form.name.trim(),
      mobile: cleanMobile,
      service_type: selectedService?.name || "Service",
      payment_option: "pending",
      booking_amount: serviceAmount,
      address: form.address.trim(),
      complaint_notes: form.complaintNotes.trim(),
    }]).select().single();

    if (bookingError) { setMessage("Booking save error: " + bookingError.message); setSaving(false); return; }

    if (form.technicianId) {
      const { error: jobError } = await saveJobAssignment(booking.id, form.technicianId);
      if (jobError) { setMessage("Booking saved, but technician assign error: " + jobError.message); setSaving(false); return; }
    }

    setMessage("Booking saved successfully.");
    setSaving(false);
    await onDone();
  }

  return (
    <>
      <section className="page-head"><h2>New Booking</h2><p>Technician assignment is optional. You can assign later from the Jobs page.</p></section>
      <section className="form-stack">
        <FormCard label="Customer Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" autoComplete="off" /></FormCard>
        <FormCard label="Mobile Number"><input name="ro_customer_mobile_new" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="Enter customer mobile number" inputMode="numeric" autoComplete="new-password" /></FormCard>
        <FormCard label="Service Type">{cleanServices.length === 0 ? <div className="error-box">No services found. Open More → Admin Settings and add service prices.</div> : <div className="chip-grid">{cleanServices.map((s) => <button key={s.id} className={form.serviceId === s.id ? "chip active" : "chip"} onClick={() => setForm({ ...form, serviceId: s.id })} type="button"><span>{s.name}</span><strong>{formatINR(s.price)}</strong></button>)}</div>}</FormCard>
        <FormCard label="Service Address"><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House no, street, area, city" rows={3} autoComplete="off" /></FormCard>
        <FormCard label="Final Service Amount"><div className="amount-box"><strong>{selectedService?.name || "Service"}</strong><strong>{formatINR(serviceAmount)}</strong></div></FormCard>
        <FormCard label="Technician Assignment Optional"><select value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}><option value="">Skip now — assign later from Jobs page</option>{technicians.map((t) => <option value={t.id} key={t.id}>{t.name} ({t.mobile})</option>)}</select></FormCard>
        <FormCard label="Complaint Notes"><input value={form.complaintNotes} onChange={(e) => setForm({ ...form, complaintNotes: e.target.value })} placeholder="Leakage, low flow, filter change etc." autoComplete="off" /></FormCard>
        {message && <div className={message.includes("error") ? "error-box" : "success-box"}>{message}</div>}
        <button className="primary-btn big" onClick={saveBooking} disabled={saving}>{saving ? "Saving..." : "Confirm Booking"}</button>
      </section>
    </>
  );
}

function JobsPage({ bookings, jobs, technicians, inventory, coverages, invoices, amcPlans, products, onUpdated }) {
  const [selectedTech, setSelectedTech] = useState({});
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const assignedBookingIds = new Set(jobs.map((j) => String(j.booking_id)));
  const unassignedBookings = bookings.filter((b) => !assignedBookingIds.has(String(b.id)));

  async function assignJob(bookingId) {
    const technicianId = selectedTech[bookingId];
    if (!technicianId) return alert("Please select technician.");
    const { error } = await saveJobAssignment(bookingId, technicianId);
    if (error) return alert(error.message);
    await onUpdated();
  }

  async function updateStatus(jobId, status) {
    const { error } = await supabase.from("job_assignments").update({ status }).eq("id", jobId);
    if (error) alert(error.message);
    await onUpdated();
  }

  return (
    <>
      <section className="page-head"><h2>Jobs & Assignment</h2><p>Assign unassigned bookings and generate invoices for completed jobs.</p></section>

      <section className="panel">
        <h3>Unassigned Bookings</h3>
        {unassignedBookings.length === 0 ? <p className="muted">No unassigned bookings.</p> : unassignedBookings.map((b) => (
          <div className="job-card" key={b.id}>
            <BookingMini booking={b} />
            <select value={selectedTech[b.id] || ""} onChange={(e) => setSelectedTech({ ...selectedTech, [b.id]: e.target.value })}>
              <option value="">Select Technician</option>{technicians.map((t) => <option value={t.id} key={t.id}>{t.name} ({t.mobile})</option>)}
            </select>
            <button className="primary-btn" onClick={() => assignJob(b.id)}>Assign Technician</button>
          </div>
        ))}
      </section>

      <section className="panel">
        <h3>Assigned Jobs</h3>
        {jobs.length === 0 ? <p className="muted">No assigned jobs.</p> : jobs.map((job) => {
          const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
          const tech = technicians.find((t) => String(t.id) === String(job.technician_id));
          const hasInvoice = invoices.some((i) => String(i.booking_id) === String(job.booking_id));
          return (
            <div className="job-card" key={job.id}>
              {booking ? <BookingMini booking={booking} /> : <p className="muted">Booking not found</p>}
              <p><strong>Technician:</strong> {tech?.name || "Unknown technician"}</p>
              <p><strong>Status:</strong> {job.status}</p>
              <div className="row-actions">
                {["Assigned", "In Progress", "Completed"].map((s) => <button key={s} className="ghost-btn small" onClick={() => updateStatus(job.id, s)}>{s}</button>)}
                {!hasInvoice && <button className="primary-btn small" onClick={() => setInvoiceJobId(invoiceJobId === job.id ? null : job.id)}>Generate Invoice</button>}
                {hasInvoice && <span className="status assigned">Invoice Generated</span>}
              </div>
              {invoiceJobId === job.id && (
                <InvoiceBuilder job={job} booking={booking} inventory={inventory} coverages={coverages} invoices={invoices}
                  amcPlans={amcPlans}
                  products={products} onClose={() => setInvoiceJobId(null)} onDone={async () => { setInvoiceJobId(null); await onUpdated(); }} />
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}


function TelecallerPanel({ telecallers, leads, services, technicians, onUpdated }) {
  const [login, setLogin] = useState({ mobile: "", pin: "" });
  const [loggedInTelecaller, setLoggedInTelecaller] = useState(null);
  const [tab, setTab] = useState("leads");
  const [message, setMessage] = useState("");

  function handleLogin() {
    setMessage("");
    const cleanMobile = login.mobile.trim();
    const cleanPin = login.pin.trim();

    if (!cleanMobile || !cleanPin) {
      setMessage("Mobile number and 6-digit PIN are required.");
      return;
    }

    const user = telecallers.find(
      (t) =>
        String(t.mobile || "").trim() === cleanMobile &&
        String(t.pin || "").trim() === cleanPin
    );

    if (!user) {
      setMessage("Invalid mobile number or PIN.");
      return;
    }

    setLoggedInTelecaller(user);
    setLogin({ mobile: "", pin: "" });
  }

  if (!loggedInTelecaller) {
    return (
      <>
        <section className="page-head">
          <h2>Telecaller Login</h2>
          <p>Telecaller logs in using mobile number and 6-digit PIN.</p>
        </section>

        <section className="panel">
          <div className="form-stack">
            <input placeholder="Telecaller mobile number" inputMode="numeric" value={login.mobile} onChange={(e) => setLogin({ ...login, mobile: e.target.value })} />
            <input placeholder="6 digit PIN" inputMode="numeric" maxLength="6" type="password" value={login.pin} onChange={(e) => setLogin({ ...login, pin: e.target.value })} />
            {message && <div className="error-box">{message}</div>}
            <button className="primary-btn big" onClick={handleLogin}>Login</button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="page-head">
        <h2>Telecaller App</h2>
        <p>Logged in: {loggedInTelecaller.name} ({loggedInTelecaller.mobile})</p>
      </section>

      <section className="panel">
        <div className="row-actions">
          <button className={tab === "leads" ? "primary-btn small" : "ghost-btn small"} onClick={() => setTab("leads")}>Leads</button>
          <button className={tab === "booking" ? "primary-btn small" : "ghost-btn small"} onClick={() => setTab("booking")}>New Booking</button>
          <button className="ghost-btn small" onClick={() => setLoggedInTelecaller(null)}>Logout</button>
        </div>
      </section>

      {tab === "leads" ? (
        <LeadsPage leads={leads} onUpdated={onUpdated} setPage={() => setTab("booking")} />
      ) : (
        <NewBooking services={services} technicians={technicians} onDone={onUpdated} />
      )}
    </>
  );
}


function TechnicianPanel({ jobs, bookings, technicians, inventory, coverages, invoices, amcPlans, products, onUpdated }) {
  const [login, setLogin] = useState({ mobile: "", pin: "" });
  const [loggedInTech, setLoggedInTech] = useState(null);
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [message, setMessage] = useState("");

  const filteredJobs = loggedInTech
    ? jobs.filter((job) => String(job.technician_id) === String(loggedInTech.id))
    : [];

  function handleLogin() {
    setMessage("");

    const cleanMobile = login.mobile.trim();
    const cleanPin = login.pin.trim();

    if (!cleanMobile || !cleanPin) {
      setMessage("Mobile number and 6-digit PIN are required.");
      return;
    }

    const tech = technicians.find(
      (t) =>
        String(t.mobile || "").trim() === cleanMobile &&
        String(t.pin || "").trim() === cleanPin
    );

    if (!tech) {
      setMessage("Invalid mobile number or PIN.");
      return;
    }

    setLoggedInTech(tech);
    setLogin({ mobile: "", pin: "" });
    setInvoiceJobId(null);
    setMessage("");
  }

  function logout() {
    setLoggedInTech(null);
    setInvoiceJobId(null);
    setMessage("");
  }

  async function updateStatus(jobId, status) {
    const { error } = await supabase
      .from("job_assignments")
      .update({ status })
      .eq("id", jobId);

    if (error) {
      alert(error.message);
      return;
    }

    await onUpdated();
  }

  if (!loggedInTech) {
    return (
      <>
        <section className="page-head">
          <h2>Technician App Login</h2>
          <p>Technician logs in using mobile number and 6-digit PIN.</p>
        </section>

        <section className="panel">
          <h3>Login</h3>

          <div className="form-stack">
            <input
              placeholder="Technician mobile number"
              inputMode="numeric"
              value={login.mobile}
              onChange={(e) => setLogin({ ...login, mobile: e.target.value })}
              autoComplete="off"
            />

            <input
              placeholder="6 digit PIN"
              inputMode="numeric"
              maxLength="6"
              type="password"
              value={login.pin}
              onChange={(e) => setLogin({ ...login, pin: e.target.value })}
              autoComplete="new-password"
            />

            {message && <div className="error-box">{message}</div>}

            <button className="primary-btn big" onClick={handleLogin}>
              Login
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="page-head">
        <h2>Technician App</h2>
        <p>Logged in: {loggedInTech.name} ({loggedInTech.mobile})</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>My Jobs</h3>
          <button className="ghost-btn small" onClick={logout}>Logout</button>
        </div>

        {filteredJobs.length === 0 ? (
          <p className="muted">No jobs assigned to you.</p>
        ) : (
          filteredJobs.map((job) => {
            const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
            const hasInvoice = invoices.some((i) => String(i.booking_id) === String(job.booking_id));

            return (
              <div className="job-card" key={job.id}>
                {booking ? <BookingMini booking={booking} /> : <p className="muted">Booking not found.</p>}

                <p>
                  <strong>Status:</strong> {job.status}
                </p>

                <div className="row-actions">
                  <a className="ghost-btn small" href={`tel:${booking?.mobile || ""}`}>
                    Call
                  </a>

                  <a
                    className="ghost-btn small"
                    href={`https://wa.me/91${booking?.mobile || ""}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>

                  <button
                    className="primary-btn small"
                    onClick={() => updateStatus(job.id, "In Progress")}
                  >
                    Start Job
                  </button>

                  <button
                    className="primary-btn small"
                    onClick={() => updateStatus(job.id, "Completed")}
                  >
                    Mark Completed
                  </button>

                  {!hasInvoice && booking && (
                    <button
                      className="primary-btn small"
                      onClick={() => setInvoiceJobId(invoiceJobId === job.id ? null : job.id)}
                    >
                      Generate Invoice
                    </button>
                  )}

                  {hasInvoice && <span className="status assigned">Invoice Generated</span>}
                </div>

                {invoiceJobId === job.id && booking && (
                  <InvoiceBuilder
                    job={job}
                    booking={booking}
                    inventory={inventory}
                    coverages={coverages}
                    invoices={invoices}
                    amcPlans={amcPlans}
                    products={products}
                    onClose={() => setInvoiceJobId(null)}
                    onDone={async () => {
                      setInvoiceJobId(null);
                      await onUpdated();
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </section>
    </>
  );
}


function InvoiceBuilder({ job, booking, inventory, coverages, invoices, amcPlans = [], products = [], onClose, onDone }) {
  const [invoiceType, setInvoiceType] = useState("service");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [selectedPart, setSelectedPart] = useState("");
  const [qty, setQty] = useState("1");
  const [parts, setParts] = useState([]);
  const [paymentMode, setPaymentMode] = useState("split");
  const [cashAmount, setCashAmount] = useState("0");
  const [upiAmount, setUpiAmount] = useState("0");
  const [emiMonths, setEmiMonths] = useState("6");
  const [emiStartDate, setEmiStartDate] = useState(todayISO());
  const [emiNotes, setEmiNotes] = useState("");
  const [message, setMessage] = useState("");

  const selectedPlan = amcPlans.find((p) => String(p.id) === String(selectedPlanId));
  const selectedProduct = products.find((p) => String(p.id) === String(selectedProductId));

  const activeCoverage = coverages?.find((a) => String(a.mobile) === String(booking?.mobile) && isActive(a));
  const serviceCovered = invoiceType === "service" && activeCoverage && Number(activeCoverage.used_visits || 0) < Number(activeCoverage.free_visits || 0);

  const baseServiceCharge = Number(booking?.booking_amount || 0);
  const serviceCharge = invoiceType === "service" ? (serviceCovered ? 0 : baseServiceCharge) : 0;

  const planAmount = invoiceType === "amc" ? Number(selectedPlan?.price || 0) : 0;
  const productAmount = invoiceType === "new_sale" ? Number(selectedProduct?.price || 0) : 0;
  const partsTotal = parts.reduce((sum, p) => sum + Number(p.billing_price || 0) * Number(p.quantity || 0), 0);
  const discountAmount = Number(discount || 0);
  const subtotal = serviceCharge + planAmount + productAmount + partsTotal;
  const total = Math.max(subtotal - discountAmount, 0);

  const paidAmount = Number(cashAmount || 0) + Number(upiAmount || 0);
  const dueAmount = Math.max(total - paidAmount, 0);
  const paymentStatus = paidAmount <= 0 ? "Pending" : paidAmount >= total ? "Paid" : "Partial";
  const safeEmiMonths = Math.max(Number(emiMonths || 1), 1);
  const monthlyEmi = Math.ceil(dueAmount / safeEmiMonths);
  const paymentMethod =
    paymentMode === "emi"
      ? "emi"
      : paymentMode === "pending"
        ? "pending"
        :
    Number(cashAmount || 0) > 0 && Number(upiAmount || 0) > 0
      ? "cash_upi"
      : Number(cashAmount || 0) > 0
        ? "cash"
        : Number(upiAmount || 0) > 0
          ? "upi"
          : "pending";

  function addPart() {
    const item = inventory.find((p) => String(p.id) === String(selectedPart));
    if (!item) return;

    const covered = invoiceType === "service" && activeCoverage && itemCoveredByRecord(item, activeCoverage);
    const selling = Number(item.selling_price || 0);

    setParts([
      ...parts,
      {
        inventory_item_id: item.id,
        part_name: item.name,
        category: item.category_name,
        quantity: Number(qty || 1),
        actual_selling_price: selling,
        billing_price: covered ? 0 : selling,
        is_covered: !!covered,
        covered_reason: covered ? "Covered under AMC/Warranty" : "",
      },
    ]);

    setSelectedPart("");
    setQty("1");
  }

  async function createCoverageFromInvoice(invoiceId) {
    const invoiceDate = todayISO();

    const source = invoiceType === "amc" ? selectedPlan : selectedProduct;
    if (!source) return null;

    const validityDays =
      invoiceType === "amc"
        ? Number(source.validity_days || 365)
        : Number(source.warranty_validity_days || 365);

    const expiryDate = addDays(invoiceDate, validityDays - 1);
    const reminderDays = Number(source.service_reminder_days || 90);
    const nextServiceDue = addDays(invoiceDate, reminderDays);

    const payload = {
      customer_name: booking.customer_name,
      mobile: booking.mobile,
      source_type: invoiceType,
      source_id: source.id,
      source_name: source.name,
      coverage_type: source.coverage_type,
      covered_category_ids: source.covered_category_ids || [],
      covered_part_ids: source.covered_part_ids || [],
      free_visits: source.free_visits_enabled ? Number(source.free_visits || 0) : 0,
      used_visits: 0,
      activation_date: invoiceDate,
      validity_days: validityDays,
      expiry_date: expiryDate,
      service_reminder_days: reminderDays,
      next_service_due_date: nextServiceDue,
      notes: source.notes || "",
    };

    const { data, error } = await supabase.from("customer_coverages").insert([payload]).select().single();
    if (error) throw error;
    return data;
  }

  async function generateInvoice() {
    setMessage("");

    if (!booking) return setMessage("Booking missing.");

    const already = invoices.find((i) => String(i.booking_id) === String(booking.id));
    if (already) return setMessage("Invoice already generated for this booking.");

    if (invoiceType === "amc" && !selectedPlan) return setMessage("Please select an AMC plan.");
    if (invoiceType === "new_sale" && !selectedProduct) return setMessage("Please select an RO product.");

    for (const part of parts) {
      const inv = inventory.find((p) => String(p.id) === String(part.inventory_item_id));
      if (inv && Number(inv.stock_qty || 0) < Number(part.quantity || 0)) {
        return setMessage(`${part.part_name} stock not enough.`);
      }
    }

    let createdCoverage = null;

    if (invoiceType === "amc" || invoiceType === "new_sale") {
      // Create invoice first with no coverage_id, then activate coverage and update invoice.
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert([
        {
          invoice_type: invoiceType,
          booking_id: booking.id,
          customer_name: booking.customer_name,
          mobile: booking.mobile,
          service_charge: serviceCharge,
          parts_charge: partsTotal,
          discount: discountAmount,
          total_amount: total,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          cash_amount: Number(cashAmount || 0),
          upi_amount: Number(upiAmount || 0),
          paid_amount: paidAmount,
          due_amount: dueAmount,
          emi_total_amount: paymentMode === "emi" ? total : 0,
          emi_advance_amount: paymentMode === "emi" ? paidAmount : 0,
          emi_monthly_amount: paymentMode === "emi" ? monthlyEmi : 0,
          emi_months: paymentMode === "emi" ? safeEmiMonths : 0,
          emi_start_date: paymentMode === "emi" ? emiStartDate : null,
          emi_next_due_date: paymentMode === "emi" ? emiStartDate : null,
          emi_notes: paymentMode === "emi" ? emiNotes.trim() : "",
          coverage_id: activeCoverage?.id || null,
        },
      ])
      .select()
      .single();

    if (invoiceError) return setMessage(invoiceError.message);

    if (invoiceType === "amc" || invoiceType === "new_sale") {
      try {
        createdCoverage = await createCoverageFromInvoice(invoice.id);
        if (createdCoverage?.id) {
          await supabase.from("invoices").update({ coverage_id: createdCoverage.id }).eq("id", invoice.id);
        }
      } catch (err) {
        return setMessage("Invoice saved, but coverage activation error: " + err.message);
      }
    }

    const items = [];

    if (invoiceType === "service") {
      items.push({
        invoice_id: invoice.id,
        item_type: "service",
        item_name: booking.service_type,
        quantity: 1,
        actual_price: baseServiceCharge,
        billing_price: serviceCharge,
        is_covered: !!serviceCovered,
        covered_reason: serviceCovered ? "Free service visit used" : "",
      });
    }

    if (invoiceType === "amc" && selectedPlan) {
      items.push({
        invoice_id: invoice.id,
        item_type: "amc",
        item_name: selectedPlan.name,
        quantity: 1,
        actual_price: planAmount,
        billing_price: Math.max(planAmount - discountAmount, 0),
        is_covered: false,
        covered_reason: "",
      });
    }

    if (invoiceType === "new_sale" && selectedProduct) {
      items.push({
        invoice_id: invoice.id,
        item_type: "new_sale",
        item_name: selectedProduct.name,
        quantity: 1,
        actual_price: productAmount,
        billing_price: Math.max(productAmount - discountAmount, 0),
        is_covered: false,
        covered_reason: "",
      });
    }

    const partItems = parts.map((p) => ({
      invoice_id: invoice.id,
      item_type: "part",
      inventory_item_id: p.inventory_item_id,
      item_name: p.part_name,
      quantity: p.quantity,
      actual_price: p.actual_selling_price,
      billing_price: p.billing_price,
      is_covered: p.is_covered,
      covered_reason: p.covered_reason,
    }));

    const { error: itemsError } = await supabase.from("invoice_items").insert([...items, ...partItems]);
    if (itemsError) return setMessage(itemsError.message);

    for (const part of parts) {
      const inv = inventory.find((p) => String(p.id) === String(part.inventory_item_id));
      if (inv) {
        const newStock = Number(inv.stock_qty || 0) - Number(part.quantity || 0);
        await supabase.from("inventory_items").update({ stock_qty: newStock }).eq("id", inv.id);
        await supabase.from("inventory_usage").insert([
          {
            booking_id: booking.id,
            invoice_id: invoice.id,
            inventory_item_id: part.inventory_item_id,
            part_name: part.part_name,
            quantity: part.quantity,
            actual_selling_price: part.actual_selling_price,
            billing_price: part.billing_price,
            is_covered: part.is_covered,
            covered_reason: part.covered_reason,
            technician_id: job.technician_id,
          },
        ]);
      }
    }

    if (serviceCovered && activeCoverage) {
      const nextServiceDate = addDays(todayISO(), Number(activeCoverage.service_reminder_days || 90));
      await supabase
        .from("customer_coverages")
        .update({
          used_visits: Number(activeCoverage.used_visits || 0) + 1,
          last_service_date: todayISO(),
          next_service_due_date: nextServiceDate,
        })
        .eq("id", activeCoverage.id);
    }

    if (paymentMode === "emi") {
      await supabase
        .from("bookings")
        .update({
          payment_option: "emi",
          emi_total_amount: total,
          emi_advance_amount: paidAmount,
          emi_monthly_amount: monthlyEmi,
          emi_months: safeEmiMonths,
          emi_start_date: emiStartDate,
          emi_next_due_date: emiStartDate,
          emi_notes: emiNotes.trim(),
        })
        .eq("id", booking.id);
    }

    await supabase.from("job_assignments").update({ status: "Completed" }).eq("id", job.id);

    setMessage("Invoice generated successfully.");
    await onDone();
  }

  return (
    <section className="modal-card inline-invoice">
      <div className="panel-head">
        <h3>Generate Invoice</h3>
        <button className="ghost-btn small" onClick={onClose}>Close</button>
      </div>

      <FormCard label="Invoice Type">
        <div className="chip-grid">
          <button className={invoiceType === "service" ? "chip active" : "chip"} type="button" onClick={() => setInvoiceType("service")}>Service Invoice</button>
          <button className={invoiceType === "amc" ? "chip active" : "chip"} type="button" onClick={() => setInvoiceType("amc")}>AMC Sale</button>
          <button className={invoiceType === "new_sale" ? "chip active" : "chip"} type="button" onClick={() => setInvoiceType("new_sale")}>New RO Sale</button>
        </div>
      </FormCard>

      {invoiceType === "service" && (
        <>
          {activeCoverage ? (
            <div className="success-box">
              Coverage Active: {coverageLabel(activeCoverage.coverage_type)} | Visits Remaining: {Number(activeCoverage.free_visits || 0) - Number(activeCoverage.used_visits || 0)}
            </div>
          ) : (
            <div className="muted-box">No active AMC/Warranty found.</div>
          )}
          <div className="amount-box">
            <strong>Service Charge</strong>
            <strong>{formatINR(serviceCharge)}</strong>
          </div>
        </>
      )}

      {invoiceType === "amc" && (
        <FormCard label="Select AMC Plan">
          <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
            <option value="">Select AMC Plan ({amcPlans.length} found)</option>
            {amcPlans.map((p) => (
              <option value={p.id} key={p.id}>{p.name} — {formatINR(p.price)}</option>
            ))}
          </select>
          {selectedPlan && (
            <div className="success-box">
              {selectedPlan.name} | Price {formatINR(selectedPlan.price)} | Validity {selectedPlan.validity_days} days | Free Visits {selectedPlan.free_visits}
            </div>
          )}
        </FormCard>
      )}

      {invoiceType === "new_sale" && (
        <FormCard label="Select RO Product">
          <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
            <option value="">Select RO Product ({products.length} found)</option>
            {products.map((p) => (
              <option value={p.id} key={p.id}>{p.name} — {formatINR(p.price)}</option>
            ))}
          </select>
          {selectedProduct && (
            <div className="success-box">
              {selectedProduct.name} | Price {formatINR(selectedProduct.price)} | Warranty {selectedProduct.warranty_validity_days} days | Free Visits {selectedProduct.free_visits}
            </div>
          )}
        </FormCard>
      )}

      {(invoiceType === "amc" || invoiceType === "new_sale") && (
        <FormCard label="Discount">
          <input
            placeholder="Discount amount"
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <p className="helper">For AMC/New Sale, service/visit charge will remain ₹0.</p>
        </FormCard>
      )}

      <FormCard label="Add Used Part / Extra Accessory">
        <div className="two-col">
          <select value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)}>
            <option value="">Select Part</option>
            {inventory.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} / {p.category_name} / Stock {p.stock_qty} / {formatINR(p.selling_price)}
              </option>
            ))}
          </select>
          <input type="number" value={qty} min="1" onChange={(e) => setQty(e.target.value)} />
        </div>
        <button className="primary-btn" onClick={addPart}>Add Part</button>
      </FormCard>

      {parts.length > 0 && (
        <div className="panel sub-panel">
          <h3>Used Parts</h3>
          {parts.map((p, idx) => (
            <div className="booking-row" key={idx}>
              <div>
                <strong>{p.part_name}</strong>
                <p>Qty {p.quantity} • Actual {formatINR(p.actual_selling_price)} • Billing {formatINR(p.billing_price)}</p>
                {p.is_covered && <p className="success-line">Covered under AMC/Warranty</p>}
              </div>
              <button className="ghost-btn small" onClick={() => setParts(parts.filter((_, i) => i !== idx))}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <FormCard label="Payment Collection">
        <div className="chip-grid">
          <button className={paymentMode === "cash" ? "chip active" : "chip"} type="button" onClick={() => { setPaymentMode("cash"); setCashAmount(String(total)); setUpiAmount("0"); }}>Cash Full</button>
          <button className={paymentMode === "upi" ? "chip active" : "chip"} type="button" onClick={() => { setPaymentMode("upi"); setCashAmount("0"); setUpiAmount(String(total)); }}>UPI Full</button>
          <button className={paymentMode === "split" ? "chip active" : "chip"} type="button" onClick={() => setPaymentMode("split")}>Cash + UPI</button>
          <button className={paymentMode === "emi" ? "chip active" : "chip"} type="button" onClick={() => setPaymentMode("emi")}>EMI</button>
          <button className={paymentMode === "pending" ? "chip active" : "chip"} type="button" onClick={() => { setPaymentMode("pending"); setCashAmount("0"); setUpiAmount("0"); }}>Pending</button>
        </div>

        <div className="two-col">
          <div>
            <label className="field-label">{paymentMode === "emi" ? "Cash Advance" : "Cash Received"}</label>
            <input
              placeholder="Enter cash amount"
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">{paymentMode === "emi" ? "UPI Advance" : "UPI Received"}</label>
            <input
              placeholder="Enter UPI amount"
              type="number"
              value={upiAmount}
              onChange={(e) => setUpiAmount(e.target.value)}
            />
          </div>
        </div>

        {paymentMode === "emi" && (
          <div className="sub-panel">
            <h3>EMI Reminder</h3>
            <div className="two-col">
              <input placeholder="No. of EMI months" type="number" value={emiMonths} onChange={(e) => setEmiMonths(e.target.value)} />
              <input type="date" value={emiStartDate} onChange={(e) => setEmiStartDate(e.target.value)} />
            </div>
            <input placeholder="EMI notes" value={emiNotes} onChange={(e) => setEmiNotes(e.target.value)} />
            <div className="muted-box">Next EMI Reminder: {emiStartDate} | Monthly EMI: {formatINR(monthlyEmi)}</div>
          </div>
        )}

        <div className="payment-summary">
          <div>
            <span>Paid Amount</span>
            <strong>{formatINR(paidAmount)}</strong>
          </div>
          <div>
            <span>Pending Amount</span>
            <strong className={dueAmount > 0 ? "danger-line" : "success-line"}>
              {formatINR(dueAmount)}
            </strong>
          </div>
          <div>
            <span>Payment Status</span>
            <strong className={paymentStatus === "Paid" ? "success-line" : dueAmount > 0 ? "danger-line" : ""}>
              {paymentStatus}
            </strong>
          </div>
        </div>

        <p className="helper">
          Cash + UPI total invoice amount se kam hai to payment status automatically Partial/Pending will remain.
        </p>
      </FormCard>

      <div className="amount-box total">
        <strong>Total Invoice</strong>
        <strong>{formatINR(total)}</strong>
      </div>

      {message && <div className={message.includes("success") ? "success-box" : "error-box"}>{message}</div>}

      <button className="primary-btn big" onClick={generateInvoice}>Generate Final Invoice</button>
    </section>
  );
}


function InventoryPage({ categories, inventory, inventoryPurchases = [], onUpdated }) {
  const [cat, setCat] = useState(emptyCategory);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [form, setForm] = useState(emptyPart);
  const [message, setMessage] = useState("");
  const [restockItemId, setRestockItemId] = useState("");
  const [restock, setRestock] = useState({
    restock_date: todayISO(),
    quantity: "",
    purchase_price: "",
    supplier_name: "",
    notes: "",
  });

  async function addCategory() {
    if (!cat.name.trim()) {
      setMessage("Category name is required.");
      return;
    }

    const { data, error } = await supabase
      .from("part_categories")
      .insert([{ name: cat.name.trim() }])
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({ ...form, category_id: data.id });
    setCat(emptyCategory);
    setShowNewCategory(false);
    setMessage("Category added and selected.");
    await onUpdated();
  }

  async function addPart() {
    if (!form.name.trim()) return setMessage("Part name is required.");
    if (!form.category_id) return setMessage("Please select or add a category.");

    const { error } = await supabase.from("inventory_items").insert([{
      name: form.name.trim(),
      category_id: form.category_id || null,
      purchase_price: Number(form.purchase_price || 0),
      selling_price: Number(form.selling_price || 0),
      stock_qty: Number(form.stock_qty || 0),
      low_stock_qty: Number(form.low_stock_qty || 0),
      supplier_name: form.supplier_name.trim(),
    }]);

    if (error) return setMessage(error.message);

    setForm(emptyPart);
    setMessage("Part added.");
    await onUpdated();
  }

  async function saveRestock(item) {
    setMessage("");

    if (!item) {
      setMessage("Select a part first.");
      return;
    }

    const qty = Number(restock.quantity || 0);
    const purchasePrice = Number(restock.purchase_price || 0);

    if (qty <= 0) {
      setMessage("Restock quantity must be greater than 0.");
      return;
    }

    const currentStock = Number(item.stock_qty || 0);
    const newStock = currentStock + qty;

    const { error: purchaseError } = await supabase.from("inventory_purchases").insert([{
      inventory_item_id: item.id,
      part_name: item.name,
      restock_date: restock.restock_date || todayISO(),
      quantity: qty,
      purchase_price: purchasePrice,
      total_purchase_amount: qty * purchasePrice,
      supplier_name: restock.supplier_name.trim(),
      notes: restock.notes.trim(),
    }]);

    if (purchaseError) {
      setMessage(purchaseError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        stock_qty: newStock,
        purchase_price: purchasePrice || Number(item.purchase_price || 0),
        supplier_name: restock.supplier_name.trim() || item.supplier_name || "",
      })
      .eq("id", item.id);

    if (updateError) {
      setMessage(updateError.message);
      return;
    }

    setRestockItemId("");
    setRestock({
      restock_date: todayISO(),
      quantity: "",
      purchase_price: "",
      supplier_name: "",
      notes: "",
    });
    setMessage("Stock restocked successfully.");
    await onUpdated();
  }

  return (
    <>
      <section className="page-head">
        <h2>Inventory</h2>
        <p>Add parts, manage stock, and track purchase/restock history.</p>
      </section>

      <section className="panel">
        <h3>Add Part</h3>
        <div className="form-stack">
          <input
            placeholder="Part name e.g. Vontron Membrane"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <FormCard label="Part Category">
            <select
              value={showNewCategory ? "__new__" : form.category_id}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewCategory(true);
                  setForm({ ...form, category_id: "" });
                } else {
                  setShowNewCategory(false);
                  setForm({ ...form, category_id: e.target.value });
                }
              }}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option value={c.id} key={c.id}>{c.name}</option>
              ))}
              <option value="__new__">+ Add New Category</option>
            </select>

            {showNewCategory && (
              <div className="two-col mt-sm">
                <input
                  placeholder="New category name"
                  value={cat.name}
                  onChange={(e) => setCat({ name: e.target.value })}
                />
                <button className="primary-btn" onClick={addCategory}>Add Category</button>
              </div>
            )}
          </FormCard>

          <div className="two-col">
            <input placeholder="Purchase price" type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            <input placeholder="Selling price" type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
          </div>
          <div className="two-col">
            <input placeholder="Opening stock" type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
            <input placeholder="Low stock alert" type="number" value={form.low_stock_qty} onChange={(e) => setForm({ ...form, low_stock_qty: e.target.value })} />
          </div>
          <input placeholder="Supplier name optional" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
          <button className="primary-btn" onClick={addPart}>Add Part</button>
          {message && <div className={message.includes("success") || message.includes("added") || message.includes("selected") ? "success-box" : "error-box"}>{message}</div>}
        </div>
      </section>

      <section className="panel">
        <h3>Parts List & Restock</h3>
        {inventory.length === 0 ? <p className="muted">No parts added.</p> : inventory.map((p) => {
          const itemPurchases = inventoryPurchases.filter((x) => String(x.inventory_item_id) === String(p.id)).slice(0, 3);
          const isRestocking = restockItemId === p.id;

          return (
            <div className="job-card" key={p.id}>
              <div className="panel-head">
                <div>
                  <strong>{p.name}</strong>
                  <p>{p.category_name} • Sell {formatINR(p.selling_price)} • Last Purchase {formatINR(p.purchase_price)}</p>
                  <p className={Number(p.stock_qty || 0) <= Number(p.low_stock_qty || 0) ? "danger-line" : ""}>
                    Current Stock: {p.stock_qty} | Low alert: {p.low_stock_qty}
                  </p>
                </div>
                <button className="primary-btn small" onClick={() => setRestockItemId(isRestocking ? "" : p.id)}>
                  {isRestocking ? "Close" : "Restock"}
                </button>
              </div>

              {isRestocking && (
                <div className="restock-box">
                  <FormCard label="Restock Details">
                    <div className="two-col">
                      <div>
                        <label className="field-label">Restock Date</label>
                        <input
                          type="date"
                          value={restock.restock_date}
                          onChange={(e) => setRestock({ ...restock, restock_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="field-label">Quantity Added</label>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={restock.quantity}
                          onChange={(e) => setRestock({ ...restock, quantity: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="two-col mt-sm">
                      <div>
                        <label className="field-label">Purchase Price / Unit</label>
                        <input
                          type="number"
                          placeholder="Purchase price"
                          value={restock.purchase_price}
                          onChange={(e) => setRestock({ ...restock, purchase_price: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="field-label">Supplier Name</label>
                        <input
                          placeholder="Supplier name"
                          value={restock.supplier_name}
                          onChange={(e) => setRestock({ ...restock, supplier_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <input
                      className="mt-sm"
                      placeholder="Notes optional"
                      value={restock.notes}
                      onChange={(e) => setRestock({ ...restock, notes: e.target.value })}
                    />

                    <div className="payment-summary">
                      <div>
                        <span>Current Stock</span>
                        <strong>{p.stock_qty}</strong>
                      </div>
                      <div>
                        <span>After Restock</span>
                        <strong>{Number(p.stock_qty || 0) + Number(restock.quantity || 0)}</strong>
                      </div>
                      <div>
                        <span>Total Purchase</span>
                        <strong>{formatINR(Number(restock.quantity || 0) * Number(restock.purchase_price || 0))}</strong>
                      </div>
                    </div>

                    <button className="primary-btn big mt-sm" onClick={() => saveRestock(p)}>
                      Save Restock
                    </button>
                  </FormCard>
                </div>
              )}

              {itemPurchases.length > 0 && (
                <div className="purchase-history">
                  <strong>Recent Restock History</strong>
                  {itemPurchases.map((x) => (
                    <div className="mini-line" key={x.id}>
                      {x.restock_date} — Qty {x.quantity} — {formatINR(x.purchase_price)}/unit — {x.supplier_name || "No supplier"}
                    </div>
                  ))}
                  {payments.length > 0 && (
                    <div className="sub-panel">
                      <h3>Payments</h3>
                      {payments.map((payment) => (
                        <div className="mini-line" key={payment.id}>
                          {payment.payment_date} - Cash {formatINR(payment.cash_amount)} | UPI {formatINR(payment.upi_amount)}
                          {payment.note ? ` - ${payment.note}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h3>All Restock History</h3>
        {inventoryPurchases.length === 0 ? (
          <p className="muted">No restock entries yet.</p>
        ) : (
          inventoryPurchases.slice(0, 12).map((x) => (
            <div className="booking-row" key={x.id}>
              <div>
                <strong>{x.part_name}</strong>
                <p>{x.restock_date} • Qty {x.quantity} • Supplier: {x.supplier_name || "N/A"}</p>
              </div>
              <div>
                <strong>{formatINR(x.total_purchase_amount)}</strong>
                <p>{formatINR(x.purchase_price)}/unit</p>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}

function PlansPage({ categories, inventory, amcPlans, products, onUpdated }) {
  const [mode, setMode] = useState("amc");
  const [plan, setPlan] = useState(emptyPlan);
  const [product, setProduct] = useState(emptyProduct);
  const [message, setMessage] = useState("");

  function toggleArray(obj, setObj, key, id) {
    const arr = obj[key] || [];
    const next = arrIncludes(arr, id) ? arr.filter((x) => String(x) !== String(id)) : [...arr, id];
    setObj({ ...obj, [key]: next });
  }

  async function savePlan() {
    if (!plan.name.trim()) return setMessage("Plan name is required.");

    const { error } = await supabase.from("amc_plans").insert([{
      name: plan.name.trim(),
      price: Number(plan.price || 0),
      validity_days: Number(plan.validity_days || 365),
      free_visits_enabled: !!plan.free_visits_enabled,
      free_visits: plan.free_visits_enabled ? Number(plan.free_visits || 0) : 0,
      service_reminder_days: Number(plan.service_reminder_days || 90),
      coverage_type: plan.coverage_type,
      covered_category_ids: plan.covered_category_ids,
      covered_part_ids: plan.covered_part_ids,
      notes: plan.notes.trim(),
    }]);

    if (error) return setMessage(error.message);

    setPlan(emptyPlan);
    setMessage("AMC plan saved.");
    await onUpdated();
  }

  async function saveProduct() {
    if (!product.name.trim()) return setMessage("Product name is required.");

    const { error } = await supabase.from("ro_products").insert([{
      name: product.name.trim(),
      price: Number(product.price || 0),
      warranty_validity_days: Number(product.warranty_validity_days || 365),
      free_visits_enabled: !!product.free_visits_enabled,
      free_visits: product.free_visits_enabled ? Number(product.free_visits || 0) : 0,
      service_reminder_days: Number(product.service_reminder_days || 180),
      coverage_type: product.coverage_type,
      covered_category_ids: product.covered_category_ids,
      covered_part_ids: product.covered_part_ids,
      notes: product.notes.trim(),
    }]);

    if (error) return setMessage(error.message);

    setProduct(emptyProduct);
    setMessage("RO product saved.");
    await onUpdated();
  }

  return (
    <>
      <section className="page-head">
        <h2>Plans / Products</h2>
        <p>First choose whether to add an AMC plan or define RO product warranty.</p>
      </section>

      <section className="panel">
        <h3>What do you want to add?</h3>
        <div className="chip-grid">
          <button className={mode === "amc" ? "chip active" : "chip"} type="button" onClick={() => setMode("amc")}>
            AMC Plan
          </button>
          <button className={mode === "product" ? "chip active" : "chip"} type="button" onClick={() => setMode("product")}>
            RO Product / New Sale Warranty
          </button>
        </div>
      </section>

      {message && <div className={message.includes("saved") ? "success-box" : "error-box"}>{message}</div>}

      {mode === "amc" ? (
        <section className="panel">
          <h3>AMC Plan Builder</h3>
          <PlanFields data={plan} setData={setPlan} categories={categories} inventory={inventory} toggleArray={toggleArray} type="amc" />
          <button className="primary-btn big" onClick={savePlan}>Save AMC Plan</button>
        </section>
      ) : (
        <section className="panel">
          <h3>RO Product Warranty Builder</h3>
          <PlanFields data={product} setData={setProduct} categories={categories} inventory={inventory} toggleArray={toggleArray} type="product" />
          <button className="primary-btn big" onClick={saveProduct}>Save RO Product</button>
        </section>
      )}

      <section className="panel">
        <h3>Saved AMC Plans</h3>
        {amcPlans.length === 0 ? <p className="muted">No AMC plans added.</p> : amcPlans.map((p) => (
          <div className="mini-line" key={p.id}>
            {p.name} — {formatINR(p.price)} — {p.validity_days} days — {p.free_visits} visits — Reminder every {p.service_reminder_days} days
          </div>
        ))}
      </section>

      <section className="panel">
        <h3>Saved RO Products</h3>
        {products.length === 0 ? <p className="muted">No RO products added.</p> : products.map((p) => (
          <div className="mini-line" key={p.id}>
            {p.name} — {formatINR(p.price)} — {p.warranty_validity_days} days — {p.free_visits} visits — Reminder every {p.service_reminder_days} days
          </div>
        ))}
      </section>
    </>
  );
}

function PlanFields({ data, setData, categories, inventory, toggleArray, type }) {
  return (
    <div className="form-stack">
      <input placeholder={type === "amc" ? "Plan Name" : "RO Machine Name"} value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
      <div className="two-col">
        <input placeholder="Price" type="number" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} />
        <input placeholder="Validity days" type="number" value={type === "amc" ? data.validity_days : data.warranty_validity_days} onChange={(e) => type === "amc" ? setData({ ...data, validity_days: e.target.value }) : setData({ ...data, warranty_validity_days: e.target.value })} />
      </div>
      <FormCard label="Free Service Visits">
        <div className="chip-grid">
          <button className={data.free_visits_enabled ? "chip active" : "chip"} type="button" onClick={() => setData({ ...data, free_visits_enabled: true })}>Yes</button>
          <button className={!data.free_visits_enabled ? "chip active" : "chip"} type="button" onClick={() => setData({ ...data, free_visits_enabled: false, free_visits: "0" })}>No</button>
        </div>
        {data.free_visits_enabled && <input placeholder="No. of free visits" type="number" value={data.free_visits} onChange={(e) => setData({ ...data, free_visits: e.target.value })} />}
      </FormCard>
      <FormCard label="Service Reminder Interval Days">
        <input
          placeholder="Example: 90 means reminder after every 90 days"
          type="number"
          value={data.service_reminder_days}
          onChange={(e) => setData({ ...data, service_reminder_days: e.target.value })}
        />
        <p className="helper">Service reminders will appear on the admin dashboard based on this interval.</p>
      </FormCard>
      <FormCard label="Coverage Type">
        <div className="chip-grid">
          {[["none", "No Parts"], ["electric", "Electric Pump+SMPS"], ["selected", "Selected Parts/Categories"], ["all", "All Parts"]].map(([value, label]) => <button className={data.coverage_type === value ? "chip active" : "chip"} type="button" key={value} onClick={() => setData({ ...data, coverage_type: value })}>{label}</button>)}
        </div>
      </FormCard>
      {data.coverage_type === "selected" && (
        <>
          <FormCard label="Covered Categories">
            <div className="check-grid">{categories.map((c) => <label className="check-row" key={c.id}><input type="checkbox" checked={arrIncludes(data.covered_category_ids, c.id)} onChange={() => toggleArray(data, setData, "covered_category_ids", c.id)} /> {c.name}</label>)}</div>
          </FormCard>
          <FormCard label="Covered Parts">
            <div className="check-grid">{inventory.map((p) => <label className="check-row" key={p.id}><input type="checkbox" checked={arrIncludes(data.covered_part_ids, p.id)} onChange={() => toggleArray(data, setData, "covered_part_ids", p.id)} /> {p.name}</label>)}</div>
          </FormCard>
        </>
      )}
      <input placeholder="Terms / Notes" value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} />
    </div>
  );
}

function AmcSalePage({ amcPlans, products, coverages, invoices, onUpdated }) {
  const [form, setForm] = useState(emptyActivation);
  const [message, setMessage] = useState("");
  const selectedPlan = amcPlans.find((p) => String(p.id) === String(form.amc_plan_id));
  const selectedProduct = products.find((p) => String(p.id) === String(form.product_id));
  const source = form.type === "amc" ? selectedPlan : selectedProduct;
  const basePrice = Number(source?.price || 0);
  const discount = Number(form.discount || 0);
  const finalAmount = Math.max(basePrice - discount, 0);
  const paidAmount = Number(form.cash_amount || 0) + Number(form.upi_amount || 0);
  const dueAmount = Math.max(finalAmount - paidAmount, 0);
  const paymentStatus = paidAmount <= 0 ? "Pending" : paidAmount >= finalAmount ? "Paid" : "Partial";
  const paymentMethod = Number(form.cash_amount || 0) > 0 && Number(form.upi_amount || 0) > 0
    ? "cash_upi"
    : Number(form.cash_amount || 0) > 0
      ? "cash"
      : Number(form.upi_amount || 0) > 0
        ? "upi"
        : "pending";

  async function createActivation() {
    setMessage("");
    if (!form.customer_name.trim() || !form.mobile.trim()) return setMessage("Customer name and mobile are required.");
    if (form.type === "amc" && !selectedPlan) return setMessage("Select AMC plan.");
    if (form.type === "new_sale" && !selectedProduct) return setMessage("Select RO product.");

    const invoiceDate = todayISO();
    const validityDays = form.type === "amc" ? Number(selectedPlan.validity_days || 365) : Number(selectedProduct.warranty_validity_days || 365);
    const expiryDate = addDays(invoiceDate, validityDays - 1); // inclusive validity: 365 days => +364
    const reminderDays = Number(source.service_reminder_days || 90);
    const nextServiceDue = addDays(invoiceDate, reminderDays);

    const coveragePayload = {
      customer_name: form.customer_name.trim(),
      mobile: form.mobile.trim(),
      source_type: form.type,
      source_id: source.id,
      source_name: source.name,
      coverage_type: source.coverage_type,
      covered_category_ids: source.covered_category_ids || [],
      covered_part_ids: source.covered_part_ids || [],
      free_visits: source.free_visits_enabled ? Number(source.free_visits || 0) : 0,
      used_visits: 0,
      activation_date: invoiceDate,
      validity_days: validityDays,
      expiry_date: expiryDate,
      service_reminder_days: reminderDays,
      next_service_due_date: nextServiceDue,
      notes: source.notes || "",
    };

    const { data: coverage, error: coverageError } = await supabase.from("customer_coverages").insert([coveragePayload]).select().single();
    if (coverageError) return setMessage(coverageError.message);

    const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert([{
      invoice_type: form.type,
      booking_id: null,
      customer_name: form.customer_name.trim(),
      mobile: form.mobile.trim(),
      service_charge: 0,
      parts_charge: 0,
      discount,
      total_amount: finalAmount,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      cash_amount: Number(form.cash_amount || 0),
      upi_amount: Number(form.upi_amount || 0),
      paid_amount: paidAmount,
      due_amount: dueAmount,
      coverage_id: coverage.id,
    }]).select().single();

    if (invoiceError) return setMessage(invoiceError.message);

    await supabase.from("invoice_items").insert([{
      invoice_id: invoice.id,
      item_type: form.type,
      item_name: source.name,
      quantity: 1,
      actual_price: basePrice,
      billing_price: finalAmount,
      is_covered: false,
      covered_reason: "",
    }]);

    setForm(emptyActivation);
    setMessage("AMC/New Sale invoice and coverage activated.");
    await onUpdated();
  }

  return (
    <>
      <section className="page-head"><h2>AMC / New Sale</h2><p>Select a plan/product, auto-pick price, apply discount, and activate coverage automatically.</p></section>
      <section className="panel">
        <FormCard label="Invoice Type">
          <div className="chip-grid">
            <button className={form.type === "amc" ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, type: "amc" })}>AMC</button>
            <button className={form.type === "new_sale" ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, type: "new_sale" })}>New RO Sale</button>
          </div>
        </FormCard>
        <div className="form-stack">
          <input placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input placeholder="Mobile number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} inputMode="numeric" />
          {form.type === "amc" ? (
            <select value={form.amc_plan_id} onChange={(e) => setForm({ ...form, amc_plan_id: e.target.value })}><option value="">Select AMC Plan ({amcPlans.length} found)</option>{amcPlans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatINR(p.price)}</option>)}</select>
          ) : (
            <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}><option value="">Select RO Product ({products.length} found)</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatINR(p.price)}</option>)}</select>
          )}
          {source && (
            <div className="success-box">
              Price: {formatINR(basePrice)} | Coverage: {coverageLabel(source.coverage_type)} | Free Visits: {source.free_visits_enabled ? source.free_visits : 0} | Validity: {form.type === "amc" ? source.validity_days : source.warranty_validity_days} days
            </div>
          )}
          <input placeholder="Discount" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          <div className="amount-box total"><strong>Final Amount</strong><strong>{formatINR(finalAmount)}</strong></div>
          <FormCard label="Payment Collection">
            <div className="two-col">
              <div>
                <label className="field-label">Cash Received</label>
                <input
                  placeholder="Enter cash amount"
                  type="number"
                  value={form.cash_amount}
                  onChange={(e) => setForm({ ...form, cash_amount: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">UPI Received</label>
                <input
                  placeholder="Enter UPI amount"
                  type="number"
                  value={form.upi_amount}
                  onChange={(e) => setForm({ ...form, upi_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="payment-summary">
              <div>
                <span>Paid Amount</span>
                <strong>{formatINR(paidAmount)}</strong>
              </div>
              <div>
                <span>Pending Amount</span>
                <strong className={dueAmount > 0 ? "danger-line" : "success-line"}>
                  {formatINR(dueAmount)}
                </strong>
              </div>
              <div>
                <span>Payment Status</span>
                <strong className={paymentStatus === "Paid" ? "success-line" : dueAmount > 0 ? "danger-line" : ""}>
                  {paymentStatus}
                </strong>
              </div>
            </div>
          </FormCard>
          {message && <div className={message.includes("activated") ? "success-box" : "error-box"}>{message}</div>}
          <button className="primary-btn big" onClick={createActivation}>Generate Invoice + Activate</button>
        </div>
      </section>
      <section className="panel"><h3>Active Coverages</h3>{coverages.length === 0 ? <p className="muted">No active records.</p> : coverages.slice(0, 8).map((c) => <div className="job-card" key={c.id}><strong>{c.customer_name}</strong><p>{c.mobile} • {c.source_name}</p><p>Activation: {c.activation_date} | Expiry: {c.expiry_date}</p><p>Reminder: {c.next_service_due_date}</p><p>Visits: {c.used_visits}/{c.free_visits}</p></div>)}</section>
    </>
  );
}


function LeadsPage({ leads, onUpdated, setPage }) {
  const [form, setForm] = useState(emptyLead);
  const [message, setMessage] = useState("");

  async function saveLead() {
    setMessage("");
    if (!form.customer_name.trim() || !form.mobile.trim()) {
      setMessage("Customer name and mobile are required.");
      return;
    }

    const { error } = await supabase.from("leads").insert([{
      customer_name: form.customer_name.trim(),
      mobile: form.mobile.trim(),
      source: form.source,
      interest: form.interest,
      status: form.status,
      follow_up_date: form.follow_up_date || todayISO(),
      notes: form.notes.trim(),
    }]);

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm(emptyLead);
    setMessage("Lead saved.");
    await onUpdated();
  }

  async function updateLeadStatus(lead, status) {
    const { error } = await supabase.from("leads").update({ status }).eq("id", lead.id);
    if (error) return alert(error.message);
    await onUpdated();
  }

  return (
    <>
      <section className="page-head">
        <h2>Leads</h2>
        <p>Manual leads now. Later this can connect with Meta Ads, WhatsApp, and Google Ads.</p>
      </section>

      <section className="panel">
        <h3>Add Lead</h3>
        <div className="form-stack">
          <div className="two-col">
            <input placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <input placeholder="Mobile number" inputMode="numeric" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div className="two-col">
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option>Manual</option>
              <option>WhatsApp</option>
              <option>Meta Ads</option>
              <option>Google Ads</option>
              <option>Referral</option>
              <option>Walk-in</option>
            </select>
            <select value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}>
              <option>Service</option>
              <option>Repair</option>
              <option>Installation</option>
              <option>AMC</option>
              <option>New RO Sale</option>
            </select>
          </div>
          <div className="two-col">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>New</option>
              <option>Contacted</option>
              <option>Follow Up</option>
              <option>Converted</option>
              <option>Lost</option>
            </select>
            <input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
          </div>
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {message && <div className={message.includes("saved") ? "success-box" : "error-box"}>{message}</div>}
          <button className="primary-btn big" onClick={saveLead}>Save Lead</button>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Lead List</h3>
            <p>{leads.length} total leads</p>
          </div>
          <button className="link-btn" onClick={() => setPage("booking")}>New Booking</button>
        </div>
        {leads.length === 0 ? <p className="muted">No leads added yet.</p> : leads.map((lead) => (
          <div className="job-card" key={lead.id}>
            <div className="booking-card-head">
              <div>
                <strong>{lead.customer_name}</strong>
                <p>{lead.mobile} • {lead.source} • {lead.interest}</p>
              </div>
              <span className="status assigned">{lead.status}</span>
            </div>
            <p>Follow up: {lead.follow_up_date || "Not set"}</p>
            {lead.notes && <p className="muted">{lead.notes}</p>}
            <div className="row-actions">
              {["Contacted", "Follow Up", "Converted", "Lost"].map((status) => (
                <button className="ghost-btn small" key={status} onClick={() => updateLeadStatus(lead, status)}>{status}</button>
              ))}
              <a className="ghost-btn small" href={`tel:${lead.mobile}`}>Call</a>
              <a className="ghost-btn small" href={`https://wa.me/91${lead.mobile}`} target="_blank" rel="noreferrer">WA</a>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}


function ReminderCenter({ coverages, invoices, leads, onUpdated }) {
  const [reschedule, setReschedule] = useState(null);
  const [message, setMessage] = useState("");

  const serviceReminders = coverages
    .filter((item) => item.next_service_due_date && String(item.next_service_due_date) <= todayISO() && isActive(item))
    .map((item) => ({
      id: `service-${item.id}`,
      source_id: item.id,
      type: "service",
      label: item.source_type === "new_sale" ? "Warranty Service" : "AMC Service",
      customer_name: item.customer_name,
      mobile: item.mobile,
      due_date: item.next_service_due_date,
      amount: null,
      note: item.source_name,
      raw: item,
    }));

  const emiReminders = invoices
    .filter((invoice) => invoice.payment_method === "emi" && getDueAmount(invoice) > 0 && invoice.emi_next_due_date && String(invoice.emi_next_due_date) <= todayISO())
    .map((invoice) => ({
      id: `emi-${invoice.id}`,
      source_id: invoice.id,
      type: "emi",
      label: "EMI Due",
      customer_name: invoice.customer_name,
      mobile: invoice.mobile,
      due_date: invoice.emi_next_due_date,
      amount: getDueAmount(invoice),
      note: `Monthly EMI ${formatINR(invoice.emi_monthly_amount)}`,
      raw: invoice,
    }));

  const paymentFollowUps = invoices
    .filter((invoice) => getDueAmount(invoice) > 0 && invoice.collection_follow_up_date && String(invoice.collection_follow_up_date) <= todayISO())
    .map((invoice) => ({
      id: `payment-${invoice.id}`,
      source_id: invoice.id,
      type: "payment",
      label: "Payment Follow-up",
      customer_name: invoice.customer_name,
      mobile: invoice.mobile,
      due_date: invoice.collection_follow_up_date,
      amount: getDueAmount(invoice),
      note: invoice.collection_note || "Pending payment",
      raw: invoice,
    }));

  const leadReminders = leads
    .filter((lead) => lead.follow_up_date && String(lead.follow_up_date) <= todayISO() && !["Converted", "Lost"].includes(lead.status))
    .map((lead) => ({
      id: `lead-${lead.id}`,
      source_id: lead.id,
      type: "lead",
      label: "Lead Follow-up",
      customer_name: lead.customer_name,
      mobile: lead.mobile,
      due_date: lead.follow_up_date,
      amount: null,
      note: `${lead.source} • ${lead.interest}`,
      raw: lead,
    }));

  const reminders = [...serviceReminders, ...emiReminders, ...paymentFollowUps, ...leadReminders]
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));

  async function markDone(reminder) {
    setMessage("");
    let response;

    if (reminder.type === "service") {
      response = await supabase
        .from("customer_coverages")
        .update({
          last_service_date: todayISO(),
          next_service_due_date: addDays(todayISO(), Number(reminder.raw.service_reminder_days || 90)),
        })
        .eq("id", reminder.source_id);
    } else if (reminder.type === "emi") {
      response = await supabase
        .from("invoices")
        .update({ emi_next_due_date: nextMonthlyDate(reminder.due_date || todayISO()) })
        .eq("id", reminder.source_id);
    } else if (reminder.type === "payment") {
      response = await supabase
        .from("invoices")
        .update({ collection_follow_up_date: addDays(todayISO(), 3) })
        .eq("id", reminder.source_id);
    } else {
      response = await supabase
        .from("leads")
        .update({ status: "Contacted", follow_up_date: addDays(todayISO(), 7) })
        .eq("id", reminder.source_id);
    }

    if (response.error) {
      setMessage(response.error.message);
      return;
    }

    setMessage("Reminder updated.");
    await onUpdated?.();
  }

  async function saveReschedule() {
    if (!reschedule?.date) return setMessage("Select reminder date.");
    setMessage("");

    let response;
    if (reschedule.type === "service") {
      response = await supabase.from("customer_coverages").update({ next_service_due_date: reschedule.date }).eq("id", reschedule.source_id);
    } else if (reschedule.type === "emi") {
      response = await supabase.from("invoices").update({ emi_next_due_date: reschedule.date }).eq("id", reschedule.source_id);
    } else if (reschedule.type === "payment") {
      response = await supabase.from("invoices").update({ collection_follow_up_date: reschedule.date, collection_note: reschedule.note || "" }).eq("id", reschedule.source_id);
    } else {
      response = await supabase.from("leads").update({ follow_up_date: reschedule.date, notes: reschedule.note || reschedule.raw?.notes || "" }).eq("id", reschedule.source_id);
    }

    if (response.error) {
      setMessage(response.error.message);
      return;
    }

    setMessage("Reminder rescheduled.");
    setReschedule(null);
    await onUpdated?.();
  }

  function whatsAppLink(reminder) {
    const mobile = String(reminder.mobile || "").replace(/\D/g, "");
    const amountText = reminder.amount ? ` Amount: ${formatINR(reminder.amount)}.` : "";
    const text = encodeURIComponent(`Namaste ${reminder.customer_name || ""}, AquaBiz reminder: ${reminder.label} due on ${reminder.due_date}.${amountText}`);
    return mobile ? `https://wa.me/91${mobile}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  return (
    <>
      <section className="page-head">
        <h2>Reminder Center</h2>
        <p>AMC, warranty, EMI, payment, and lead follow-ups.</p>
      </section>

      <section className="cards-grid">
        <StatCard icon="S" label="Service Due" value={serviceReminders.length} />
        <StatCard icon="E" label="EMI Due" value={emiReminders.length} />
        <StatCard icon="P" label="Payment Follow-up" value={paymentFollowUps.length} />
        <StatCard icon="L" label="Lead Follow-up" value={leadReminders.length} />
      </section>

      {message && <section className={message.includes("updated") || message.includes("rescheduled") ? "success-box" : "error-box"}>{message}</section>}

      <section className="panel">
        <h3>Due Reminders</h3>
        {reminders.length === 0 ? <p className="muted">No reminders due.</p> : reminders.map((reminder) => (
          <div className="job-card" key={reminder.id}>
            <div className="booking-card-head">
              <div>
                <strong>{reminder.customer_name}</strong>
                <p>{reminder.mobile} • {reminder.label}</p>
              </div>
              <span className="status unassigned">Due {reminder.due_date}</span>
            </div>
            {reminder.amount && <p className="danger-line">Pending: {formatINR(reminder.amount)}</p>}
            {reminder.note && <p className="muted">{reminder.note}</p>}
            <div className="row-actions">
              <a className="ghost-btn small" href={`tel:${reminder.mobile}`}>Call</a>
              <a className="ghost-btn small" href={whatsAppLink(reminder)} target="_blank" rel="noreferrer">WhatsApp</a>
              <button className="primary-btn small" onClick={() => markDone(reminder)}>Mark Done</button>
              <button className="ghost-btn small" onClick={() => setReschedule({ ...reminder, date: reminder.due_date, note: reminder.note || "" })}>Reschedule</button>
            </div>

            {reschedule?.id === reminder.id && (
              <section className="sub-panel">
                <div className="panel-head">
                  <h3>Reschedule Reminder</h3>
                  <button className="ghost-btn small" onClick={() => setReschedule(null)}>Close</button>
                </div>
                <div className="two-col">
                  <input type="date" value={reschedule.date} onChange={(e) => setReschedule({ ...reschedule, date: e.target.value })} />
                  <input placeholder="Note" value={reschedule.note || ""} onChange={(e) => setReschedule({ ...reschedule, note: e.target.value })} />
                </div>
                <button className="primary-btn" onClick={saveReschedule}>Save Reminder</button>
              </section>
            )}
          </div>
        ))}
      </section>
    </>
  );
}



function ReportsPage({ invoices, invoiceItems, usage, jobs = [], technicians = [], bookings = [], customers = [], inventory = [], coverages = [], leads = [], initialFilter = "all" }) {
  const [month, setMonth] = useState(getLocalMonthKey());
  const [filter, setFilter] = useState(initialFilter || "all");
  const [dateRange, setDateRange] = useState({
    from: `${getLocalMonthKey()}-01`,
    to: todayISO(),
  });

  useEffect(() => {
    setFilter(initialFilter || "all");
  }, [initialFilter]);

  const inRange = (record) => {
    const raw = record?.invoice_date || record?.payment_date || record?.created_at || record?.follow_up_date || record?.date;
    if (!raw) return false;
    const day = String(raw).slice(0, 10);
    return day >= dateRange.from && day <= dateRange.to;
  };

  const monthInvoices = invoices.filter(inRange);
  const invoiceIds = new Set(monthInvoices.map((i) => String(i.id)));
  const monthUsage = usage.filter((u) => invoiceIds.has(String(u.invoice_id)));
  const monthBookings = bookings.filter(inRange);
  const rangeLeads = leads.filter(inRange);

  const total = monthInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const paid = monthInvoices.reduce((s, i) => s + getPaidAmount(i), 0);
  const pending = monthInvoices.reduce((s, i) => s + getDueAmount(i), 0);
  const cashTotal = monthInvoices.reduce((s, i) => s + Number(i.cash_amount || 0), 0);
  const upiTotal = monthInvoices.reduce((s, i) => s + Number(i.upi_amount || 0), 0);

  const partsMap = {};
  monthUsage.forEach((u) => {
    const key = u.part_name || "Part";
    if (!partsMap[key]) partsMap[key] = { qty: 0, value: 0 };
    partsMap[key].qty += Number(u.quantity || 0);
    partsMap[key].value += Number(u.billing_price || 0) * Number(u.quantity || 0);
  });

  const techMap = {};
  jobs.forEach((job) => {
    const tech = technicians.find((t) => String(t.id) === String(job.technician_id));
    const key = tech?.name || "Unassigned";
    if (!techMap[key]) techMap[key] = { assigned: 0, completed: 0 };
    techMap[key].assigned += 1;
    if (isCompletedStatus(job.status)) techMap[key].completed += 1;
  });

  const serviceInvoices = monthInvoices.filter(i => !["amc", "new_sale"].includes(i.invoice_type));
  const amcInvoices = monthInvoices.filter(i => i.invoice_type === "amc");
  const saleInvoices = monthInvoices.filter(i => i.invoice_type === "new_sale");
  const pendingInvoices = monthInvoices.filter(i => getDueAmount(i) > 0);
  const serviceMap = {};
  serviceInvoices.forEach((invoice) => {
    const key = invoice.invoice_type || "service";
    if (!serviceMap[key]) serviceMap[key] = { count: 0, paid: 0, total: 0 };
    serviceMap[key].count += 1;
    serviceMap[key].paid += getPaidAmount(invoice);
    serviceMap[key].total += Number(invoice.total_amount || 0);
  });
  const leadSourceMap = {};
  rangeLeads.forEach((lead) => {
    const key = lead.source || "Manual";
    if (!leadSourceMap[key]) leadSourceMap[key] = { total: 0, converted: 0, lost: 0 };
    leadSourceMap[key].total += 1;
    if (lead.status === "Converted") leadSourceMap[key].converted += 1;
    if (lead.status === "Lost") leadSourceMap[key].lost += 1;
  });
  const lowStockItems = inventory.filter((p) => Number(p.stock_qty || 0) <= Number(p.low_stock_qty || 0));
  const dueReminders = coverages.filter((c) => c.next_service_due_date && String(c.next_service_due_date) <= todayISO() && isActive(c));
  const completedJobIds = new Set(
    invoices
      .filter((invoice) => invoice.booking_id && !["amc", "new_sale"].includes(invoice.invoice_type))
      .map((invoice) => String(invoice.booking_id))
  );
  const completedJobs = jobs.filter((j) => isCompletedStatus(j.status) || completedJobIds.has(String(j.booking_id)));

  const reportTitles = {
    all: "Full Monthly Report",
    new_sale: "Current Month New Sales",
    amc: "Current Month AMC Sales",
    collection: "Current Month Collection",
    pending: "Pending Payments",
    bookings: "Current Month Bookings",
    reminders: "Service Reminders Due",
    low_stock: "Low Stock Items",
    completed_jobs: "Completed Jobs",
    customers: "Customer Summary",
    leads: "Lead Source Report",
  };

  const activeTitle = reportTitles[filter] || "Monthly Report";

  function downloadCSV() {
    const headers = ["date", "customer", "mobile", "type", "total", "cash", "upi", "paid", "pending", "status"];
    const rows = monthInvoices.map((i) => [
      String(i.created_at || "").slice(0, 10),
      i.customer_name || "",
      i.mobile || "",
      i.invoice_type || "",
      Number(i.total_amount || 0),
      Number(i.cash_amount || 0),
      Number(i.upi_amount || 0),
      getPaidAmount(i),
      getDueAmount(i),
      i.payment_status || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aquabiz-report-${dateRange.from}-to-${dateRange.to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copySummary() {
    const text = [
      "AquaBiz Report",
      `Period: ${dateRange.from} to ${dateRange.to}`,
      `Collection: ${formatINR(paid)}`,
      `Cash: ${formatINR(cashTotal)}`,
      `UPI: ${formatINR(upiTotal)}`,
      `Pending: ${formatINR(pending)}`,
      `Invoices: ${monthInvoices.length}`,
      `Bookings: ${monthBookings.length}`,
      `Leads: ${rangeLeads.length}`,
    ].join("\n");
    await navigator.clipboard?.writeText(text);
    alert("Report summary copied.");
  }

  return (
    <>
      <section className="page-head">
        <h2>{activeTitle}</h2>
        <p>Filtered report for selected date range.</p>
      </section>

      <section className="panel">
        <div className="two-col">
          <div>
            <label className="field-label">From Date</label>
            <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
          </div>
          <div>
            <label className="field-label">To Date</label>
            <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
          </div>
        </div>
        <div className="two-col mt-sm">
          <div>
            <label className="field-label">Report Type</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Full Monthly Report</option>
              <option value="new_sale">New Sales</option>
              <option value="amc">AMC Sales</option>
              <option value="collection">Collection</option>
              <option value="pending">Pending Payments</option>
              <option value="bookings">Bookings</option>
              <option value="reminders">Service Reminders</option>
              <option value="low_stock">Low Stock</option>
              <option value="completed_jobs">Completed Jobs</option>
              <option value="customers">Customers</option>
              <option value="leads">Leads</option>
            </select>
          </div>
          <div className="row-actions">
            <button className="primary-btn small" type="button" onClick={downloadCSV}>Download CSV</button>
            <button className="ghost-btn small" type="button" onClick={copySummary}>Copy Summary</button>
          </div>
        </div>
      </section>

      {(filter === "all" || filter === "collection") && (
        <section className="cards-grid">
          <StatCard icon="🧾" label="Invoices" value={monthInvoices.length} />
          <StatCard icon="💰" label="Total Billing" value={formatINR(total)} />
          <StatCard icon="✅" label="Paid" value={formatINR(paid)} />
          <StatCard icon="⏳" label="Pending" value={formatINR(pending)} />
          <StatCard icon="C" label="Cash" value={formatINR(cashTotal)} />
          <StatCard icon="U" label="UPI" value={formatINR(upiTotal)} />
        </section>
      )}

      {(filter === "all" || filter === "new_sale" || filter === "amc") && (
        <section className="cards-grid">
          <StatCard icon="🛒" label="New RO Collection" value={formatINR(saleInvoices.reduce((s,i)=>s+getPaidAmount(i),0))} />
          <StatCard icon="🛡️" label="AMC Collection" value={formatINR(amcInvoices.reduce((s,i)=>s+getPaidAmount(i),0))} />
          <StatCard icon="🧰" label="Service Collection" value={formatINR(serviceInvoices.reduce((s,i)=>s+getPaidAmount(i),0))} />
          <StatCard icon="📦" label="Parts Items Used" value={Object.keys(partsMap).length} />
        </section>
      )}

      {filter === "new_sale" && (
        <ReportInvoiceList title="New RO Sales Invoices" invoices={saleInvoices} />
      )}

      {filter === "amc" && (
        <ReportInvoiceList title="AMC Sales Invoices" invoices={amcInvoices} />
      )}

      {filter === "pending" && (
        <ReportInvoiceList title="Pending Payment Invoices" invoices={pendingInvoices} />
      )}

      {filter === "bookings" && (
        <section className="panel">
          <h3>Current Month Bookings</h3>
          {monthBookings.length === 0 ? <p className="muted">No bookings this month.</p> : monthBookings.map((b) => (
            <div className="booking-row" key={b.id}>
              <div>
                <strong>{b.customer_name}</strong>
                <p>{b.mobile} • {b.service_type} • {formatINR(b.booking_amount)}</p>
              </div>
              <span className="status assigned">{new Date(b.created_at).toLocaleDateString("en-IN")}</span>
            </div>
          ))}
        </section>
      )}

      {filter === "reminders" && (
        <section className="panel">
          <h3>Service Reminders Due</h3>
          {dueReminders.length === 0 ? <p className="muted">No reminders due.</p> : dueReminders.map((r) => (
            <div className="booking-row" key={r.id}>
              <div>
                <strong>{r.customer_name}</strong>
                <p>{r.mobile} • Due: {r.next_service_due_date} • Expiry: {r.expiry_date}</p>
              </div>
              <div className="row-actions">
                <a className="ghost-btn small" href={`tel:${r.mobile}`}>Call</a>
                <a className="ghost-btn small" href={`https://wa.me/91${r.mobile}`} target="_blank" rel="noreferrer">WA</a>
              </div>
            </div>
          ))}
        </section>
      )}

      {filter === "low_stock" && (
        <section className="panel">
          <h3>Low Stock Items</h3>
          {lowStockItems.length === 0 ? <p className="muted">No low stock items.</p> : lowStockItems.map((p) => (
            <div className="booking-row" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <p>{p.category_name} • Stock: {p.stock_qty} • Low Alert: {p.low_stock_qty}</p>
              </div>
              <span className="status unassigned">Low</span>
            </div>
          ))}
        </section>
      )}

      {filter === "completed_jobs" && (
        <section className="panel">
          <h3>Completed Jobs</h3>
          {completedJobs.length === 0 ? <p className="muted">No completed jobs.</p> : completedJobs.map((job) => {
            const tech = technicians.find((t) => String(t.id) === String(job.technician_id));
            const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
            return (
              <div className="booking-row" key={job.id}>
                <div>
                  <strong>{booking?.customer_name || "Customer"}</strong>
                  <p>{booking?.mobile} • Technician: {tech?.name || "Unknown"}</p>
                </div>
                <span className="status assigned">Completed</span>
              </div>
            );
          })}
        </section>
      )}

      {filter === "customers" && (
        <section className="panel">
          <h3>Customers</h3>
          {customers.length === 0 ? <p className="muted">No customers.</p> : customers.map((c) => (
            <div className="booking-row" key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <p>{c.mobile} • {c.address}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {filter === "leads" && (
        <section className="panel">
          <h3>Lead Source Report</h3>
          {Object.keys(leadSourceMap).length === 0 ? <p className="muted">No leads found.</p> : Object.entries(leadSourceMap).map(([source, value]) => (
            <div className="booking-row" key={source}>
              <div>
                <strong>{source}</strong>
                <p>Total: {value.total} | Converted: {value.converted} | Lost: {value.lost}</p>
              </div>
              <span className="status assigned">{value.total ? Math.round((value.converted / value.total) * 100) : 0}%</span>
            </div>
          ))}
        </section>
      )}

      {(filter === "all" || filter === "collection") && (
        <section className="panel">
          <h3>All Invoices</h3>
          {monthInvoices.map((i) => (
            <div className="mini-line" key={i.id}>
              {i.customer_name} — {i.invoice_type} — {formatINR(i.total_amount)} — Paid {formatINR(i.paid_amount)} — Due {formatINR(i.due_amount)}
            </div>
          ))}
        </section>
      )}

      {filter === "all" && (
        <>
          <section className="panel">
            <h3>Parts Used Item-wise</h3>
            {Object.keys(partsMap).length === 0 ? <p className="muted">No parts used this month.</p> : Object.entries(partsMap).map(([name, v]) => (
              <div className="booking-row" key={name}>
                <strong>{name}</strong>
                <p>Qty: {v.qty} | Billing: {formatINR(v.value)}</p>
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>Technician Performance</h3>
            {Object.keys(techMap).length === 0 ? <p className="muted">No technician data.</p> : Object.entries(techMap).map(([name, v]) => (
              <div className="booking-row" key={name}>
                <strong>{name}</strong>
                <p>Assigned: {v.assigned} | Completed: {v.completed}</p>
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>Service-wise Revenue</h3>
            {Object.keys(serviceMap).length === 0 ? <p className="muted">No service revenue.</p> : Object.entries(serviceMap).map(([name, value]) => (
              <div className="booking-row" key={name}>
                <strong>{name}</strong>
                <p>Invoices: {value.count} | Billing: {formatINR(value.total)} | Collection: {formatINR(value.paid)}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}

function ReportInvoiceList({ title, invoices }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {invoices.length === 0 ? <p className="muted">No data found.</p> : invoices.map((i) => (
        <div className="booking-row" key={i.id}>
          <div>
            <strong>{i.customer_name}</strong>
            <p>{i.mobile} • {i.invoice_type} • {new Date(i.created_at).toLocaleDateString("en-IN")}</p>
          </div>
          <div>
            <strong>{formatINR(i.total_amount)}</strong>
            <p className={Number(i.due_amount || 0) > 0 ? "danger-line" : "success-line"}>
              Due: {formatINR(i.due_amount)}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

function InvoicesPage({ invoices, invoiceItems, invoicePayments = [], businessSettings, onUpdated }) {
  const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);
  const business = businessSettings || {
    business_name: "AquaBiz",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    gst_number: "",
    google_business_link: "",
    instagram_link: "",
    invoice_prefix: "INV",
    gst_enabled: false,
    gst_rate: 18,
    terms: "Thank you for your business.",
  };

  function getInvoiceNumber(inv, index = 0) {
    const shortId = String(inv.id || "").slice(0, 6).toUpperCase();
    return `${business.invoice_prefix || "INV"}-${shortId || index + 1}`;
  }

  function gstBreakup(total) {
    const rate = Number(business.gst_rate || 18);
    if (!business.gst_enabled) {
      return { taxable: total, gst: 0, cgst: 0, sgst: 0, rate };
    }

    const taxable = total / (1 + rate / 100);
    const gst = total - taxable;
    return {
      taxable,
      gst,
      cgst: gst / 2,
      sgst: gst / 2,
      rate,
    };
  }

  function invoiceText(inv, items, index) {
    const g = gstBreakup(Number(inv.total_amount || 0));

    const lines = [
      `${business.business_name || "AquaBiz"} Invoice`,
      `Invoice No: ${getInvoiceNumber(inv, index)}`,
      `Customer: ${inv.customer_name || ""}`,
      `Mobile: ${inv.mobile || ""}`,
      `Invoice Type: ${inv.invoice_type || "service"}`,
      `Total: ${formatINR(inv.total_amount)}`,
      `Paid: ${formatINR(inv.paid_amount)}`,
      `Pending: ${formatINR(inv.due_amount)}`,
      `Status: ${inv.payment_status}`,
    ];

    if (business.gst_enabled) {
      lines.push(`GSTIN: ${business.gst_number || ""}`);
      lines.push(`Taxable: ${formatINR(g.taxable)}`);
      lines.push(`CGST: ${formatINR(g.cgst)}`);
      lines.push(`SGST: ${formatINR(g.sgst)}`);
    }

    lines.push("");
    lines.push("Items:");
    items.forEach((item) => {
      lines.push(`${item.item_name} x ${item.quantity} - ${formatINR(item.billing_price)}${item.is_covered ? " (Covered)" : ""}`);
    });

    lines.push("");
    if (business.phone) lines.push(`Phone: ${business.phone}`);
    if (business.whatsapp) lines.push(`WhatsApp: ${business.whatsapp}`);
    if (business.email) lines.push(`Email: ${business.email}`);
    if (business.google_business_link) lines.push(`Google Profile: ${business.google_business_link}`);
    if (business.instagram_link) lines.push(`Instagram: ${business.instagram_link}`);
    if (business.terms) lines.push(`Terms: ${business.terms}`);

    return lines.join("\\n");
  }

  function shareWhatsApp(inv, items, index) {
    const text = encodeURIComponent(invoiceText(inv, items, index));
    const mobile = String(inv.mobile || "").replace(/\D/g, "");
    const url = mobile ? `https://wa.me/91${mobile}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  }

  function printInvoice(inv, items, index) {
    const total = Number(inv.total_amount || 0);
    const g = gstBreakup(total);
    const invoiceNo = getInvoiceNumber(inv, index);

    const itemRows = items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.item_name || ""}</td>
        <td>${item.quantity || 1}</td>
        <td>₹${Number(item.actual_price || 0).toLocaleString("en-IN")}</td>
        <td>₹${Number(item.billing_price || 0).toLocaleString("en-IN")}</td>
        <td>${item.is_covered ? "Covered" : "Chargeable"}</td>
      </tr>
    `).join("");

    const gstRows = business.gst_enabled ? `
      <tr><td>Taxable Value</td><td>₹${g.taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>
      <tr><td>CGST ${(g.rate / 2).toFixed(1)}%</td><td>₹${g.cgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>
      <tr><td>SGST ${(g.rate / 2).toFixed(1)}%</td><td>₹${g.sgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>
    ` : "";

    const links = [
      business.google_business_link ? `<div>Google Profile: ${business.google_business_link}</div>` : "",
      business.instagram_link ? `<div>Instagram: ${business.instagram_link}</div>` : "",
    ].join("");

    const html = `
      <html>
        <head>
          <title>${business.business_name || "AquaBiz"} Invoice</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 28px; color: #111; }
            .invoice-wrap { max-width: 820px; margin: 0 auto; }
            .header { display:flex; justify-content:space-between; border-bottom:3px solid #000666; padding-bottom:16px; gap: 24px; }
            .brand h1 { color:#000666; margin:0 0 6px; font-size: 34px; }
            .brand div { line-height:1.45; }
            .invoice-title { text-align:right; line-height:1.6; }
            .grid { display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-top:20px; }
            .box { border:1px solid #ddd; padding:14px; border-radius:8px; line-height:1.6; }
            .box-title { color:#000666; font-weight:bold; margin-bottom:8px; }
            table { width:100%; border-collapse:collapse; margin-top:20px; }
            th, td { border:1px solid #ddd; padding:10px; text-align:left; }
            th { background:#f2f4ff; color:#000666; }
            .summary { width: 360px; margin-left:auto; margin-top:20px; }
            .summary table { margin-top: 0; }
            .total { font-size:22px; font-weight:bold; color:#007c68; }
            .footer { margin-top:32px; color:#666; font-size:13px; border-top:1px solid #ddd; padding-top:12px; line-height:1.6; }
            @media print { body { padding: 0; } .invoice-wrap { max-width: 100%; } }
          </style>
        </head>
        <body>
          <div class="invoice-wrap">
            <div class="header">
              <div class="brand">
                <h1>${business.business_name || "AquaBiz"}</h1>
                <div>${business.address || ""}</div>
                <div>Phone: ${business.phone || ""} ${business.whatsapp ? "| WhatsApp: " + business.whatsapp : ""}</div>
                <div>Email: ${business.email || ""}</div>
                ${business.gst_enabled ? `<div><strong>GSTIN:</strong> ${business.gst_number || ""}</div>` : ""}
              </div>
              <div class="invoice-title">
                <h2>Invoice</h2>
                <div><strong>No:</strong> ${invoiceNo}</div>
                <div><strong>Date:</strong> ${new Date(inv.created_at).toLocaleDateString("en-IN")}</div>
                <div><strong>Status:</strong> ${inv.payment_status || ""}</div>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <div class="box-title">Bill To</div>
                <div><strong>Name:</strong> ${inv.customer_name || ""}</div>
                <div><strong>Mobile:</strong> ${inv.mobile || ""}</div>
              </div>
              <div class="box">
                <div class="box-title">Invoice Details</div>
                <div><strong>Type:</strong> ${inv.invoice_type || "service"}</div>
                <div><strong>Payment:</strong> ${inv.payment_method || ""}</div>
                <div><strong>Cash:</strong> ₹${Number(inv.cash_amount || 0).toLocaleString("en-IN")} | <strong>UPI:</strong> ₹${Number(inv.upi_amount || 0).toLocaleString("en-IN")}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Actual Price</th>
                  <th>Billing Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div class="summary">
              <table>
                <tr><td>Service Charge</td><td>₹${Number(inv.service_charge || 0).toLocaleString("en-IN")}</td></tr>
                <tr><td>Parts Charge</td><td>₹${Number(inv.parts_charge || 0).toLocaleString("en-IN")}</td></tr>
                <tr><td>Discount</td><td>₹${Number(inv.discount || 0).toLocaleString("en-IN")}</td></tr>
                ${gstRows}
                <tr class="total"><td>Total</td><td>₹${Number(inv.total_amount || 0).toLocaleString("en-IN")}</td></tr>
                <tr><td>Paid</td><td>₹${Number(inv.paid_amount || 0).toLocaleString("en-IN")}</td></tr>
                <tr><td>Pending</td><td>₹${Number(inv.due_amount || 0).toLocaleString("en-IN")}</td></tr>
              </table>
            </div>

            <div class="footer">
              <div>${business.terms || "Thank you for your business."}</div>
              ${links}
              <div>Generated by AquaBiz</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <>
      <section className="page-head">
        <h2>Invoices</h2>
        <p>Professional invoice print/PDF aur WhatsApp share.</p>
      </section>

      <section className="panel">
        {invoices.length === 0 ? <p className="muted">No invoices yet.</p> : invoices.map((inv, index) => {
          const items = invoiceItems.filter((i) => String(i.invoice_id) === String(inv.id));
          const payments = invoicePayments.filter((p) => String(p.invoice_id) === String(inv.id));
          return (
            <div className="job-card" key={inv.id}>
              <strong>{business.business_name || "AquaBiz"} — {getInvoiceNumber(inv, index)}</strong>
              <p>{inv.customer_name} • {inv.mobile} • {inv.invoice_type}</p>
              <p>Service: {formatINR(inv.service_charge)} | Parts: {formatINR(inv.parts_charge)} | Discount: {formatINR(inv.discount)}</p>
              <div className="amount-box total"><strong>Total</strong><strong>{formatINR(inv.total_amount)}</strong></div>
              <p>Status: {inv.payment_status} | Method: {inv.payment_method}</p>
              <p>Cash: {formatINR(inv.cash_amount)} | UPI: {formatINR(inv.upi_amount)} | Paid: {formatINR(inv.paid_amount)} | Due: {formatINR(inv.due_amount)}</p>
              {inv.payment_method === "emi" && (
                <p className={inv.emi_next_due_date && String(inv.emi_next_due_date) <= todayISO() && Number(inv.due_amount || 0) > 0 ? "danger-line" : "muted"}>
                  EMI: {formatINR(inv.emi_monthly_amount)} monthly | Next Due: {inv.emi_next_due_date || "Not set"}
                </p>
              )}

              {items.map((item) => (
                <div className="mini-line" key={item.id}>
                  {item.item_name} x {item.quantity} — {formatINR(item.billing_price)}
                  {item.is_covered && <span className="success-line"> Covered</span>}
                </div>
              ))}

              {payments.length > 0 && (
                <div className="sub-panel">
                  <h3>Payment History</h3>
                  {payments.map((payment) => (
                    <div className="mini-line" key={payment.id}>
                      {payment.payment_date} — Cash {formatINR(payment.cash_amount)} | UPI {formatINR(payment.upi_amount)}
                      {payment.note ? ` — ${payment.note}` : ""}
                    </div>
                  ))}
                </div>
              )}

              <div className="row-actions">
                {Number(inv.due_amount || 0) > 0 && (
                  <button className="primary-btn small" onClick={() => setPaymentInvoiceId(paymentInvoiceId === inv.id ? null : inv.id)}>
                    Add Payment
                  </button>
                )}
                <button className="primary-btn small" onClick={() => printInvoice(inv, items, index)}>
                  Print / Save PDF
                </button>
                <button className="ghost-btn small" onClick={() => shareWhatsApp(inv, items, index)}>
                  Share WhatsApp
                </button>
              </div>
              {paymentInvoiceId === inv.id && (
                <InvoicePaymentForm
                  invoice={inv}
                  onClose={() => setPaymentInvoiceId(null)}
                  onDone={async () => {
                    setPaymentInvoiceId(null);
                    await onUpdated?.();
                  }}
                />
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}

function InvoicePaymentForm({ invoice, onClose, onDone }) {
  const [form, setForm] = useState(emptyPayment);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const cash = Number(form.cash_amount || 0);
  const upi = Number(form.upi_amount || 0);
  const newPayment = cash + upi;
  const oldPaid = getPaidAmount(invoice);
  const oldDue = getDueAmount(invoice);
  const updatedPaid = oldPaid + newPayment;
  const updatedDue = Math.max(Number(invoice.total_amount || 0) - updatedPaid, 0);
  const updatedStatus = updatedDue <= 0 ? "Paid" : updatedPaid > 0 ? "Partial" : "Pending";

  async function savePayment() {
    setMessage("");
    if (newPayment <= 0) return setMessage("Enter cash or UPI payment amount.");
    if (newPayment > oldDue) return setMessage("Payment amount cannot be more than pending amount.");

    setSaving(true);

    const { error: paymentError } = await supabase.from("invoice_payments").insert([{
      invoice_id: invoice.id,
      customer_name: invoice.customer_name,
      mobile: invoice.mobile,
      cash_amount: cash,
      upi_amount: upi,
      payment_date: form.payment_date || todayISO(),
      note: form.note.trim(),
    }]);

    if (paymentError) {
      setSaving(false);
      setMessage(paymentError.message);
      return;
    }

    const nextEmiDue =
      invoice.payment_method === "emi" && updatedDue > 0 && form.mark_next_emi
        ? nextMonthlyDate(invoice.emi_next_due_date || form.payment_date || todayISO())
        : updatedDue <= 0
          ? null
          : invoice.emi_next_due_date || null;

    const paymentMethod =
      invoice.payment_method === "emi"
        ? "emi"
        : Number(invoice.cash_amount || 0) + cash > 0 && Number(invoice.upi_amount || 0) + upi > 0
          ? "cash_upi"
          : Number(invoice.cash_amount || 0) + cash > 0
            ? "cash"
            : Number(invoice.upi_amount || 0) + upi > 0
              ? "upi"
              : "pending";

    const { error: invoiceError } = await supabase
      .from("invoices")
      .update({
        cash_amount: Number(invoice.cash_amount || 0) + cash,
        upi_amount: Number(invoice.upi_amount || 0) + upi,
        paid_amount: updatedPaid,
        due_amount: updatedDue,
        payment_status: updatedStatus,
        payment_method: paymentMethod,
        emi_next_due_date: nextEmiDue,
      })
      .eq("id", invoice.id);

    if (invoiceError) {
      setSaving(false);
      setMessage(invoiceError.message);
      return;
    }

    setSaving(false);
    setMessage("Payment added.");
    await onDone?.();
  }

  return (
    <section className="sub-panel">
      <div className="panel-head">
        <h3>Add Payment</h3>
        <button className="ghost-btn small" onClick={onClose}>Close</button>
      </div>
      <div className="payment-summary">
        <div><span>Pending</span><strong>{formatINR(oldDue)}</strong></div>
        <div><span>New Payment</span><strong>{formatINR(newPayment)}</strong></div>
        <div><span>Balance After</span><strong>{formatINR(updatedDue)}</strong></div>
      </div>
      <div className="two-col">
        <div>
          <label className="field-label">Cash Payment</label>
          <input type="number" placeholder="Enter cash amount" value={form.cash_amount} onChange={(e) => setForm({ ...form, cash_amount: e.target.value })} />
        </div>
        <div>
          <label className="field-label">UPI Payment</label>
          <input type="number" placeholder="Enter UPI amount" value={form.upi_amount} onChange={(e) => setForm({ ...form, upi_amount: e.target.value })} />
        </div>
      </div>
      <div className="two-col">
        <div>
          <label className="field-label">Payment Date</label>
          <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Payment Note</label>
          <input placeholder="Example: EMI 1, balance payment" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
      </div>
      {invoice.payment_method === "emi" && updatedDue > 0 && (
        <label className="check-row">
          <input type="checkbox" checked={form.mark_next_emi} onChange={(e) => setForm({ ...form, mark_next_emi: e.target.checked })} />
          Move next EMI reminder to next month
        </label>
      )}
      {message && <div className={message.includes("added") ? "success-box" : "error-box"}>{message}</div>}
      <button className="primary-btn big" onClick={savePayment} disabled={saving}>{saving ? "Saving..." : "Save Payment"}</button>
    </section>
  );
}


function CollectionsPage({ invoices, invoicePayments = [], onUpdated }) {
  const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);
  const [followUpInvoiceId, setFollowUpInvoiceId] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({ date: todayISO(), note: "" });
  const [message, setMessage] = useState("");

  const pendingInvoices = invoices
    .filter((invoice) => getDueAmount(invoice) > 0)
    .sort((a, b) => {
      const aDue = a.emi_next_due_date || a.collection_follow_up_date || a.created_at || "";
      const bDue = b.emi_next_due_date || b.collection_follow_up_date || b.created_at || "";
      return String(aDue).localeCompare(String(bDue));
    });

  const emiDue = pendingInvoices.filter((invoice) => invoice.payment_method === "emi" && invoice.emi_next_due_date && String(invoice.emi_next_due_date) <= todayISO());
  const followUpsDue = pendingInvoices.filter((invoice) => invoice.collection_follow_up_date && String(invoice.collection_follow_up_date) <= todayISO());
  const overdue = pendingInvoices.filter((invoice) => {
    const dueDate = invoice.emi_next_due_date || invoice.collection_follow_up_date;
    return dueDate && String(dueDate) < todayISO();
  });
  const totalPending = pendingInvoices.reduce((sum, invoice) => sum + getDueAmount(invoice), 0);

  async function saveFollowUp(invoice) {
    setMessage("");
    const { error } = await supabase
      .from("invoices")
      .update({
        collection_follow_up_date: followUpForm.date || todayISO(),
        collection_note: followUpForm.note.trim(),
      })
      .eq("id", invoice.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Follow-up saved.");
    setFollowUpInvoiceId(null);
    setFollowUpForm({ date: todayISO(), note: "" });
    await onUpdated?.();
  }

  function whatsAppLink(invoice) {
    const mobile = String(invoice.mobile || "").replace(/\D/g, "");
    const text = encodeURIComponent(
      `Namaste ${invoice.customer_name || ""}, AquaBiz payment reminder. Pending amount: ${formatINR(getDueAmount(invoice))}.`
    );
    return mobile ? `https://wa.me/91${mobile}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  return (
    <>
      <section className="page-head">
        <h2>Collections</h2>
        <p>Pending payments, EMI reminders, and follow-ups.</p>
      </section>

      <section className="cards-grid">
        <StatCard icon="₹" label="Total Pending" value={formatINR(totalPending)} />
        <StatCard icon="E" label="EMI Due" value={emiDue.length} />
        <StatCard icon="!" label="Overdue" value={overdue.length} />
        <StatCard icon="F" label="Follow-ups Due" value={followUpsDue.length} />
      </section>

      {message && <section className={message.includes("saved") ? "success-box" : "error-box"}>{message}</section>}

      <section className="panel">
        <h3>Pending Payment List</h3>
        {pendingInvoices.length === 0 ? <p className="muted">No pending payments.</p> : pendingInvoices.map((invoice) => {
          const payments = invoicePayments.filter((payment) => String(payment.invoice_id) === String(invoice.id));
          const isDue = (
            invoice.payment_method === "emi" &&
            invoice.emi_next_due_date &&
            String(invoice.emi_next_due_date) <= todayISO()
          ) || (
            invoice.collection_follow_up_date &&
            String(invoice.collection_follow_up_date) <= todayISO()
          );

          return (
            <div className="job-card" key={invoice.id}>
              <div className="booking-card-head">
                <div>
                  <strong>{invoice.customer_name}</strong>
                  <p>{invoice.mobile} • {invoice.invoice_type} • {invoice.payment_method || "pending"}</p>
                </div>
                <span className={isDue ? "status unassigned" : "status assigned"}>
                  {isDue ? "Due" : "Pending"}
                </span>
              </div>

              <div className="payment-summary">
                <div><span>Total</span><strong>{formatINR(invoice.total_amount)}</strong></div>
                <div><span>Paid</span><strong>{formatINR(getPaidAmount(invoice))}</strong></div>
                <div><span>Pending</span><strong className="danger-line">{formatINR(getDueAmount(invoice))}</strong></div>
              </div>

              {invoice.payment_method === "emi" && (
                <p className={invoice.emi_next_due_date && String(invoice.emi_next_due_date) <= todayISO() ? "danger-line" : "muted"}>
                  EMI Monthly: {formatINR(invoice.emi_monthly_amount)} | Next EMI: {invoice.emi_next_due_date || "Not set"}
                </p>
              )}

              <p className="muted">
                Follow-up: {invoice.collection_follow_up_date || "Not set"}
                {invoice.collection_note ? ` | ${invoice.collection_note}` : ""}
              </p>

              {payments.length > 0 && (
                <div className="sub-panel">
                  <h3>Recent Payments</h3>
                  {payments.slice(0, 3).map((payment) => (
                    <div className="mini-line" key={payment.id}>
                      {payment.payment_date} — Cash {formatINR(payment.cash_amount)} | UPI {formatINR(payment.upi_amount)}
                    </div>
                  ))}
                </div>
              )}

              <div className="row-actions">
                <a className="ghost-btn small" href={`tel:${invoice.mobile}`}>Call</a>
                <a className="ghost-btn small" href={whatsAppLink(invoice)} target="_blank" rel="noreferrer">WhatsApp</a>
                <button className="primary-btn small" onClick={() => setPaymentInvoiceId(paymentInvoiceId === invoice.id ? null : invoice.id)}>Add Payment</button>
                <button
                  className="ghost-btn small"
                  onClick={() => {
                    setFollowUpInvoiceId(followUpInvoiceId === invoice.id ? null : invoice.id);
                    setFollowUpForm({
                      date: invoice.collection_follow_up_date || todayISO(),
                      note: invoice.collection_note || "",
                    });
                  }}
                >
                  Follow-up
                </button>
              </div>

              {paymentInvoiceId === invoice.id && (
                <InvoicePaymentForm
                  invoice={invoice}
                  onClose={() => setPaymentInvoiceId(null)}
                  onDone={async () => {
                    setPaymentInvoiceId(null);
                    await onUpdated?.();
                  }}
                />
              )}

              {followUpInvoiceId === invoice.id && (
                <section className="sub-panel">
                  <div className="panel-head">
                    <h3>Set Follow-up</h3>
                    <button className="ghost-btn small" onClick={() => setFollowUpInvoiceId(null)}>Close</button>
                  </div>
                  <div className="two-col">
                    <input type="date" value={followUpForm.date} onChange={(e) => setFollowUpForm({ ...followUpForm, date: e.target.value })} />
                    <input placeholder="Follow-up note" value={followUpForm.note} onChange={(e) => setFollowUpForm({ ...followUpForm, note: e.target.value })} />
                  </div>
                  <button className="primary-btn" onClick={() => saveFollowUp(invoice)}>Save Follow-up</button>
                </section>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}


function BusinessSettingsPage({ settings, language, setLanguage, onUpdated }) {
  const [form, setForm] = useState({
    business_name: settings?.business_name || "AquaBiz",
    gst_number: settings?.gst_number || "",
    phone: settings?.phone || "",
    whatsapp: settings?.whatsapp || "",
    email: settings?.email || "",
    address: settings?.address || "",
    google_business_link: settings?.google_business_link || "",
    instagram_link: settings?.instagram_link || "",
    invoice_prefix: settings?.invoice_prefix || "INV",
    gst_enabled: !!settings?.gst_enabled,
    gst_rate: settings?.gst_rate || 18,
    terms: settings?.terms || "Thank you for your business.",
    app_language: settings?.app_language || language || "en",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (settings) {
      setForm({
        business_name: settings.business_name || "AquaBiz",
        gst_number: settings.gst_number || "",
        phone: settings.phone || "",
        whatsapp: settings.whatsapp || "",
        email: settings.email || "",
        address: settings.address || "",
        google_business_link: settings.google_business_link || "",
        instagram_link: settings.instagram_link || "",
        invoice_prefix: settings.invoice_prefix || "INV",
        gst_enabled: !!settings.gst_enabled,
        gst_rate: settings.gst_rate || 18,
        terms: settings.terms || "Thank you for your business.",
        app_language: settings.app_language || language || "en",
      });
    }
  }, [settings]);

  async function saveSettings() {
    setMessage("");

    const payload = {
      id: settings?.id || "00000000-0000-0000-0000-000000000001",
      business_name: form.business_name,
      gst_number: form.gst_number,
      phone: form.phone,
      whatsapp: form.whatsapp,
      email: form.email,
      address: form.address,
      google_business_link: form.google_business_link,
      instagram_link: form.instagram_link,
      invoice_prefix: form.invoice_prefix,
      gst_enabled: !!form.gst_enabled,
      gst_rate: Number(form.gst_rate || 18),
      terms: form.terms,
      app_language: form.app_language,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("business_settings")
      .upsert([payload], { onConflict: "id" });

    if (error) {
      setMessage(error.message);
      return;
    }

    setLanguage(form.app_language);
    setMessage("Business settings saved.");
    await onUpdated();
  }

  return (
    <>
      <section className="page-head">
        <h2>Business Settings</h2>
        <p>Set business details and GST settings shown on invoices.</p>
      </section>

      <section className="panel">
        <div className="form-stack">
          <FormCard label="Business Name">
            <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          </FormCard>

          <div className="two-col">
            <FormCard label="Phone Number">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FormCard>
            <FormCard label="WhatsApp Number">
              <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </FormCard>
          </div>

          <FormCard label="Email">
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormCard>

          <FormCard label="Business Address">
            <textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </FormCard>

          <div className="two-col">
            <FormCard label="GST Number">
              <input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            </FormCard>
            <FormCard label="GST Rate %">
              <input type="number" value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })} />
            </FormCard>
          </div>

          <FormCard label="GST Enabled">
            <div className="chip-grid">
              <button className={form.gst_enabled ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, gst_enabled: true })}>Yes</button>
              <button className={!form.gst_enabled ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, gst_enabled: false })}>No</button>
            </div>
          </FormCard>

          <div className="two-col">
            <FormCard label="Google Business Profile Link">
              <input value={form.google_business_link} onChange={(e) => setForm({ ...form, google_business_link: e.target.value })} />
            </FormCard>
            <FormCard label="Instagram Link">
              <input value={form.instagram_link} onChange={(e) => setForm({ ...form, instagram_link: e.target.value })} />
            </FormCard>
          </div>

          <FormCard label="Invoice Prefix">
            <input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} />
          </FormCard>

          <FormCard label="App Language">
            <div className="chip-grid">
              <button className={form.app_language === "en" ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, app_language: "en" })}>English</button>
              <button className={form.app_language === "hi" ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, app_language: "hi" })}>हिंदी</button>
              <button className={form.app_language === "hinglish" ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, app_language: "hinglish" })}>Hinglish</button>
            </div>
            <p className="helper">This changes key dashboard and navigation labels.</p>
          </FormCard>

          <FormCard label="Invoice Terms">
            <textarea rows={3} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          </FormCard>

          {message && <div className={message.includes("saved") ? "success-box" : "error-box"}>{message}</div>}

          <button className="primary-btn big" onClick={saveSettings}>Save Business Settings</button>
        </div>
      </section>
    </>
  );
}

function CustomerHistoryPage({ customers, bookings, jobs = [], technicians = [], invoices, invoiceItems, invoicePayments = [], coverages, leads = [] }) {
  const [search, setSearch] = useState("");
  const [selectedMobile, setSelectedMobile] = useState("");

  const searchText = search.trim().toLowerCase();
  const filtered = searchText ? customers.filter((c) => {
    const q = searchText;
    return (
      String(c.name || "").toLowerCase().includes(q) ||
      String(c.mobile || "").toLowerCase().includes(q) ||
      String(c.address || "").toLowerCase().includes(q)
    );
  }) : [];

  const selectedCustomer = customers.find((c) => String(c.mobile) === String(selectedMobile));
  const customerBookings = selectedMobile ? bookings.filter((b) => String(b.mobile) === String(selectedMobile)) : [];
  const customerInvoices = selectedMobile ? invoices.filter((i) => String(i.mobile) === String(selectedMobile)) : [];
  const customerCoverages = selectedMobile ? coverages.filter((c) => String(c.mobile) === String(selectedMobile)) : [];
  const customerLeads = selectedMobile ? leads.filter((l) => String(l.mobile) === String(selectedMobile)) : [];
  const customerPayments = selectedMobile ? invoicePayments.filter((p) => String(p.mobile) === String(selectedMobile)) : [];
  const customerJobs = customerBookings
    .map((booking) => {
      const job = jobs.find((j) => String(j.booking_id) === String(booking.id));
      const technician = technicians.find((t) => String(t.id) === String(job?.technician_id));
      return { booking, job, technician };
    })
    .filter((item) => item.job);

  const totalSpend = customerInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
  const paid = customerInvoices.reduce((sum, i) => sum + getPaidAmount(i), 0);
  const pending = customerInvoices.reduce((sum, i) => sum + getDueAmount(i), 0);
  const activeCoverageCount = customerCoverages.filter(isActive).length;
  const dueReminderCount = customerCoverages.filter((c) => c.next_service_due_date && String(c.next_service_due_date) <= todayISO() && isActive(c)).length;
  const lastBooking = customerBookings[0];
  const latestInvoice = customerInvoices[0];
  const latestPayment = customerPayments[0];

  function customerWhatsAppLink() {
    const mobile = String(selectedMobile || "").replace(/\D/g, "");
    const text = encodeURIComponent(`Namaste ${selectedCustomer?.name || ""}, AquaBiz se baat kar rahe hain.`);
    return mobile ? `https://wa.me/91${mobile}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  return (
    <>
      <section className="page-head">
        <h2>Customer History</h2>
        <p>View service, AMC/Warranty, invoice, and payment history for a customer.</p>
      </section>

      <section className="panel">
        <input
          placeholder="Search customer by name, mobile, or address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {searchText && (
          <div className="customer-list">
            {filtered.length === 0 ? <p className="muted">No customer found.</p> : filtered.slice(0, 8).map((c) => (
              <button
                key={c.id}
                className={selectedMobile === c.mobile ? "customer-chip active" : "customer-chip"}
                onClick={() => setSelectedMobile(c.mobile)}
              >
                <strong>{c.name}</strong>
                <span>{c.mobile}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {!selectedCustomer ? (
        <section className="panel">
          <p className="muted">Select a customer.</p>
        </section>
      ) : (
        <>
          <section className="cards-grid">
            <StatCard icon="📋" label="Bookings" value={customerBookings.length} />
            <StatCard icon="🧾" label="Invoices" value={customerInvoices.length} />
            <StatCard icon="💰" label="Total Spend" value={formatINR(totalSpend)} />
            <StatCard icon="⏳" label="Pending" value={formatINR(pending)} />
            <StatCard icon="P" label="Paid" value={formatINR(paid)} />
            <StatCard icon="A" label="Active AMC/Warranty" value={activeCoverageCount} />
            <StatCard icon="R" label="Due Reminders" value={dueReminderCount} />
            <StatCard icon="L" label="Leads" value={customerLeads.length} />
          </section>

          <section className="panel">
            <div className="section-head">
              <div>
                <h3>{selectedCustomer.name}</h3>
                <p>{selectedCustomer.mobile}</p>
                <p>{selectedCustomer.address}</p>
              </div>
              <div className="row-actions">
                <a className="ghost-btn small" href={`tel:${selectedCustomer.mobile}`}>Call</a>
                <a className="ghost-btn small" href={customerWhatsAppLink()} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            </div>
            <div className="payment-summary">
              <div><span>Last Booking</span><strong>{lastBooking ? new Date(lastBooking.created_at).toLocaleDateString("en-IN") : "None"}</strong></div>
              <div><span>Last Invoice</span><strong>{latestInvoice ? formatINR(latestInvoice.total_amount) : "None"}</strong></div>
              <div><span>Last Payment</span><strong>{latestPayment ? `${latestPayment.payment_date} • ${formatINR(Number(latestPayment.cash_amount || 0) + Number(latestPayment.upi_amount || 0))}` : "None"}</strong></div>
            </div>
          </section>

          <section className="panel">
            <h3>AMC / Warranty</h3>
            {customerCoverages.length === 0 ? <p className="muted">No AMC/Warranty records.</p> : customerCoverages.map((c) => (
              <div className="job-card" key={c.id}>
                <strong>{c.source_name}</strong>
                <p>{c.source_type} • {coverageLabel(c.coverage_type)}</p>
                <p>Activation: {c.activation_date} | Expiry: {c.expiry_date}</p>
                <p>Visits: {c.used_visits}/{c.free_visits}</p>
                <p>Next Service: {c.next_service_due_date}</p>
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>Jobs</h3>
            {customerJobs.length === 0 ? <p className="muted">No jobs assigned.</p> : customerJobs.map(({ booking, job, technician }) => (
              <div className="job-card" key={job.id}>
                <div className="booking-card-head">
                  <div>
                    <strong>{booking.service_type}</strong>
                    <p>{booking.address}</p>
                  </div>
                  <span className={isCompletedStatus(job.status) ? "status assigned" : "status unassigned"}>{job.status}</span>
                </div>
                <p>Technician: {technician?.name || "Not found"} {technician?.mobile ? `• ${technician.mobile}` : ""}</p>
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>Bookings</h3>
            {customerBookings.length === 0 ? <p className="muted">No bookings.</p> : customerBookings.map((b) => (
              <div className="job-card" key={b.id}>
                <BookingMini booking={b} />
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>Invoices</h3>
            {customerInvoices.length === 0 ? <p className="muted">No invoices.</p> : customerInvoices.map((inv) => {
              const items = invoiceItems.filter((i) => String(i.invoice_id) === String(inv.id));
              const payments = invoicePayments.filter((p) => String(p.invoice_id) === String(inv.id));
              return (
                <div className="job-card" key={inv.id}>
                  <strong>{inv.invoice_type}</strong>
                  <p>Total: {formatINR(inv.total_amount)} | Paid: {formatINR(getPaidAmount(inv))} | Due: {formatINR(getDueAmount(inv))}</p>
                  <p>Status: {inv.payment_status} | Method: {inv.payment_method}</p>
                  {inv.payment_method === "emi" && <p className="muted">EMI: {formatINR(inv.emi_monthly_amount)} | Next Due: {inv.emi_next_due_date || "Not set"}</p>}
                  {items.map((item) => (
                    <div className="mini-line" key={item.id}>{item.item_name} x {item.quantity} — {formatINR(item.billing_price)}</div>
                  ))}
                </div>
              );
            })}
          </section>

          <section className="panel">
            <h3>Lead History</h3>
            {customerLeads.length === 0 ? <p className="muted">No leads for this customer.</p> : customerLeads.map((lead) => (
              <div className="job-card" key={lead.id}>
                <div className="booking-card-head">
                  <div>
                    <strong>{lead.interest}</strong>
                    <p>{lead.source} - Follow-up: {lead.follow_up_date || "Not set"}</p>
                  </div>
                  <span className="status assigned">{lead.status}</span>
                </div>
                {lead.notes && <p className="muted">{lead.notes}</p>}
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}


function SettingsPage({ services, setPage, onUpdated }) {
  const [serviceForm, setServiceForm] = useState({ name: "", price: "" });
  const [serviceEdit, setServiceEdit] = useState({});
  const [techForm, setTechForm] = useState({ name: "", mobile: "", pin: "123456" });
  const [telecallerForm, setTelecallerForm] = useState({ name: "", mobile: "", pin: "123456" });
  const [techniciansList, setTechniciansList] = useState([]);
  const [telecallersList, setTelecallersList] = useState([]);
  const [message, setMessage] = useState("");
  const cleanServices = uniqueServices(services);

  async function loadTechnicians() {
    const { data, error } = await supabase.from("technicians").select("*").order("name", { ascending: true });
    if (!error) setTechniciansList(data || []);
  }

  async function loadTelecallers() {
    const { data, error } = await supabase.from("telecallers").select("*").order("name", { ascending: true });
    if (!error) setTelecallersList(data || []);
  }

  useEffect(() => {
    loadTechnicians();
    loadTelecallers();
  }, []);

  async function addService() {
    setMessage("");
    if (!serviceForm.name.trim()) return setMessage("Service name is required.");
    const { error } = await supabase.from("services").insert([{
      name: serviceForm.name.trim(),
      price: Number(serviceForm.price || 0),
    }]);
    if (error) return setMessage(error.message);
    setServiceForm({ name: "", price: "" });
    setMessage("Service added.");
    await onUpdated();
  }

  async function updateService(service) {
    setMessage("");
    const price = serviceEdit[service.id] ?? service.price;
    const sameNameIds = services
      .filter((item) => String(item.name || "").trim().toLowerCase() === String(service.name || "").trim().toLowerCase())
      .map((item) => item.id);
    const { error } = await supabase.from("services").update({ price: Number(price || 0) }).in("id", sameNameIds);
    if (error) return setMessage(error.message);
    setMessage("Service price updated.");
    await onUpdated();
  }

  async function addTechnician() {
    setMessage("");
    if (!techForm.name.trim() || !techForm.mobile.trim() || !techForm.pin.trim()) {
      setMessage("Technician name, mobile and PIN are required.");
      return;
    }
    if (String(techForm.pin).trim().length !== 6) {
      setMessage("PIN must be 6 digits.");
      return;
    }

    const { error } = await supabase.from("technicians").insert([{
      name: techForm.name.trim(),
      mobile: techForm.mobile.trim(),
      pin: techForm.pin.trim(),
    }]);

    if (error) return setMessage(error.message);

    setTechForm({ name: "", mobile: "", pin: "123456" });
    setMessage("Technician added.");
    await loadTechnicians();
    await onUpdated();
  }

  async function updateTechnicianPin(tech, pin) {
    setMessage("");
    const { error } = await supabase.from("technicians").update({ pin }).eq("id", tech.id);
    if (error) return setMessage(error.message);
    setMessage("Technician PIN updated.");
    await loadTechnicians();
    await onUpdated();
  }

  async function addTelecaller() {
    setMessage("");
    if (!telecallerForm.name.trim() || !telecallerForm.mobile.trim() || !telecallerForm.pin.trim()) {
      setMessage("Telecaller name, mobile and PIN are required.");
      return;
    }
    if (String(telecallerForm.pin).trim().length !== 6) {
      setMessage("PIN must be 6 digits.");
      return;
    }

    const { error } = await supabase.from("telecallers").insert([{
      name: telecallerForm.name.trim(),
      mobile: telecallerForm.mobile.trim(),
      pin: telecallerForm.pin.trim(),
    }]);

    if (error) return setMessage(error.message);

    setTelecallerForm({ name: "", mobile: "", pin: "123456" });
    setMessage("Telecaller added.");
    await loadTelecallers();
    await onUpdated();
  }

  async function updateTelecallerPin(telecaller, pin) {
    setMessage("");
    const { error } = await supabase.from("telecallers").update({ pin }).eq("id", telecaller.id);
    if (error) return setMessage(error.message);
    setMessage("Telecaller PIN updated.");
    await loadTelecallers();
    await onUpdated();
  }

  return (
    <>
      <section className="page-head">
        <h2>Admin Settings</h2>
        <p>Manage service prices and technicians.</p>
      </section>

      <section className="panel">
        <h3>Service Prices</h3>
        <p className="muted">Booking amount is picked from these service prices.</p>

        {cleanServices.length === 0 ? <p className="muted">No services found. Add your first service below.</p> : cleanServices.map((s) => (
          <div className="booking-row" key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <p>Current price: {formatINR(s.price)}</p>
            </div>
            <div className="inline-edit">
              <input
                type="number"
                value={serviceEdit[s.id] ?? s.price ?? ""}
                onChange={(e) => setServiceEdit({ ...serviceEdit, [s.id]: e.target.value })}
              />
              <button className="primary-btn small" onClick={() => updateService(s)}>Update</button>
            </div>
          </div>
        ))}

        <div className="sub-panel">
          <h3>Add New Service</h3>
          <div className="two-col">
            <input placeholder="Service name e.g. Installation" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} />
            <input placeholder="Price" type="number" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} />
          </div>
          <button className="primary-btn" onClick={addService}>Add Service</button>
        </div>
      </section>

      <section className="panel">
        <h3>Technicians</h3>
        <p className="muted">Create technician login with mobile number and 6-digit PIN.</p>

        <div className="sub-panel">
          <h3>Add Technician</h3>
          <div className="two-col">
            <input placeholder="Technician name" value={techForm.name} onChange={(e) => setTechForm({ ...techForm, name: e.target.value })} />
            <input placeholder="Mobile number" inputMode="numeric" value={techForm.mobile} onChange={(e) => setTechForm({ ...techForm, mobile: e.target.value })} />
          </div>
          <input placeholder="6 digit PIN" inputMode="numeric" maxLength="6" value={techForm.pin} onChange={(e) => setTechForm({ ...techForm, pin: e.target.value })} />
          <button className="primary-btn" onClick={addTechnician}>Add Technician</button>
        </div>

        {techniciansList.length === 0 ? <p className="muted">No technicians added.</p> : techniciansList.map((t) => (
          <div className="booking-row" key={t.id}>
            <div>
              <strong>{t.name}</strong>
              <p>{t.mobile}</p>
            </div>
            <div className="inline-edit">
              <input
                placeholder="PIN"
                defaultValue={t.pin || ""}
                maxLength="6"
                onBlur={(e) => updateTechnicianPin(t, e.target.value)}
              />
              <span className="status assigned">PIN</span>
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <h3>Telecallers</h3>
        <p className="muted">Create telecaller login with mobile number and 6-digit PIN.</p>

        <div className="sub-panel">
          <h3>Add Telecaller</h3>
          <div className="two-col">
            <input placeholder="Telecaller name" value={telecallerForm.name} onChange={(e) => setTelecallerForm({ ...telecallerForm, name: e.target.value })} />
            <input placeholder="Mobile number" inputMode="numeric" value={telecallerForm.mobile} onChange={(e) => setTelecallerForm({ ...telecallerForm, mobile: e.target.value })} />
          </div>
          <input placeholder="6 digit PIN" inputMode="numeric" maxLength="6" value={telecallerForm.pin} onChange={(e) => setTelecallerForm({ ...telecallerForm, pin: e.target.value })} />
          <button className="primary-btn" onClick={addTelecaller}>Add Telecaller</button>
        </div>

        {telecallersList.length === 0 ? <p className="muted">No telecallers added.</p> : telecallersList.map((t) => (
          <div className="booking-row" key={t.id}>
            <div>
              <strong>{t.name}</strong>
              <p>{t.mobile}</p>
            </div>
            <div className="inline-edit">
              <input
                placeholder="PIN"
                defaultValue={t.pin || ""}
                maxLength="6"
                onBlur={(e) => updateTelecallerPin(t, e.target.value)}
              />
              <span className="status assigned">PIN</span>
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <h3>Other Admin Pages</h3>
        <div className="action-grid">
          <button onClick={() => setPage("business")}>Business Settings</button>
          <button onClick={() => setPage("plans")}>Plans / Products</button>
          <button onClick={() => setPage("inventory")}>Inventory</button>
          <button onClick={() => setPage("reports")}>Reports</button>
        </div>
      </section>

      {message && <div className={message.includes("added") || message.includes("updated") ? "success-box" : "error-box"}>{message}</div>}
    </>
  );
}

function FormCard({ label, children }) { return <section className="form-card"><label>{label}</label>{children}</section>; }

function BookingRow({ booking, jobs, technicians }) {
  const job = jobs.find((j) => String(j.booking_id) === String(booking.id));
  const tech = technicians.find((t) => String(t.id) === String(job?.technician_id));
  return <div className="booking-row"><div><strong>{booking.customer_name}</strong><p>{booking.service_type} • {formatINR(booking.booking_amount)} • {booking.mobile}</p></div><span className={job ? "status assigned" : "status unassigned"}>{job ? tech?.name || "Assigned" : "Unassigned"}</span></div>;
}

function BookingMini({ booking }) {
  if (!booking) return <p className="muted">Booking not found.</p>;
  return <div className="booking-mini"><strong>{booking.customer_name}</strong><p>{booking.mobile}</p><p>{booking.service_type} • {formatINR(booking.booking_amount)}</p><p>{booking.address}</p>{booking.complaint_notes && <p><strong>Notes:</strong> {booking.complaint_notes}</p>}</div>;
}

function BottomNav({ page, setPage }) {
  const items = [["dashboard", "Dashboard", "🏠"], ["booking", "Booking", "➕"], ["jobs", "Jobs", "🧰"], ["sale", "Sale/AMC", "🛡️"], ["settings", "More", "⚙️"]];
  return <nav className="bottom-nav">{items.map(([key, label, icon]) => <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}><span>{icon}</span><small>{label}</small></button>)}</nav>;
}
