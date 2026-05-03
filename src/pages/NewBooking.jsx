import { useEffect, useState } from "react";
import { emptyBooking } from "../constants/defaults";
import { FormCard } from "../components/shared";
import { supabase } from "../supabaseClient";
import { formatINR, generateOtp, uniqueServices } from "../utils/appUtils";
import { saveJobAssignment } from "../services/jobAssignments";
export function NewBooking({ services, technicians, customers = [], initialLead = null, telecaller = null, onDone }) {
  const [form, setForm] = useState(emptyBooking);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState(null);
  const cleanServices = uniqueServices(services);
  const selectedService = cleanServices.find((s) => s.id === form.serviceId) || cleanServices[0];
  const serviceAmount = Number(selectedService?.price || 0);

  useEffect(() => {
    if (!form.serviceId && cleanServices[0]?.id) setForm((prev) => ({ ...prev, serviceId: cleanServices[0].id }));
  }, [cleanServices, form.serviceId]);

  useEffect(() => {
    if (initialLead?.mobile) {
      setForm((prev) => ({
        ...prev,
        name: initialLead.customer_name || prev.name,
        mobile: initialLead.mobile || prev.mobile,
        address: initialLead.address || prev.address,
        priority: initialLead.priority || prev.priority,
        complaintNotes: initialLead.notes || prev.complaintNotes,
      }));
    }
  }, [initialLead]);

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
      name: customer.name || prev.name,
      address: customer.address || prev.address,
    }));
  }, [form.mobile, customers]);

  async function saveBooking() {
    setMessage("");
    if (!form.name.trim() || !form.mobile.trim() || !form.address.trim()) {
      setMessage("Name, mobile, and address are required.");
      return;
    }
    if (!selectedService?.id) {
      setMessage("Please add/select a service price first from More > Admin Settings.");
      return;
    }
    setSaving(true);
    const cleanMobile = form.mobile.trim();
    const telecallerId = telecaller?.id || initialLead?.telecaller_id || initialLead?.assigned_telecaller_id || null;

    const { data: existingCustomer, error: customerFindError } = await supabase.from("customers").select("*").eq("mobile", cleanMobile).limit(1).maybeSingle();
    if (customerFindError) { setMessage("Customer check error: " + customerFindError.message); setSaving(false); return; }

    if (!existingCustomer) {
      const { error } = await supabase.from("customers").insert([{ name: form.name.trim(), mobile: cleanMobile, address: form.address.trim() }]);
      if (error) { setMessage("Customer save error: " + error.message); setSaving(false); return; }
    }

    const { data: booking, error: bookingError } = await supabase.from("bookings").insert([{
      customer_name: form.name.trim(),
      mobile: cleanMobile,
      service_type: selectedService?.name || "Service",
      payment_option: "pending",
      booking_amount: serviceAmount,
      address: form.address.trim(),
      complaint_notes: form.complaintNotes.trim(),
      priority: form.priority || "Normal",
      close_otp: generateOtp(),
      close_otp_verified: false,
      lead_id: initialLead?.id || null,
      telecaller_id: telecallerId,
      created_by_telecaller_id: telecallerId,
    }]).select().single();

    if (bookingError) { setMessage("Booking save error: " + bookingError.message); setSaving(false); return; }

    if (form.technicianId) {
      const { error: jobError } = await saveJobAssignment(booking.id, form.technicianId);
      if (jobError) { setMessage("Booking saved, but technician assign error: " + jobError.message); setSaving(false); return; }
    }

    if (initialLead?.id) {
      await supabase.from("leads").update({ status: "Converted" }).eq("id", initialLead.id);
    }

    setMessage("Booking saved successfully.");
    setSaving(false);
    await onDone();
  }

  return (
    <>
      <section className="page-head"><h2>New Booking</h2><p>Technician assignment is optional. You can assign later from the Jobs page.</p></section>
      <section className="form-stack">
        <FormCard label="Mobile Number">
          <input name="ro_customer_mobile_new" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="Enter customer mobile number" inputMode="numeric" autoComplete="new-password" />
          {matchedCustomer && <div className="success-box mt-sm">Existing customer found. Name and address auto-filled.</div>}
        </FormCard>
        <FormCard label="Customer Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" autoComplete="off" /></FormCard>
        <FormCard label="Service Type">{cleanServices.length === 0 ? <div className="error-box">No services found. Open More → Admin Settings and add service prices.</div> : <div className="chip-grid">{cleanServices.map((s) => <button key={s.id} className={form.serviceId === s.id ? "chip active" : "chip"} onClick={() => setForm({ ...form, serviceId: s.id })} type="button"><span>{s.name}</span><strong>{formatINR(s.price)}</strong></button>)}</div>}</FormCard>
        <FormCard label="Priority">
          <div className="chip-grid">
            {["Normal", "Medium", "High", "Critical"].map((priority) => (
              <button key={priority} className={form.priority === priority ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, priority })}>{priority}</button>
            ))}
          </div>
          <p className="helper">Normal priority auto-upgrades with each passing day until Critical.</p>
        </FormCard>
        <FormCard label="Service Address"><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House no, street, area, city" rows={3} autoComplete="off" /></FormCard>
        <FormCard label="Final Service Amount"><div className="amount-box"><strong>{selectedService?.name || "Service"}</strong><strong>{formatINR(serviceAmount)}</strong></div></FormCard>
        <FormCard label="Technician Assignment Optional"><select value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}><option value="">Skip now — assign later from Jobs page</option>{technicians.filter((t) => t.is_active !== false).map((t) => <option value={t.id} key={t.id}>{t.name} ({t.mobile})</option>)}</select></FormCard>
        <FormCard label="Complaint Notes"><input value={form.complaintNotes} onChange={(e) => setForm({ ...form, complaintNotes: e.target.value })} placeholder="Leakage, low flow, filter change etc." autoComplete="off" /></FormCard>
        {message && <div className={message.includes("error") ? "error-box" : "success-box"}>{message}</div>}
        <button className="primary-btn big" onClick={saveBooking} disabled={saving}>{saving ? "Saving..." : "Confirm Booking"}</button>
      </section>
    </>
  );
}
