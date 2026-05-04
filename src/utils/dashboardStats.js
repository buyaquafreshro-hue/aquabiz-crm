import {
  getCompletedJobsCount,
  getDashboardMonthKey,
  getDueAmount,
  getPaidAmount,
  getPreviousMonthKey,
  getRecordMonthKey,
  isActive,
  todayISO,
} from "./appUtils";
import { isOpenJobStatus } from "./roleDashboard";

export function calculateDashboardStats({
  bookings = [],
  jobs = [],
  customersCount = 0,
  inventory = [],
  coverages = [],
  invoices = [],
  leads = [],
}) {
  const month = getDashboardMonthKey(bookings, invoices);
  const lastMonth = getPreviousMonthKey(month);
  const currentMonthInvoices = invoices.filter((invoice) => getRecordMonthKey(invoice) === month);
  const lastMonthInvoices = invoices.filter((invoice) => getRecordMonthKey(invoice) === lastMonth);
  const currentMonthAmc = currentMonthInvoices.filter((invoice) => invoice.invoice_type === "amc");
  const currentMonthSales = currentMonthInvoices.filter((invoice) => invoice.invoice_type === "new_sale");
  const currentMonthService = currentMonthInvoices.filter((invoice) => !["amc", "new_sale"].includes(invoice.invoice_type));
  const currentMonthBookings = bookings.filter((booking) => getRecordMonthKey(booking) === month);
  const totalCollection = currentMonthInvoices.reduce((sum, invoice) => sum + getPaidAmount(invoice), 0);
  const pending = currentMonthInvoices.reduce((sum, invoice) => sum + getDueAmount(invoice), 0);
  const assignedIds = new Set(jobs.map((job) => String(job.booking_id)));
  const bookingIds = new Set(bookings.map((booking) => String(booking.id)));
  const lowStock = inventory.filter((part) => Number(part.stock_qty || 0) <= Number(part.low_stock_qty || 0)).length;
  const serviceDue = coverages.filter((coverage) => coverage.next_service_due_date && String(coverage.next_service_due_date) <= todayISO() && isActive(coverage)).length;
  const emiDue = invoices.filter((invoice) => invoice.payment_method === "emi" && getDueAmount(invoice) > 0 && invoice.emi_next_due_date && String(invoice.emi_next_due_date) <= todayISO()).length;
  const rentDue = invoices.filter((invoice) => invoice.invoice_type === "rental" && invoice.rental_next_due_date && String(invoice.rental_next_due_date) <= todayISO()).length;
  const paymentFollowUpsDue = invoices.filter((invoice) => getDueAmount(invoice) > 0 && invoice.collection_follow_up_date && String(invoice.collection_follow_up_date) <= todayISO()).length;
  const leadFollowUpsDue = leads.filter((lead) => lead.follow_up_date && String(lead.follow_up_date) <= todayISO() && !["Converted", "Lost"].includes(lead.status)).length;
  const remindersDue = serviceDue + emiDue + rentDue + paymentFollowUpsDue + leadFollowUpsDue;
  const completedJobs = getCompletedJobsCount(jobs, invoices);

  return {
    monthInvoices: currentMonthInvoices.length,
    month,
    lastMonth,
    currentMonthSales: currentMonthSales.reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
    currentMonthAmc: currentMonthAmc.reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
    currentMonthService: currentMonthService.reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
    lastMonthCollection: lastMonthInvoices.reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
    totalBookings: currentMonthBookings.length || bookings.length,
    totalCollection,
    pending,
    pendingJobs: bookings.filter((booking) => !assignedIds.has(String(booking.id))).length,
    totalJobs: jobs.length,
    openJobs: jobs.filter((job) => bookingIds.has(String(job.booking_id)) && isOpenJobStatus(job.status)).length,
    completedJobs,
    lowStock,
    activeCoverages: coverages.filter(isActive).length,
    remindersDue,
    customers: customersCount,
  };
}
