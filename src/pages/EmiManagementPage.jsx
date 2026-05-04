import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { InvoicePaymentForm } from "./CollectionsPage";
import { supabase } from "../supabaseClient";
import { formatINR, getDueAmount, getLocalMonthKey, nextMonthlyDate, todayISO } from "../utils/appUtils";
import { buildWhatsAppUrl, emiReceiptMessage, emiReminderMessage } from "../utils/whatsappUtils";
import { useAutoHideMessage } from "../utils/toastUtils";

function dateKey(value) {
  return String(value || "").slice(0, 10);
}

function addMonths(dateString, months) {
  let next = dateString || todayISO();
  for (let index = 0; index < months; index += 1) {
    next = nextMonthlyDate(next);
  }
  return next;
}

function isEmiInvoice(invoice) {
  return invoice?.is_emi === true || invoice?.payment_method === "emi" || Number(invoice?.emi_monthly_amount || invoice?.emi_amount || 0) > 0;
}

function getEmiAmount(invoice) {
  return Number(invoice.emi_amount || invoice.emi_monthly_amount || invoice.invoice_print_qr_amount || 0);
}

function getEmiPayments(invoice, invoicePayments) {
  return invoicePayments
    .filter((payment) => String(payment.invoice_id) === String(invoice.id))
    .map((payment) => ({
      ...payment,
      amount: Number(payment.cash_amount || 0) + Number(payment.upi_amount || 0),
    }))
    .filter((payment) => payment.amount > 0)
    .sort((a, b) => String(a.payment_date || a.created_at || "").localeCompare(String(b.payment_date || b.created_at || "")));
}

function buildSchedule(invoice, invoicePayments) {
  const months = Math.max(Number(invoice.emi_months || 0), 0);
  const monthlyAmount = getEmiAmount(invoice);
  const startDate = dateKey(invoice.emi_start_date || invoice.emi_next_due_date || invoice.invoice_date || invoice.created_at || todayISO());
  const payments = getEmiPayments(invoice, invoicePayments);
  let paidPool = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return Array.from({ length: months }).map((_, index) => {
    const dueDate = addMonths(startDate, index);
    const paidAmount = Math.min(paidPool, monthlyAmount);
    paidPool = Math.max(paidPool - monthlyAmount, 0);
    const dueAmount = Math.max(monthlyAmount - paidAmount, 0);
    const status = dueAmount <= 0
      ? "Paid"
      : paidAmount > 0
        ? "Partial"
        : dueDate < todayISO()
          ? "Overdue"
          : dueDate === todayISO()
            ? "Due Today"
            : "Pending";
    return {
      number: index + 1,
      dueDate,
      amount: monthlyAmount,
      paidAmount,
      dueAmount,
      status,
    };
  });
}

function whatsappLink(invoice, businessSettings) {
  return buildWhatsAppUrl(invoice.mobile, emiReminderMessage(invoice, businessSettings));
}

function buildEmiUpiUri(invoice, businessSettings) {
  const upiId = invoice.upi_id || businessSettings?.upi_id || "";
  const upiName = businessSettings?.upi_name || businessSettings?.business_name || "AquaBiz";
  const amount = getEmiAmount(invoice);
  if (!upiId || amount <= 0) return "";
  const params = new URLSearchParams({
    pa: upiId,
    pn: upiName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: "AquaBiz EMI Payment",
  });
  return `upi://pay?${params.toString()}`;
}

function receiptWhatsappLink(invoice, payment, businessSettings) {
  return buildWhatsAppUrl(invoice.mobile, emiReceiptMessage(invoice, payment, businessSettings));
}

