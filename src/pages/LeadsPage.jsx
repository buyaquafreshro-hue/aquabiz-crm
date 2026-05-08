import { useEffect, useState } from "react";
import { emptyLead } from "../constants/defaults";
import { FormCard } from "../components/shared";
import { supabase } from "../supabaseClient";
import { todayISO } from "../utils/appUtils";
import { buildWhatsAppUrl, customerGreetingMessage } from "../utils/whatsappUtils";
import { useAutoHideMessage } from "../utils/toastUtils";
export function LeadsPage({ leads, customers = [], telecallers = [], loggedInTelecaller = null, onUpdated, setPage, onCreateBooking }) {
  const [form, setForm] = useState({ ...emptyLead, address: "", area: "", service_need: "" });
  const [showLeadForm, setShowLeadForm] = useState(!loggedInTelecaller);
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [leadAssign, setLeadAssign] = useState({});
  const [followupDraft, setFollowupDraft] = useState({});
  const [openLeadId, setOpenLeadId] = useState(null);
  const [matchedCustomer, setMatchedCustomer] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useAutoHideMessage(message, setMessage);

  useEffect(() => {
    const cleanMobile = String(form.mobile || "").replace(/\D/g, "");

    if (cleanMobile.length < 10) {
      setMatchedCustomer(null);
      return;
    }

    const customer = customers.find((c) => String(c.mobile || "").replace(/\D/g, "") === cleanMobile);

    if (!customer) {
      setMatchedCustomer(null);
      return;
    }

    setMatchedCustomer(customer);
    setForm((prev) => ({
      ...prev,
      customer_name: customer.name || prev.customer_name,
    }));
  }, [form.mobile, customers]);

  async function saveLead() {
    if (saving) return;
    setMessage("");
    const cleanMobile = String(form.mobile || "").replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      setMessage("Phone should be a 10 digit Indian mobile number.");
      return;
    }
    if (!form.customer_name.trim() || !cleanMobile) {
      setMessage("Customer name and mobile are required.");
      return;
    }

    const assignedTelecallerId = loggedInTelecaller?.id || form.assigned_telecaller_id || null;
    const selectedTelecaller = loggedInTelecaller || telecallers.find((t) => String(t.id) === String(assignedTelecallerId));

    setSaving(true);
    const { error } = await supabase.from("leads").insert([{
      customer_name: form.customer_name.trim(),
      mobile: cleanMobile,
      phone: cleanMobile,
      address: form.address?.trim?.() || "",
      area: form.area?.trim?.() || "",
      service_need: form.service_need || form.interest,
      source: form.source,
      interest: form.interest,
      status: form.status,
      telecaller_id: assignedTelecallerId,
      assigned_telecaller_id: assignedTelecallerId,
      assigned_telecaller_name: selectedTelecaller?.name || "",
      follow_up_date: form.follow_up_date || todayISO(),
      notes: form.notes.trim(),
    }]);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setForm({ ...emptyLead, address: "", area: "", service_need: "" });
    setPhoneChecked(false);
    setMatchedCustomer(null);
    setShowLeadForm(!loggedInTelecaller);
    setMessage("Lead created successfully");
    setSaving(false);
    await onUpdated();
  }

  function checkPhone() {
    setMessage("");
    const cleanMobile = String(form.mobile || "").replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      setMessage("Phone should be a 10 digit Indian mobile number.");
      return;
    }

    const customer = customers.find((c) => String(c.mobile || c.phone || "").replace(/\D/g, "").slice(-10) === cleanMobile);
    const existingLead = leads.find((lead) => String(lead.mobile || lead.phone || "").replace(/\D/g, "").slice(-10) === cleanMobile);
    setMatchedCustomer(customer || null);
    setForm((prev) => ({
      ...prev,
      mobile: cleanMobile,
      customer_name: customer?.name || existingLead?.customer_name || prev.customer_name,
      address: customer?.address || existingLead?.address || prev.address || "",
      area: customer?.area || existingLead?.area || prev.area || "",
      notes: existingLead?.notes || prev.notes || "",
    }));
    setPhoneChecked(true);
    setShowLeadForm(!customer);
  }

  async function updateLeadStatus(lead, status) {
    const { error } = await supabase.from("leads").update({ status }).eq("id", lead.id);
    if (error) return setMessage(error.message);
    setMessage(`Lead marked ${status}.`);
    await onUpdated();
  }

  async function assignTelecaller(lead, telecallerId) {
    const telecaller = telecallers.find((t) => String(t.id) === String(telecallerId));
    const { error } = await supabase
      .from("leads")
      .update({
        assigned_telecaller_id: telecallerId || null,
        assigned_telecaller_name: telecaller?.name || "",
      })
      .eq("id", lead.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setLeadAssign({ ...leadAssign, [lead.id]: telecallerId || "" });
    setMessage(telecallerId ? `Lead assigned to ${telecaller?.name}.` : "Lead assignment removed.");
    await onUpdated();
  }

  async function saveLeadFollowup(lead) {
    setMessage("");

    const draft = followupDraft[lead.id] || {};
    const nextDate = draft.date || lead.follow_up_date || todayISO();
    const summary = String(draft.summary || "").trim();

    if (!summary) {
      setMessage("Follow-up summary is required.");
      return;
    }

    const oldNotes = String(lead.notes || "").trim();
    const newEntry = `[${todayISO()}] Next follow-up: ${nextDate} | ${summary}`;
    const notes = oldNotes ? `${oldNotes}\n${newEntry}` : newEntry;

    const { error } = await supabase
      .from("leads")
      .update({
        follow_up_date: nextDate,
        notes,
        status: "Follow Up",
      })
      .eq("id", lead.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setFollowupDraft({ ...followupDraft, [lead.id]: { date: nextDate, summary: "" } });
    setMessage("Follow-up saved.");
    await onUpdated();
  }

  return (
    <>
      <section className="page-head leads-page-head">
        <h2>Leads</h2>
        <p>Manual leads now. Later this can connect with Meta Ads, WhatsApp, and Google Ads.</p>
      </section>

      <section className="panel leads-form-panel">
        <div className="panel-head">
          <h3>Add Lead</h3>
          {loggedInTelecaller && !showLeadForm && !phoneChecked && <button className="primary-btn small" onClick={() => setShowLeadForm(false)}>Add Lead</button>}
        </div>
        <div className="form-stack">
          {loggedInTelecaller && !phoneChecked && (
            <>
              <input placeholder="Phone Number" inputMode="numeric" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              <button className="primary-btn" onClick={checkPhone}>Check Phone</button>
            </>
          )}
          {matchedCustomer && (
            <div className="success-box">
              Existing customer found: {matchedCustomer.name} {matchedCustomer.address ? `- ${matchedCustomer.address}` : ""}
              <div className="row-actions">
                <button className="ghost-btn small" onClick={() => setShowLeadForm(true)}>Create Follow-up</button>
                <button className="primary-btn small" onClick={() => onCreateBooking?.({ customer_name: matchedCustomer.name, mobile: matchedCustomer.mobile, address: matchedCustomer.address || "" })}>Create Booking</button>
                <button className="ghost-btn small" onClick={() => setShowLeadForm(true)}>Add Note</button>
              </div>
            </div>
          )}
          {(!loggedInTelecaller || showLeadForm) && (
            <>
          <div className="two-col">
            <input placeholder="Mobile number" inputMode="numeric" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <input placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          </div>
          <div className="two-col">
            <input placeholder="Address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input placeholder="Area" value={form.area || ""} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          </div>
          <div className="two-col">
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option>Manual</option>
              <option>WhatsApp</option>
              <option>Meta Ads</option>
              <option>Google Ads</option>
              <option>Referral</option>
              <option>Walk-in</option>
            </select>
            <select value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}>
              <option>Service</option>
              <option>Repair</option>
              <option>Installation</option>
              <option>AMC</option>
              <option>New RO Sale</option>
            </select>
          </div>
          <input placeholder="Service need" value={form.service_need || ""} onChange={(e) => setForm({ ...form, service_need: e.target.value })} />
          <div className="two-col">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>New</option>
              <option>Contacted</option>
              <option>Follow Up</option>
              <option>Converted</option>
              <option>Lost</option>
            </select>
            <input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
          </div>
          {!loggedInTelecaller && <select value={form.assigned_telecaller_id} onChange={(e) => setForm({ ...form, assigned_telecaller_id: e.target.value })}>
            <option value="">Assign telecaller later</option>
            {telecallers.filter((t) => t.is_active !== false).map((t) => <option value={t.id} key={t.id}>{t.name} ({t.mobile})</option>)}
          </select>}
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {message && (
            <div className={message.includes("saved") || message.includes("created") || message.includes("assigned") || message.includes("removed") ? "success-box" : "error-box"}>
              {message}
            </div>
          )}
          <button className="primary-btn big" onClick={saveLead} disabled={saving}>
            {saving ? "Saving..." : "Save Lead"}
          </button>
            </>
          )}
        </div>
      </section>

      <section className="panel leads-list-panel">
        <div className="section-head">
          <div>
            <h3>Lead List</h3>
            <p>{leads.length} total leads</p>
          </div>
          <button className="link-btn" onClick={() => setPage("booking")}>New Booking</button>
        </div>
        {leads.length === 0 ? <p className="muted">No leads added yet.</p> : leads.map((lead) => {
          const isOpen = String(openLeadId) === String(lead.id);
          const existingCustomer = customers.find((c) => String(c.mobile || "").replace(/\D/g, "") === String(lead.mobile || "").replace(/\D/g, ""));
          return (
          <div className="job-card lead-card" key={lead.id}>
            <button
              className="booking-card-head compact-click"
              type="button"
              onClick={() => setOpenLeadId(isOpen ? null : lead.id)}
            >
              <div>
                <strong>{lead.customer_name}</strong>
                <p>{isOpen ? "Hide details" : "Click to view details"}</p>
              </div>
              <div className="row-actions no-margin">
                {existingCustomer && <span className="status assigned">Existing Customer</span>}
                <span className="status assigned">{lead.status}</span>
              </div>
            </button>
            {isOpen && (
              <>
            <p>{lead.mobile} - {lead.source} - {lead.interest}</p>
            {existingCustomer && <p className="success-line">Existing customer: {existingCustomer.name} {existingCustomer.address ? `- ${existingCustomer.address}` : ""}</p>}
            <p>Follow up: {lead.follow_up_date || "Not set"}</p>
            <p className="muted">Assigned: {lead.assigned_telecaller_name || "Not assigned"}</p>
            {lead.notes && (
              <div className="muted-box">
                {String(lead.notes).split("\n").map((line, index) => <p key={index}>{line}</p>)}
              </div>
            )}
            <FormCard label="Add Follow-up">
              <div className="two-col">
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
              <button className="primary-btn mt-sm" onClick={() => saveLeadFollowup(lead)}>
                Save Follow-up
              </button>
            </FormCard>
            <div className="two-col mt-sm">
              <select value={leadAssign[lead.id] ?? lead.assigned_telecaller_id ?? ""} onChange={(e) => setLeadAssign({ ...leadAssign, [lead.id]: e.target.value })}>
                <option value="">Select telecaller</option>
                {telecallers.filter((t) => t.is_active !== false).map((t) => <option value={t.id} key={t.id}>{t.name} ({t.mobile})</option>)}
              </select>
              <button className="primary-btn" onClick={() => assignTelecaller(lead, leadAssign[lead.id] ?? lead.assigned_telecaller_id ?? "")}>
                Assign Telecaller
              </button>
            </div>
            <div className="row-actions">
              {["Contacted", "Follow Up", "Converted", "Lost"].map((status) => (
                <button className="ghost-btn small" key={status} onClick={() => updateLeadStatus(lead, status)}>{status}</button>
              ))}
              <button className="primary-btn small" onClick={() => onCreateBooking?.(lead)}>Create Booking</button>
              <a className="ghost-btn small" href={`tel:${lead.mobile}`}>Call</a>
              <a className="ghost-btn small" href={buildWhatsAppUrl(lead.mobile, customerGreetingMessage(lead.customer_name))} target="_blank" rel="noreferrer">WA</a>
            </div>
              </>
            )}
          </div>
        );
        })}
      </section>
    </>
  );
}
