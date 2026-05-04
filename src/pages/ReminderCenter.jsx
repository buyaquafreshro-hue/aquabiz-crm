import { useState } from "react";
import { StatCard } from "../components/shared";
import { supabase } from "../supabaseClient";
import { addDays, formatINR, getDueAmount, isActive, nextMonthlyDate, todayISO } from "../utils/appUtils";
import { buildWhatsAppUrl, reminderMessage } from "../utils/whatsappUtils";
import { useAutoHideMessage } from "../utils/toastUtils";
export function ReminderCenter({ coverages, invoices, leads, businessSettings = {}, onUpdated }) {
  const [reschedule, setReschedule] = useState(null);
  const [message, setMessage] = useState("");
  useAutoHideMessage(message, setMessage);

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

  const rentReminders = invoices
    .filter((invoice) => invoice.invoice_type === "rental" && invoice.rental_next_due_date && String(invoice.rental_next_due_date) <= todayISO())
    .map((invoice) => ({
      id: `rent-${invoice.id}`,
      source_id: invoice.id,
      type: "rent",
      label: "RO Rent Due",
      customer_name: invoice.customer_name,
      mobile: invoice.mobile,
      due_date: invoice.rental_next_due_date,
      amount: Number(invoice.rental_monthly_rent || 0),
      note: "Monthly rental collection",
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

  const reminders = [...serviceReminders, ...emiReminders, ...rentReminders, ...paymentFollowUps, ...leadReminders]
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
    } else if (reminder.type === "rent") {
      response = await supabase
        .from("invoices")
        .update({ rental_next_due_date: nextMonthlyDate(reminder.due_date || todayISO()) })
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
    } else if (reschedule.type === "rent") {
      response = await supabase.from("invoices").update({ rental_next_due_date: reschedule.date }).eq("id", reschedule.source_id);
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
    return buildWhatsAppUrl(reminder.mobile, reminderMessage(reminder, businessSettings));
  }

  return (
    <>
      <section className="page-head reminders-page-head">
        <h2>Reminder Center</h2>
        <p>AMC, warranty, EMI, payment, and lead follow-ups.</p>
      </section>

      <section className="cards-grid reminders-stats-grid">
        <StatCard icon="S" label="Service Due" value={serviceReminders.length} />
        <StatCard icon="E" label="EMI Due" value={emiReminders.length} />
        <StatCard icon="R" label="Rent Due" value={rentReminders.length} />
        <StatCard icon="P" label="Payment Follow-up" value={paymentFollowUps.length} />
        <StatCard icon="L" label="Lead Follow-up" value={leadReminders.length} />
      </section>

      {message && <section className={message.includes("updated") || message.includes("rescheduled") ? "success-box" : "error-box"}>{message}</section>}

      <section className="panel reminders-list-panel">
        <h3>Due Reminders</h3>
        {reminders.length === 0 ? <p className="muted">No reminders due.</p> : reminders.map((reminder) => (
          <div className="job-card reminder-card" key={reminder.id}>
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
