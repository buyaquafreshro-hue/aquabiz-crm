import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { formatINR, todayISO } from "../utils/appUtils";
import { clearRoleSession, getRoleSession, saveRoleSession } from "../utils/roleSession";
import { calculateSalesStats } from "../utils/salesUtils";
import { useAutoHideMessage } from "../utils/toastUtils";
import { buildWhatsAppUrl, customerGreetingMessage } from "../utils/whatsappUtils";

const SALES_SESSION_KEY = "aquabiz_sales_person";

export function SalesLogin({ salesPersons = [], leads = [], invoices = [], onUpdated, onLogout }) {
  const [login, setLogin] = useState({ mobile: "", pin: "" });
  const [salesPerson, setSalesPerson] = useState(null);
  const [followupDraft, setFollowupDraft] = useState({});
  const [message, setMessage] = useState("");
  useAutoHideMessage(message, setMessage);

  useEffect(() => {
    const roleSession = getRoleSession();
    if (roleSession?.role === "sales") {
      const active = salesPersons.find((person) => String(person.id) === String(roleSession.userId) && person.is_active !== false);
      if (active) {
        const timer = window.setTimeout(() => setSalesPerson(active), 0);
        return () => window.clearTimeout(timer);
      }
    }

    const stored = localStorage.getItem(SALES_SESSION_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const active = salesPersons.find((person) => String(person.id) === String(parsed.id) && person.is_active !== false);
      if (!active) return;
      const timer = window.setTimeout(() => setSalesPerson(active), 0);
      return () => window.clearTimeout(timer);
    } catch {
      localStorage.removeItem(SALES_SESSION_KEY);
    }
  }, [salesPersons]);

  function handleLogin() {
    setMessage("");
    const mobile = login.mobile.trim();
    const pin = login.pin.trim();
    if (!mobile || pin.length !== 6) return setMessage("Mobile number and 6-digit PIN are required.");
    const person = salesPersons.find((item) => String(item.mobile || "").trim() === mobile && String(item.pin || "").trim() === pin && item.is_active !== false);
    if (!person) return setMessage("Invalid mobile number or PIN.");
    setSalesPerson(person);
    saveRoleSession("sales", person);
    localStorage.setItem(SALES_SESSION_KEY, JSON.stringify({ id: person.id }));
    setLogin({ mobile: "", pin: "" });
  }

  function logout() {
    clearRoleSession();
    localStorage.removeItem(SALES_SESSION_KEY);
    setSalesPerson(null);
    onLogout?.();
  }

  if (!salesPerson) {
    return (
      <>
        <section className="page-head sales-page-head">
          <h2>Sales Login</h2>
          <p>Sales person logs in using mobile number and 6-digit PIN.</p>
        </section>
        <section className="panel sales-login-panel">
          <div className="form-stack">
            <input placeholder="Sales mobile number" inputMode="numeric" value={login.mobile} onChange={(e) => setLogin({ ...login, mobile: e.target.value })} />
            <input placeholder="6 digit PIN" inputMode="numeric" maxLength="6" type="password" value={login.pin} onChange={(e) => setLogin({ ...login, pin: e.target.value })} />
            {message && <div className="error-box">{message}</div>}
            <button className="primary-btn big" onClick={handleLogin}>Login</button>
          </div>
        </section>
      </>
    );
  }

  const stats = calculateSalesStats({ salesPerson, invoices });
  const myFollowups = leads.filter((lead) => {
    const ownerType = String(lead.follow_up_owner_type || "");
    if (ownerType) return ownerType === "sales" && String(lead.follow_up_owner_id || "") === String(salesPerson.id);
    return String(lead.assigned_sales_person_id || "") === String(salesPerson.id);
  });

  async function saveLeadFollowup(lead) {
    const draft = followupDraft[lead.id] || {};
    const nextDate = draft.date || lead.follow_up_date || todayISO();
    const summary = String(draft.summary || "").trim();
    if (!summary) return setMessage("Follow-up summary is required.");

    const oldNotes = String(lead.notes || "").trim();
    const newEntry = `[${todayISO()}] Sales follow-up: ${nextDate} | ${summary}`;
    const notes = oldNotes ? `${oldNotes}\n${newEntry}` : newEntry;

    const { error } = await supabase
      .from("leads")
      .update({ follow_up_date: nextDate, notes, status: "Follow Up" })
      .eq("id", lead.id);

    if (error) return setMessage(error.message);
    setFollowupDraft({ ...followupDraft, [lead.id]: { date: nextDate, summary: "" } });
    setMessage("Follow-up saved.");
    await onUpdated?.();
  }

  return (
    <>
      <section className="page-head sales-page-head">
        <h2>Sales Dashboard</h2>
        <p>Logged in: {salesPerson.name} ({salesPerson.mobile})</p>
      </section>

      <section className="cards-grid sales-stats-grid">
        <div className="stat-card premium-stat"><strong>{formatINR(stats.todaySales)}</strong><small>Today Sales Amount</small></div>
        <div className="stat-card premium-stat"><strong>{formatINR(stats.monthSales)}</strong><small>This Month Sales</small></div>
        <div className="stat-card premium-stat"><strong>{formatINR(stats.monthIncentive)}</strong><small>This Month Incentive</small></div>
        <div className="stat-card premium-stat"><strong>{stats.salesCount}</strong><small>Number of Sales</small></div>
      </section>

      <section className="panel sales-list-panel">
        <div className="panel-head">
          <h3>My Sales</h3>
          <button className="ghost-btn small" onClick={logout}>Logout</button>
        </div>
        {stats.ownInvoices.length === 0 ? <p className="muted">No sales invoices linked yet.</p> : stats.ownInvoices.map((invoice) => (
          <div className="job-card sales-invoice-card" key={invoice.id}>
            <strong>{invoice.customer_name}</strong>
            <p>{invoice.mobile} - {invoice.invoice_type}</p>
            <p>Amount: {formatINR(invoice.total_amount)} | Paid: {formatINR(invoice.paid_amount)}</p>
            <p>Incentive: {formatINR(invoice.sales_incentive_amount)}</p>
          </div>
        ))}
      </section>

      <section className="panel sales-list-panel">
        <div className="panel-head">
          <div>
            <h3>Assigned Follow-ups</h3>
            <p className="muted">{myFollowups.length} lead follow-up{myFollowups.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        {myFollowups.length === 0 ? <p className="muted">No lead follow-ups assigned.</p> : myFollowups.map((lead) => (
          <div className="job-card sales-invoice-card" key={lead.id}>
            <strong>{lead.customer_name}</strong>
            <p>{lead.mobile} - {lead.interest || lead.service_need || "Lead"} - Follow-up: {lead.follow_up_date || "Not set"}</p>
            {lead.area && <p className="success-line">Area: {lead.area}</p>}
            <p className="muted">{lead.notes || "No notes yet."}</p>
            <div className="two-col mt-sm">
              <input
                type="date"
                value={followupDraft[lead.id]?.date || lead.follow_up_date || todayISO()}
                onChange={(e) => setFollowupDraft({
                  ...followupDraft,
                  [lead.id]: { ...(followupDraft[lead.id] || {}), date: e.target.value },
                })}
              />
              <input
                placeholder="Conversation summary"
                value={followupDraft[lead.id]?.summary || ""}
                onChange={(e) => setFollowupDraft({
                  ...followupDraft,
                  [lead.id]: { ...(followupDraft[lead.id] || {}), summary: e.target.value },
                })}
              />
            </div>
            <div className="row-actions mt-sm">
              <button className="primary-btn small" onClick={() => saveLeadFollowup(lead)}>Save Follow-up</button>
              <a className="ghost-btn small" href={`tel:${lead.mobile}`}>Call</a>
              <a className="ghost-btn small" href={buildWhatsAppUrl(lead.mobile, customerGreetingMessage(lead.customer_name))} target="_blank" rel="noreferrer">WA</a>
            </div>
          </div>
        ))}
        {message && <div className={message.includes("saved") ? "success-box" : "error-box"}>{message}</div>}
      </section>
    </>
  );
}
