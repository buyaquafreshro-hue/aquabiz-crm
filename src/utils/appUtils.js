export function formatINR(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateString, days) {
  const d = new Date(dateString + "T00:00:00");
  d.setDate(d.getDate() + Number(days || 0));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalMonthKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousMonthKey(monthKey) {
  const [year, month] = String(monthKey || getLocalMonthKey()).split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return getLocalMonthKey(d);
}

export function getRecordMonthKey(record) {
  const rawDate = record?.invoice_date || record?.created_at || record?.date;
  if (!rawDate) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(rawDate))) return String(rawDate).slice(0, 7);
  return getLocalMonthKey(rawDate);
}

export function getDashboardMonthKey(bookings = [], invoices = []) {
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

export function getPaidAmount(invoice) {
  const cash = Number(invoice?.cash_amount || 0);
  const upi = Number(invoice?.upi_amount || 0);
  const paid = Number(invoice?.paid_amount || 0);
  if (cash || upi) return cash + upi;
  if (paid) return paid;
  return String(invoice?.payment_status || "").toLowerCase() === "paid" ? Number(invoice?.total_amount || 0) : 0;
}

export function getDueAmount(invoice) {
  if (invoice && invoice.due_amount !== undefined && invoice.due_amount !== null && invoice.due_amount !== "") {
    return Math.max(Number(invoice.due_amount || 0), 0);
  }
  return Math.max(Number(invoice?.total_amount || 0) - getPaidAmount(invoice), 0);
}

export function nextMonthlyDate(dateString) {
  const d = new Date((dateString || todayISO()) + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export function getBookingPriority(booking) {
  const base = String(booking?.priority || "Normal");
  const order = ["Normal", "Medium", "High", "Critical"];
  const baseIndex = Math.max(order.findIndex((p) => p.toLowerCase() === base.toLowerCase()), 0);
  const createdAt = booking?.created_at ? new Date(booking.created_at) : new Date();
  const ageDays = Math.max(Math.floor((Date.now() - createdAt.getTime()) / 86400000), 0);
  const extra = ageDays >= 3 ? 3 : ageDays >= 2 ? 2 : ageDays >= 1 ? 1 : 0;
  return order[Math.min(baseIndex + extra, order.length - 1)];
}

export function isCompletedStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  return ["completed", "complete", "done", "closed"].includes(value);
}

export function getCompletedJobsCount(jobs = [], invoices = []) {
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

export function uniqueServices(services = []) {
  const seen = new Set();
  return services.filter((service) => {
    const key = `${String(service.name || "").trim().toLowerCase()}-${Number(service.price || 0)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isActive(record) {
  if (!record) return false;
  return String(record.expiry_date || "") >= todayISO();
}

export function arrIncludes(arr, id) {
  return Array.isArray(arr) && arr.map(String).includes(String(id));
}

export function itemCoveredByRecord(item, record) {
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

export function coverageLabel(value) {
  if (value === "all") return "All Parts Covered";
  if (value === "electric") return "Electric Parts (Pump + SMPS)";
  if (value === "selected") return "Selected Parts/Categories";
  if (value === "none") return "No Parts Covered";
  return "Selected Coverage";
}

export function getCustomerCoverageStatus(mobile, coverages = []) {
  const cleanMobile = String(mobile || "").replace(/\D/g, "");
  const customerCoverages = coverages.filter((c) => String(c.mobile || "").replace(/\D/g, "") === cleanMobile);
  const activeCoverage = customerCoverages.find(isActive);

  if (activeCoverage?.source_type === "amc") return "Under AMC";
  if (activeCoverage?.source_type === "new_sale") return "Under Warranty";
  if (activeCoverage) return "Under Coverage";
  if (customerCoverages.length > 0) return "Out of Warranty";
  return "New Customer";
}
