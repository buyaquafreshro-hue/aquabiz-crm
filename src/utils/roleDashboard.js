import { getPaidAmount, getPreviousMonthKey, getRecordMonthKey, isCompletedStatus, todayISO } from "./appUtils";

export function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

export function isClosedJobStatus(status) {
  const value = normalizeStatus(status);
  return isCompletedStatus(value) || value === "cancelled" || value === "canceled";
}

export function isOpenJobStatus(status) {
  return !isClosedJobStatus(status);
}

export function getCompletionTime(job, booking) {
  return job?.completed_at || job?.updated_at || booking?.completed_at || booking?.updated_at || booking?.booking_date || booking?.created_at || "";
}

export function isRecentCompletedJob(job, booking, now = new Date()) {
  return isCompletedStatus(job?.status);
}

export function getLocalDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getCurrentMonthKey() {
  return todayISO().slice(0, 7);
}

function linkedToTelecaller(invoice, bookings, telecallerId) {
  if (!telecallerId) return false;
  if (String(invoice.telecaller_id || "") === String(telecallerId)) return true;
  const booking = bookings.find((item) => String(item.id) === String(invoice.booking_id));
  return String(booking?.telecaller_id || booking?.created_by_telecaller_id || "") === String(telecallerId);
}

function linkedToTechnician(invoice, jobs, bookings, technicianId) {
  if (!technicianId) return false;
  if (String(invoice.technician_id || "") === String(technicianId)) return true;
  const job = jobs.find((item) => String(item.booking_id) === String(invoice.booking_id));
  if (String(job?.technician_id || "") === String(technicianId)) return true;
  const booking = bookings.find((item) => String(item.id) === String(invoice.booking_id));
  return String(booking?.assigned_technician_id || booking?.technician_id || "") === String(technicianId);
}

export function calculateTelecallerStats({ telecaller, leads = [], bookings = [], jobs = [], invoices = [] }) {
  const telecallerId = telecaller?.id;
  const today = getLocalDateKey();
  const currentMonth = getCurrentMonthKey();
  const lastMonth = getPreviousMonthKey(currentMonth);
  const ownLead = (lead) => String(lead.telecaller_id || lead.assigned_telecaller_id || "") === String(telecallerId);
  const ownBooking = (booking) => String(booking.telecaller_id || booking.created_by_telecaller_id || "") === String(telecallerId);
  const ownInvoices = invoices.filter((invoice) => linkedToTelecaller(invoice, bookings, telecallerId));
  const ownBookings = bookings.filter(ownBooking);
  const ownBookingIds = new Set(ownBookings.map((booking) => String(booking.id)));

  return {
    todaysFollowups: leads.filter((lead) => ownLead(lead) && getLocalDateKey(lead.follow_up_date) === today).length,
    todaysLeads: leads.filter((lead) => ownLead(lead) && getLocalDateKey(lead.created_at || lead.date) === today).length,
    overdueFollowups: leads.filter((lead) => ownLead(lead) && lead.follow_up_date && getLocalDateKey(lead.follow_up_date) < today && !["converted", "lost", "closed"].includes(normalizeStatus(lead.status))).length,
    currentMonthRevenue: ownInvoices.filter((invoice) => getRecordMonthKey(invoice) === currentMonth).reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
    lastMonthRevenue: ownInvoices.filter((invoice) => getRecordMonthKey(invoice) === lastMonth).reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
    totalBookingsCreated: ownBookings.length,
    openJobsCreated: jobs.filter((job) => ownBookingIds.has(String(job.booking_id)) && isOpenJobStatus(job.status) && job.is_active !== false && job.assignment_status !== "reassigned").length,
  };
}

export function calculateTechnicianStats({ technician, jobs = [], bookings = [], invoices = [] }) {
  const technicianId = technician?.id;
  const currentMonth = getCurrentMonthKey();
  const lastMonth = getPreviousMonthKey(currentMonth);
  const myJobs = jobs.filter((job) => String(job.technician_id || "") === String(technicianId) && job.is_active !== false && job.assignment_status !== "reassigned");
  const myInvoices = invoices.filter((invoice) => linkedToTechnician(invoice, jobs, bookings, technicianId));
  const completedJobs = myJobs.filter((job) => isCompletedStatus(job.status));

  const repeatJobs = completedJobs.filter((job) => {
    const completedBooking = bookings.find((booking) => String(booking.id) === String(job.booking_id));
    const completedAt = getCompletionTime(job, completedBooking);
    if (!completedBooking?.mobile || !completedAt) return false;
    const completedTime = new Date(completedAt).getTime();
    if (Number.isNaN(completedTime)) return false;
    return bookings.some((booking) => {
      if (String(booking.id) === String(completedBooking.id)) return false;
      if (String(booking.mobile || "") !== String(completedBooking.mobile || "")) return false;
      const bookingTime = new Date(booking.created_at || booking.booking_date || booking.date || "").getTime();
      return !Number.isNaN(bookingTime) && bookingTime > completedTime && bookingTime <= completedTime + 7 * 24 * 60 * 60 * 1000;
    });
  }).length;

  return {
    openPendingJobs: myJobs.filter((job) => isOpenJobStatus(job.status)).length,
    currentMonthRevenue: myInvoices.filter((invoice) => getRecordMonthKey(invoice) === currentMonth).reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
    lastMonthRevenue: myInvoices.filter((invoice) => getRecordMonthKey(invoice) === lastMonth).reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
    totalCompletedJobs: completedJobs.length,
    repeatJobs,
  };
}
