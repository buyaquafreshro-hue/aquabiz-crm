import { formatINR, getDueAmount, getPaidAmount, normalizeMobile, todayISO } from "./appUtils";

export function buildWhatsAppUrl(mobile, message) {
  const cleanMobile = normalizeMobile(mobile);
  const text = encodeURIComponent(message || "");
  return cleanMobile ? `https://wa.me/91${cleanMobile}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function customerGreetingMessage(customerName = "", businessName = "AquaBiz") {
  return `Namaste ${customerName || ""}, ${businessName} se baat kar rahe hain.`;
}

export function paymentReminderMessage(invoice, businessSettings = {}) {
  const businessName = businessSettings?.business_name || "AquaBiz";
  const dueDate = invoice?.emi_next_due_date || invoice?.collection_follow_up_date || todayISO();
  const emiLine = invoice?.payment_method === "emi"
    ? `\nMonthly EMI: ${formatINR(invoice.emi_monthly_amount || invoice.emi_amount)}`
    : "";
  const upiLine = businessSettings?.upi_id ? `\nUPI ID: ${businessSettings.upi_id}` : "";
  return [
    `Namaste ${invoice?.customer_name || ""},`,
    `${businessName} payment reminder.`,
    `Pending Amount: ${formatINR(getDueAmount(invoice))}`,
    `Due Date: ${dueDate}${emiLine}${upiLine}`,
    "Please pay at your convenience. Thank you.",
  ].join("\n");
}

export function emiReminderMessage(invoice, businessSettings = {}) {
  const businessName = businessSettings?.business_name || "AquaBiz";
  const upiLine = businessSettings?.upi_id || invoice?.upi_id ? `\nUPI ID: ${invoice?.upi_id || businessSettings.upi_id}` : "";
  return [
    `Namaste ${invoice?.customer_name || ""},`,
    `${businessName} EMI reminder.`,
    `EMI Amount: ${formatINR(invoice?.emi_amount || invoice?.emi_monthly_amount || invoice?.invoice_print_qr_amount)}`,
    `Due Date: ${invoice?.emi_next_due_date || todayISO()}${upiLine}`,
    "Please ignore if already paid. Thank you.",
  ].join("\n");
}

export function emiReceiptMessage(invoice, payment, businessSettings = {}) {
  const businessName = businessSettings?.business_name || "AquaBiz";
  const amount = Number(payment?.cash_amount || 0) + Number(payment?.upi_amount || 0);
  return [
    `Namaste ${invoice?.customer_name || ""},`,
    `${businessName} EMI payment receipt.`,
    `Received: ${formatINR(amount)}`,
    `Date: ${payment?.payment_date || String(payment?.created_at || "").slice(0, 10) || todayISO()}`,
    `Remaining Balance: ${formatINR(getDueAmount(invoice))}`,
    "Thank you.",
  ].join("\n");
}

export function invoiceShareMessage(invoice, items = [], businessSettings = {}, invoiceNumber = "") {
  const businessName = businessSettings?.business_name || "AquaBiz";
  const lines = [
    `${businessName} Invoice`,
    invoiceNumber ? `Invoice No: ${invoiceNumber}` : "",
    `Customer: ${invoice?.customer_name || ""}`,
    `Mobile: ${invoice?.mobile || ""}`,
    `Type: ${invoice?.invoice_type || "service"}`,
    `Total: ${formatINR(invoice?.total_amount)}`,
    `Paid: ${formatINR(getPaidAmount(invoice))}`,
    `Pending: ${formatINR(getDueAmount(invoice))}`,
    `Status: ${invoice?.payment_status || ""}`,
  ].filter(Boolean);

  if (items.length > 0) {
    lines.push("", "Items:");
    items.forEach((item) => lines.push(`${item.item_name} x ${item.quantity || 1} - ${formatINR(item.billing_price)}`));
  }

  if (businessSettings?.upi_id && getDueAmount(invoice) > 0) lines.push("", `UPI ID: ${businessSettings.upi_id}`);
  if (businessSettings?.phone || businessSettings?.business_phone) lines.push(`Phone: ${businessSettings.phone || businessSettings.business_phone}`);
  lines.push("Thank you.");
  return lines.join("\n");
}

export function reminderMessage(reminder, businessSettings = {}) {
  const businessName = businessSettings?.business_name || "AquaBiz";
  const amountText = reminder?.amount ? `\nAmount: ${formatINR(reminder.amount)}` : "";
  return [
    `Namaste ${reminder?.customer_name || ""},`,
    `${businessName} reminder: ${reminder?.label || "Follow-up"}`,
    `Due Date: ${reminder?.due_date || todayISO()}${amountText}`,
    "Please ignore if already completed. Thank you.",
  ].join("\n");
}

export function closeOtpMessage(booking, businessSettings = {}) {
  const businessName = businessSettings?.business_name || "AquaBiz";
  return `${businessName} job closing OTP: ${booking?.close_otp || ""}. Share this OTP after work is completed.`;
}
