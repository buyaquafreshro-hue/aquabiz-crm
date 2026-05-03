import { getRecordMonthKey, getLocalMonthKey, getPaidAmount, todayISO } from "./appUtils";

export function calculateSalesIncentive(invoiceTotal, salesPerson) {
  if (!salesPerson) return 0;
  const value = Number(salesPerson.incentive_value || 0);
  if (String(salesPerson.incentive_type || "percentage") === "fixed") return value;
  return Math.round((Number(invoiceTotal || 0) * value) / 100);
}

export function calculateSalesStats({ salesPerson, invoices = [] }) {
  const id = String(salesPerson?.id || "");
  const currentMonth = getLocalMonthKey();
  const today = todayISO();
  const ownInvoices = invoices.filter((invoice) => String(invoice.sales_person_id || "") === id);

  return {
    todaySales: ownInvoices
      .filter((invoice) => String(invoice.created_at || invoice.invoice_date || "").slice(0, 10) === today)
      .reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
    monthSales: ownInvoices
      .filter((invoice) => getRecordMonthKey(invoice) === currentMonth)
      .reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
    monthIncentive: ownInvoices
      .filter((invoice) => getRecordMonthKey(invoice) === currentMonth)
      .reduce((sum, invoice) => sum + Number(invoice.sales_incentive_amount || 0), 0),
    salesCount: ownInvoices.length,
    ownInvoices,
  };
}
