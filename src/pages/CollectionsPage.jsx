import { useState } from "react";
import { emptyPayment } from "../constants/defaults";
import { StatCard } from "../components/shared";
import { supabase } from "../supabaseClient";
import { formatINR, getDueAmount, getPaidAmount, nextMonthlyDate, todayISO } from "../utils/appUtils";
import { buildWhatsAppUrl, paymentReminderMessage } from "../utils/whatsappUtils";
import { useAutoHideMessage } from "../utils/toastUtils";
export function InvoicePaymentForm({ invoice, onClose, onDone }) {
  const [form, setForm] = useState(emptyPayment);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useAutoHideMessage(message, setMessage);
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


export function CollectionsPage({ invoices, invoicePayments = [], businessSettings = {}, onUpdated }) {
  const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);
  const [followUpInvoiceId, setFollowUpInvoiceId] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({ date: todayISO(), note: "" });
  const [message, setMessage] = useState("");
  useAutoHideMessage(message, setMessage);

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
    return buildWhatsAppUrl(invoice.mobile, paymentReminderMessage(invoice, businessSettings));
  }

  return (
    <>
      <section className="page-head collections-page-head">
        <h2>Collections</h2>
        <p>Pending payments, EMI reminders, and follow-ups.</p>
      </section>

      <section className="cards-grid collections-stats-grid">
        <StatCard icon="₹" label="Total Pending" value={formatINR(totalPending)} />
        <StatCard icon="E" label="EMI Due" value={emiDue.length} />
        <StatCard icon="!" label="Overdue" value={overdue.length} />
        <StatCard icon="F" label="Follow-ups Due" value={followUpsDue.length} />
      </section>

      {message && <section className={message.includes("saved") ? "success-box" : "error-box"}>{message}</section>}

      <section className="panel collections-list-panel">
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
