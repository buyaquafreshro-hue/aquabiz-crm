import { useEffect, useState } from "react";
import { emptyBooking } from "../constants/defaults";
import { supabase } from "../supabaseClient";
import { formatINR, generateOtp, uniqueServices } from "../utils/appUtils";
import { isSuccessToast, useAutoHideMessage } from "../utils/toastUtils";

export function NewBooking({ services, technicians, customers = [], initialLead = null, telecaller = null, onDone }) {
  const [form, setForm] = useState(emptyBooking);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState(null);
  useAutoHideMessage(message, setMessage);
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
    if (saving) return;
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

    if (initialLead?.id) {
      await supabase.from("leads").update({ status: "Converted" }).eq("id", initialLead.id);
    }

    setForm({ ...emptyBooking, serviceId: cleanServices[0]?.id || "" });
    setMatchedCustomer(null);
    setMessage("Booking created successfully");
    setSaving(false);
    await onDone?.();
  }

  return (
    <>
      <section className="page-head booking-page-head">
        <h2>New Booking</h2>
        <p>Schedule a water purifier service for your customer.</p>
      </section>

      <section className="booking-form-shell">
        <div className="booking-form-grid">
          <div className="booking-field-card">
            <label>Customer Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Search or type name..." autoComplete="off" />
          </div>

          <div className="booking-field-card">
            <label>Mobile Number</label>
            <div className="mobile-input-line">
              <span>+91</span>
              <input name="ro_customer_mobile_new" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="98765 43210" inputMode="numeric" autoComplete="new-password" />
            </div>
            {matchedCustomer && <p className="success-line mt-sm">Existing customer found. Name and address auto-filled.</p>}
          </div>
        </div>

        <div className="booking-field-card">
          <label>Service Type</label>
          {cleanServices.length === 0 ? (
            <div className="error-box">No services found. Open More &gt; Admin Settings and add service prices.</div>
          ) : (
            <div className="booking-chip-row">
              {cleanServices.map((s) => (
                <button key={s.id} className={form.serviceId === s.id ? "booking-chip active" : "booking-chip"} onClick={() => setForm({ ...form, serviceId: s.id })} type="button">
                  <span>{s.name}</span>
                  <strong>{formatINR(s.price)}</strong>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="booking-field-card">
          <label>Service Address</label>
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Apartment, Street, Locality, City..." rows={3} autoComplete="off" />
          <button className="location-link" type="button">Use Current Location</button>
        </div>

        <div className="booking-field-card">
          <label>Priority</label>
          <div className="booking-chip-row compact">
            {["Normal", "Medium", "High", "Critical"].map((priority) => (
              <button key={priority} className={form.priority === priority ? "booking-chip active" : "booking-chip"} type="button" onClick={() => setForm({ ...form, priority })}>{priority}</button>
            ))}
          </div>
        </div>

        <div className="booking-payment-card">
          <label>Service Amount</label>
          <div className="payment-choice selected">
            <div>
              <strong>{selectedService?.name || "Service"}</strong>
              <p>Final amount can be adjusted while generating invoice.</p>
            </div>
            <span>{formatINR(serviceAmount)}</span>
          </div>
        </div>

        <div className="booking-field-card">
          <label>Complaint Notes Optional</label>
          <input value={form.complaintNotes} onChange={(e) => setForm({ ...form, complaintNotes: e.target.value })} placeholder="Leaking tap, filter change, low flow etc." autoComplete="off" />
        </div>

        {message && <div className={isSuccessToast(message) ? "success-box" : "error-box"}>{message}</div>}

        <button className="primary-btn big booking-confirm-btn" onClick={saveBooking} disabled={saving} type="button">
          {saving ? "Saving..." : "Confirm Booking"}
        </button>
      </section>
    </>
  );
}
