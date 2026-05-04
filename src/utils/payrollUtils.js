import { getPaidAmount, getRecordMonthKey, isCompletedStatus } from "./appUtils";

export const salaryTypes = [
  ["fixed", "Fixed Salary"],
  ["incentive", "Incentive Only"],
  ["fixed_incentive", "Fixed + Incentive"],
];

export const employeeRoles = [
  ["telecaller", "Telecaller"],
  ["technician", "Technician"],
  ["sales", "Sales Person"],
];

export function employeeLabel(role) {
  return employeeRoles.find(([value]) => value === role)?.[1] || role;
}

export function monthRange(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function isInMonth(record, monthKey) {
  return getRecordMonthKey(record) === monthKey;
}

export function getEmployeesByRole(role, { telecallers = [], technicians = [], salesPersons = [] }) {
  if (role === "telecaller") return telecallers;
  if (role === "technician") return technicians;
  if (role === "sales") return salesPersons;
  return [];
}

function settingNumber(setting, key) {
  return Number(setting?.[key] || 0);
}

function ownTelecallerBookings(setting, bookings, monthKey) {
  const id = String(setting.employee_id || "");
  return bookings.filter((booking) =>
    isInMonth(booking, monthKey) &&
    [booking.telecaller_id, booking.created_by_telecaller_id, booking.assigned_telecaller_id].map(String).includes(id)
  );
}

function ownTelecallerInvoices(setting, invoices, monthKey) {
  const id = String(setting.employee_id || "");
  return invoices.filter((invoice) => isInMonth(invoice, monthKey) && String(invoice.telecaller_id || "") === id);
}

function ownTechnicianJobs(setting, jobs, monthKey) {
  const id = String(setting.employee_id || "");
  return jobs.filter((job) => isInMonth(job, monthKey) && String(job.technician_id || "") === id);
}

function ownTechnicianInvoices(setting, invoices, jobs, monthKey) {
  const id = String(setting.employee_id || "");
  return invoices.filter((invoice) => {
    if (!isInMonth(invoice, monthKey)) return false;
    if (String(invoice.technician_id || "") === id) return true;
    const job = jobs.find((row) => String(row.booking_id) === String(invoice.booking_id));
    return String(job?.technician_id || "") === id;
  });
}

function ownSalesInvoices(setting, invoices, monthKey) {
  const id = String(setting.employee_id || "");
  return invoices.filter((invoice) => isInMonth(invoice, monthKey) && String(invoice.sales_person_id || "") === id);
}

function countInstallations({ role, setting, bookings, jobs, invoices, monthKey }) {
  const isInstallation = (text) => String(text || "").toLowerCase().includes("installation");
  if (role === "technician") {
    return ownTechnicianJobs(setting, jobs, monthKey).filter((job) => {
      const booking = bookings.find((row) => String(row.id) === String(job.booking_id));
      return isCompletedStatus(job.status) && isInstallation(booking?.service_type);
    }).length;
  }
  if (role === "sales") {
    return ownSalesInvoices(setting, invoices, monthKey).filter((invoice) => invoice.invoice_type === "new_sale").length;
  }
  return ownTelecallerBookings(setting, bookings, monthKey).filter((booking) => isInstallation(booking.service_type)).length;
}

function countRepeatJobs(setting, bookings, jobs, monthKey) {
  const id = String(setting.employee_id || "");
  const completed = jobs
    .filter((job) => String(job.technician_id || "") === id && isCompletedStatus(job.status))
    .map((job) => ({ job, booking: bookings.find((booking) => String(booking.id) === String(job.booking_id)) }))
    .filter(({ booking }) => booking?.mobile);

  let count = 0;
  completed.forEach(({ job, booking }) => {
    const completedAt = new Date(job.completed_at || job.updated_at || job.created_at || booking.created_at);
    const hasRepeat = bookings.some((nextBooking) => {
      if (String(nextBooking.id) === String(booking.id)) return false;
      if (String(nextBooking.mobile || "") !== String(booking.mobile || "")) return false;
      if (getRecordMonthKey(nextBooking) !== monthKey) return false;
      const nextDate = new Date(nextBooking.created_at || nextBooking.booking_date || nextBooking.date);
      const diffDays = (nextDate - completedAt) / 86400000;
      return diffDays > 0 && diffDays <= 7;
    });
    if (hasRepeat) count += 1;
  });
  return count;
}

export function calculatePayrollRow({ setting, monthKey, bookings = [], jobs = [], invoices = [], salaryAdvances = [], existingRun = null }) {
  const role = setting.role;
  const salaryType = setting.salary_type || "fixed_incentive";
  const fixedSalary = salaryType === "incentive" ? 0 : settingNumber(setting, "fixed_salary");
  let revenueInvoices = [];
  let count = 0;
  let completedJobsCount = 0;
  let amcSalesCount = 0;

  if (role === "telecaller") {
    const ownBookings = ownTelecallerBookings(setting, bookings, monthKey);
    revenueInvoices = ownTelecallerInvoices(setting, invoices, monthKey);
    count = ownBookings.length;
  }

  if (role === "technician") {
    const ownJobs = ownTechnicianJobs(setting, jobs, monthKey);
    revenueInvoices = ownTechnicianInvoices(setting, invoices, jobs, monthKey);
    completedJobsCount = ownJobs.filter((job) => isCompletedStatus(job.status)).length;
    count = completedJobsCount;
  }

  if (role === "sales") {
    revenueInvoices = ownSalesInvoices(setting, invoices, monthKey);
    count = revenueInvoices.length;
  }

  const revenueGenerated = revenueInvoices.reduce((sum, invoice) => sum + getPaidAmount(invoice), 0);
  amcSalesCount = revenueInvoices.filter((invoice) => invoice.invoice_type === "amc").length;
  const installationCount = countInstallations({ role, setting, bookings, jobs, invoices, monthKey });
  const repeatJobs = role === "technician" ? countRepeatJobs(setting, bookings, jobs, monthKey) : 0;
  const targetMet = settingNumber(setting, "target_amount") > 0 && revenueGenerated >= settingNumber(setting, "target_amount");
  const monthAdvances = salaryAdvances.filter((advance) =>
    String(advance.employee_id || "") === String(setting.employee_id || "") &&
    String(advance.role || "") === String(setting.role || "") &&
    getRecordMonthKey({ created_at: advance.advance_date || advance.created_at }) === monthKey &&
    String(advance.status || "pending") !== "cancelled"
  );
  const advanceAmount = monthAdvances.reduce((sum, advance) => sum + Number(advance.amount || 0), 0);

  const incentive =
    (role === "telecaller" ? count * settingNumber(setting, "per_booking_incentive") : 0) +
    (role === "technician" ? completedJobsCount * settingNumber(setting, "per_completed_job_incentive") : 0) +
    (revenueGenerated * settingNumber(setting, "sales_percentage_incentive")) / 100 +
    amcSalesCount * settingNumber(setting, "amc_sale_incentive") +
    installationCount * settingNumber(setting, "installation_incentive") +
    (targetMet ? settingNumber(setting, "target_bonus") : 0);

  const incentiveAmount = salaryType === "fixed" ? 0 : Math.round(incentive);
  const penalty = repeatJobs * settingNumber(setting, "repeat_job_penalty");
  const manualDeduction = settingNumber(setting, "advance_deduction");
  const finalPayable = Math.max(fixedSalary + incentiveAmount - penalty - manualDeduction - advanceAmount, 0);

  return {
    id: existingRun?.id || null,
    month: monthKey,
    employee_salary_setting_id: setting.id,
    employee_id: setting.employee_id,
    employee_name: setting.employee_name,
    role,
    salary_type: salaryType,
    fixed_salary: fixedSalary,
    revenue_generated: revenueGenerated,
    bookings_count: role === "telecaller" ? count : 0,
    completed_jobs_count: role === "technician" ? completedJobsCount : 0,
    sales_count: role === "sales" ? count : revenueInvoices.length,
    incentive_amount: incentiveAmount,
    penalty_amount: penalty,
    advance_amount: advanceAmount + manualDeduction,
    final_payable: finalPayable,
    status: existingRun?.status || "Draft",
    calculated_at: new Date().toISOString(),
    meta: {
      amc_sales_count: amcSalesCount,
      installation_count: installationCount,
      repeat_jobs: repeatJobs,
      target_met: targetMet,
      month_advance_amount: advanceAmount,
      manual_deduction: manualDeduction,
    },
  };
}

export function calculatePayroll({ settings = [], monthKey, bookings = [], jobs = [], invoices = [], salaryAdvances = [], payrollRuns = [] }) {
  return settings.map((setting) => {
    const existingRun = payrollRuns.find((run) =>
      String(run.month) === String(monthKey) &&
      String(run.employee_salary_setting_id || "") === String(setting.id || "")
    );
    return calculatePayrollRow({ setting, monthKey, bookings, jobs, invoices, salaryAdvances, existingRun });
  });
}