function printEmiReceipt(invoice, payment, businessSettings) {
  const business = businessSettings || {};
  const amount = Number(payment.cash_amount || 0) + Number(payment.upi_amount || 0);
  const html = `
    <html>
      <head>
        <title>EMI Receipt - ${invoice.customer_name || ""}</title>
        <style>
          body { font-family: Arial, sans-serif; margin:0; padding:28px; background:#f8fafc; color:#111827; }
          .sheet { max-width:720px; margin:auto; background:#fff; border:1px solid #e5e7eb; padding:28px; }
          .head { display:flex; justify-content:space-between; gap:16px; border-bottom:2px solid #0f766e; padding-bottom:14px; }
          h1 { margin:0; color:#000666; }
          p { margin:5px 0; color:#475569; }
          .box { border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-top:16px; }
          .total { color:#0f766e; font-size:24px; font-weight:800; }
          table { width:100%; border-collapse:collapse; margin-top:12px; }
          td { border:1px solid #e5e7eb; padding:10px; }
          @media print { body { background:#fff; padding:0; } .sheet { border:0; } }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="head">
            <div>
              <h1>${business.business_name || "AquaBiz"}</h1>
              <p>${business.phone || business.business_phone || ""}</p>
              <p>${business.address || business.business_address || ""}</p>
            </div>
            <div>
              <strong>EMI Payment Receipt</strong>
              <p>Date: ${payment.payment_date || dateKey(payment.created_at) || todayISO()}</p>
            </div>
          </div>
          <div class="box">
            <p><strong>Customer:</strong> ${invoice.customer_name || ""}</p>
            <p><strong>Mobile:</strong> ${invoice.mobile || ""}</p>
            <p><strong>Invoice:</strong> ${invoice.invoice_number || invoice.id || ""}</p>
          </div>
          <table>
            <tr><td>Cash Received</td><td>Rs ${Number(payment.cash_amount || 0).toLocaleString("en-IN")}</td></tr>
            <tr><td>UPI Received</td><td>Rs ${Number(payment.upi_amount || 0).toLocaleString("en-IN")}</td></tr>
            <tr><td>Total EMI Paid</td><td class="total">Rs ${amount.toLocaleString("en-IN")}</td></tr>
            <tr><td>Note</td><td>${payment.note || ""}</td></tr>
          </table>
          <div class="box">
            <p><strong>Remaining Balance:</strong> Rs ${Number(getDueAmount(invoice) || 0).toLocaleString("en-IN")}</p>
            <p>Thank you for your payment.</p>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `;
  const printWindow = window.open("", "_blank");
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function EmiManagementPage({ invoices = [], invoicePayments = [], businessSettings, onUpdated }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [message, setMessage] = useState("");

  useAutoHideMessage(message, setMessage);

  const emiInvoices = useMemo(() => invoices.filter(isEmiInvoice), [invoices]);
  const enrichedInvoices = emiInvoices.map((invoice) => {
    const schedule = buildSchedule(invoice, invoicePayments);
    const nextUnpaid = schedule.find((row) => row.dueAmount > 0);
    const payments = getEmiPayments(invoice, invoicePayments);
    const paidEmi = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const dueAmount = getDueAmount(invoice);
    const status = dueAmount <= 0
      ? "Closed"
      : nextUnpaid?.status === "Overdue"
        ? "Overdue"
        : nextUnpaid?.status === "Due Today"
          ? "Due Today"
          : "Active";
    return { invoice, schedule, nextUnpaid, payments, paidEmi, dueAmount, status };
  });

  const filtered = enrichedInvoices.filter((row) => {
    const text = `${row.invoice.customer_name || ""} ${row.invoice.mobile || ""} ${row.invoice.invoice_number || ""}`.toLowerCase();
    if (search.trim() && !text.includes(search.trim().toLowerCase())) return false;
    if (statusFilter && row.status !== statusFilter) return false;
    return true;
  });

  const selected = enrichedInvoices.find((row) => String(row.invoice.id) === String(selectedInvoiceId)) || filtered[0];
  const selectedUpiUri = selected ? buildEmiUpiUri(selected.invoice, businessSettings) : "";
  const currentMonth = getLocalMonthKey();
  const receivedThisMonth = enrichedInvoices.reduce((sum, row) => sum + row.payments
    .filter((payment) => String(payment.payment_date || payment.created_at || "").slice(0, 7) === currentMonth)
    .reduce((inner, payment) => inner + payment.amount, 0), 0);
  const overdueCount = enrichedInvoices.filter((row) => row.status === "Overdue").length;
  const activeCount = enrichedInvoices.filter((row) => row.status !== "Closed").length;
  const pendingBalance = enrichedInvoices.reduce((sum, row) => sum + row.dueAmount, 0);

  async function closeEmi(invoice) {
    const confirmClose = window.confirm(`Close EMI for ${invoice.customer_name}?`);
    if (!confirmClose) return;
    const { error } = await supabase.from("invoices").update({
      due_amount: 0,
      paid_amount: Number(invoice.total_amount || 0),
      payment_status: "Paid",
      emi_next_due_date: null,
      emi_closed_at: new Date().toISOString(),
    }).eq("id", invoice.id);
    if (error) return setMessage(error.message);
    setMessage("EMI closed.");
    await onUpdated?.();
  }

  const success = ["closed"].some((word) => message.toLowerCase().includes(word));

  return (
    <>
      <section className="page-head emi-page-head">
        <h2>EMI Management</h2>
        <p>Track EMI customers, monthly dues, overdue payments, receipts and reminders.</p>
      </section>

      {message && <div className={success ? "settings-toast success" : "settings-toast error"}>{message}</div>}

      <section className="cards-grid payroll-summary-grid emi-summary-grid">
        <div className="amount-box total"><strong>Pending EMI Balance</strong><strong>{formatINR(pendingBalance)}</strong></div>
        <div className="amount-box"><strong>Active EMI Customers</strong><strong>{activeCount}</strong></div>
        <div className="amount-box"><strong>Overdue EMI</strong><strong>{overdueCount}</strong></div>
        <div className="amount-box"><strong>This Month Received</strong><strong>{formatINR(receivedThisMonth)}</strong></div>
      </section>

      <section className="panel emi-filter-panel">
        <div className="two-col">
          <input placeholder="Search customer, mobile, invoice" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All EMI status</option>
            <option>Active</option>
            <option>Due Today</option>
            <option>Overdue</option>
            <option>Closed</option>
          </select>
        </div>
      </section>

      <section className="panel emi-customers-panel">
        <div className="section-heading-row">
          <div>
            <h3>EMI Customers</h3>
            <p className="muted">Click View Schedule to see month-wise EMI status.</p>
          </div>
        </div>
        <div className="responsive-table">
          <table className="parts-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Monthly EMI</th>
                <th>Next Due</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.invoice.id}>
                  <td>
                    <strong>{row.invoice.customer_name}</strong>
                    <p className="muted">{row.invoice.mobile}</p>
                  </td>
                  <td>{formatINR(getEmiAmount(row.invoice))}</td>
                  <td>{row.nextUnpaid?.dueDate || "Closed"}</td>
                  <td><strong>{formatINR(row.dueAmount)}</strong></td>
                  <td><span className={row.status === "Overdue" ? "stock-badge out" : row.status === "Closed" ? "stock-badge in" : "stock-badge low"}>{row.status}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="link-btn" onClick={() => setSelectedInvoiceId(row.invoice.id)}>View Schedule</button>
                      {row.dueAmount > 0 && <button className="primary-btn small" onClick={() => setPaymentInvoiceId(paymentInvoiceId === row.invoice.id ? "" : row.invoice.id)}>Add EMI</button>}
                      {row.dueAmount > 0 && <a className="ghost-btn small" href={whatsappLink(row.invoice, businessSettings)} target="_blank" rel="noreferrer">WhatsApp</a>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6">No EMI customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {paymentInvoiceId && (
        <section className="panel emi-payment-panel">
          <InvoicePaymentForm
            invoice={emiInvoices.find((invoice) => String(invoice.id) === String(paymentInvoiceId))}
            onClose={() => setPaymentInvoiceId("")}
            onDone={async () => {
              setPaymentInvoiceId("");
              await onUpdated?.();
            }}
          />
        </section>
      )}

      {selected && (
        <section className="panel emi-schedule-panel">
          <div className="section-heading-row">
            <div>
              <h3>{selected.invoice.customer_name} EMI Schedule</h3>
              <p className="muted">
                Product Price: {formatINR(selected.invoice.product_price || selected.invoice.total_amount)} |
                Down Payment: {formatINR(selected.invoice.down_payment_total || selected.invoice.emi_advance_amount)} |
                Tenure: {Number(selected.invoice.emi_months || 0)} months
              </p>
            </div>
            {selected.dueAmount > 0 && <button className="danger-btn" onClick={() => closeEmi(selected.invoice)}>Close EMI</button>}
          </div>

          <section className="emi-detail-grid">
            <div className="emi-qr-card">
              <div>
                <span>Monthly EMI QR</span>
                <strong>{formatINR(getEmiAmount(selected.invoice))}</strong>
                <p>Scan to collect current monthly EMI. QR uses Business Settings UPI ID.</p>
              </div>
              {selected.dueAmount <= 0 ? (
                <div className="success-box">EMI is fully closed.</div>
              ) : selectedUpiUri ? (
                <div className="emi-qr-box">
                  <QRCodeCanvas value={selectedUpiUri} size={132} includeMargin />
                  <small>UPI ID: {selected.invoice.upi_id || businessSettings?.upi_id}</small>
                </div>
              ) : (
                <div className="error-box">Please add UPI ID in Business Settings before printing EMI QR.</div>
              )}
              {selected.dueAmount > 0 && (
                <div className="row-actions">
                  <button className="primary-btn small" onClick={() => setPaymentInvoiceId(selected.invoice.id)}>Record EMI Payment</button>
                  <a className="ghost-btn small" href={whatsappLink(selected.invoice, businessSettings)} target="_blank" rel="noreferrer">Send Reminder</a>
                </div>
              )}
            </div>
            <div className="emi-balance-card">
              <div><span>Total Balance</span><strong>{formatINR(selected.dueAmount)}</strong></div>
              <div><span>Paid EMI</span><strong>{formatINR(selected.paidEmi)}</strong></div>
              <div><span>Next EMI Due</span><strong>{selected.nextUnpaid?.dueDate || "Closed"}</strong></div>
              <div><span>Status</span><strong>{selected.status}</strong></div>
            </div>
          </section>

          <div className="responsive-table">
            <table className="parts-table">
              <thead>
                <tr>
                  <th>EMI No.</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selected.schedule.map((row) => (
                  <tr key={row.number}>
                    <td>{row.number}</td>
                    <td>{row.dueDate}</td>
                    <td>{formatINR(row.amount)}</td>
                    <td>{formatINR(row.paidAmount)}</td>
                    <td>{formatINR(row.dueAmount)}</td>
                    <td><span className={row.status === "Overdue" ? "stock-badge out" : row.status === "Paid" ? "stock-badge in" : "stock-badge low"}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="sub-panel">
            <h3>EMI Payment History</h3>
            {selected.payments.length === 0 ? <p className="muted">No EMI payments yet.</p> : selected.payments.map((payment) => (
              <div className="booking-row" key={payment.id}>
                <div>
                  <strong>{payment.payment_date || dateKey(payment.created_at)}</strong>
                  <p>Cash {formatINR(payment.cash_amount)} | UPI {formatINR(payment.upi_amount)} {payment.note ? `| ${payment.note}` : ""}</p>
                </div>
                <button className="primary-btn small" onClick={() => printEmiReceipt(selected.invoice, payment, businessSettings)}>Print Receipt</button>
                <a className="ghost-btn small" href={receiptWhatsappLink(selected.invoice, payment, businessSettings)} target="_blank" rel="noreferrer">WhatsApp Receipt</a>
              </div>
            ))}
          </section>
        </section>
      )}
    </>
  );
}
