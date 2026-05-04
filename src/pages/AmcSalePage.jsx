import { useState } from "react";
import { emptyActivation } from "../constants/defaults";
import { FormCard } from "../components/shared";
import { supabase } from "../supabaseClient";
import { addDays, coverageLabel, formatINR, todayISO } from "../utils/appUtils";
import { calculateSalesIncentive } from "../utils/salesUtils";
import { useAutoHideMessage } from "../utils/toastUtils";
export function AmcSalePage({ amcPlans, products, coverages, invoices, salesPersons = [], onUpdated }) {
  const [form, setForm] = useState(emptyActivation);
  const [salesPersonId, setSalesPersonId] = useState("");
  const [message, setMessage] = useState("");
  useAutoHideMessage(message, setMessage);
  const selectedPlan = amcPlans.find((p) => String(p.id) === String(form.amc_plan_id));
  const selectedProduct = products.find((p) => String(p.id) === String(form.product_id));
  const source = form.type === "amc" ? selectedPlan : selectedProduct;
  const selectedSalesPerson = salesPersons.find((person) => String(person.id) === String(salesPersonId));
  const basePrice = Number(source?.price || 0);
  const discount = Number(form.discount || 0);
  const finalAmount = Math.max(basePrice - discount, 0);
  const paidAmount = Number(form.cash_amount || 0) + Number(form.upi_amount || 0);
  const dueAmount = Math.max(finalAmount - paidAmount, 0);
  const paymentStatus = paidAmount <= 0 ? "Pending" : paidAmount >= finalAmount ? "Paid" : "Partial";
  const paymentMethod = Number(form.cash_amount || 0) > 0 && Number(form.upi_amount || 0) > 0
    ? "cash_upi"
    : Number(form.cash_amount || 0) > 0
      ? "cash"
      : Number(form.upi_amount || 0) > 0
        ? "upi"
        : "pending";
  const salesIncentiveAmount = calculateSalesIncentive(finalAmount, selectedSalesPerson);

  async function createActivation() {
    setMessage("");
    if (!form.customer_name.trim() || !form.mobile.trim()) return setMessage("Customer name and mobile are required.");
    if (form.type === "amc" && !selectedPlan) return setMessage("Select AMC plan.");
    if (form.type === "new_sale" && !selectedProduct) return setMessage("Select RO product.");

    const invoiceDate = todayISO();
    const validityDays = form.type === "amc" ? Number(selectedPlan.validity_days || 365) : Number(selectedProduct.warranty_validity_days || 365);
    const expiryDate = addDays(invoiceDate, validityDays - 1); // inclusive validity: 365 days => +364
    const reminderDays = Number(source.service_reminder_days || 90);
    const nextServiceDue = addDays(invoiceDate, reminderDays);

    const coveragePayload = {
      customer_name: form.customer_name.trim(),
      mobile: form.mobile.trim(),
      source_type: form.type,
      source_id: source.id,
      source_name: source.name,
      coverage_type: source.coverage_type,
      covered_category_ids: source.covered_category_ids || [],
      covered_part_ids: source.covered_part_ids || [],
      free_visits: source.free_visits_enabled ? Number(source.free_visits || 0) : 0,
      used_visits: 0,
      activation_date: invoiceDate,
      validity_days: validityDays,
      expiry_date: expiryDate,
      service_reminder_days: reminderDays,
      next_service_due_date: nextServiceDue,
      notes: source.notes || "",
    };

    const { data: coverage, error: coverageError } = await supabase.from("customer_coverages").insert([coveragePayload]).select().single();
    if (coverageError) return setMessage(coverageError.message);

    const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert([{
      invoice_type: form.type,
      booking_id: null,
      customer_name: form.customer_name.trim(),
      mobile: form.mobile.trim(),
      service_charge: 0,
      parts_charge: 0,
      discount,
      total_amount: finalAmount,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      sales_person_id: selectedSalesPerson?.id || null,
      sales_incentive_amount: salesIncentiveAmount,
      cash_amount: Number(form.cash_amount || 0),
      upi_amount: Number(form.upi_amount || 0),
      paid_amount: paidAmount,
      due_amount: dueAmount,
      coverage_id: coverage.id,
    }]).select().single();

    if (invoiceError) return setMessage(invoiceError.message);

    await supabase.from("invoice_items").insert([{
      invoice_id: invoice.id,
      item_type: form.type,
      item_name: source.name,
      quantity: 1,
      actual_price: basePrice,
      billing_price: finalAmount,
      is_covered: false,
      covered_reason: "",
    }]);

    setForm(emptyActivation);
    setSalesPersonId("");
    setMessage("AMC/New Sale invoice and coverage activated.");
    await onUpdated();
  }

  return (
    <>
      <section className="page-head amc-sale-page-head"><h2>AMC / New Sale</h2><p>Select a plan/product, auto-pick price, apply discount, and activate coverage automatically.</p></section>
      <section className="panel amc-sale-form-panel">
        <FormCard label="Invoice Type">
          <div className="chip-grid">
            <button className={form.type === "amc" ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, type: "amc" })}>AMC</button>
            <button className={form.type === "new_sale" ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, type: "new_sale" })}>New RO Sale</button>
          </div>
        </FormCard>
        <div className="form-stack">
          <input placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input placeholder="Mobile number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} inputMode="numeric" />
          {form.type === "amc" ? (
            <select value={form.amc_plan_id} onChange={(e) => setForm({ ...form, amc_plan_id: e.target.value })}><option value="">Select AMC Plan ({amcPlans.length} found)</option>{amcPlans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatINR(p.price)}</option>)}</select>
          ) : (
            <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}><option value="">Select RO Product ({products.length} found)</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatINR(p.price)}</option>)}</select>
          )}
          {source && (
            <div className="success-box">
              Price: {formatINR(basePrice)} | Coverage: {coverageLabel(source.coverage_type)} | Free Visits: {source.free_visits_enabled ? source.free_visits : 0} | Validity: {form.type === "amc" ? source.validity_days : source.warranty_validity_days} days
            </div>
          )}
          <input placeholder="Discount" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          <FormCard label="Sales Person">
            <select value={salesPersonId} onChange={(e) => setSalesPersonId(e.target.value)}>
              <option value="">No sales person</option>
              {salesPersons.filter((person) => person.is_active !== false).map((person) => (
                <option key={person.id} value={person.id}>{person.name} ({person.mobile})</option>
              ))}
            </select>
            {selectedSalesPerson && <div className="success-box mt-sm">Incentive: {formatINR(salesIncentiveAmount)}</div>}
          </FormCard>
          <div className="amount-box total"><strong>Final Amount</strong><strong>{formatINR(finalAmount)}</strong></div>
          <FormCard label="Payment Collection">
            <div className="two-col">
              <div>
                <label className="field-label">Cash Received</label>
                <input
                  placeholder="Enter cash amount"
                  type="number"
                  value={form.cash_amount}
                  onChange={(e) => setForm({ ...form, cash_amount: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">UPI Received</label>
                <input
                  placeholder="Enter UPI amount"
                  type="number"
                  value={form.upi_amount}
                  onChange={(e) => setForm({ ...form, upi_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="payment-summary">
              <div>
                <span>Paid Amount</span>
                <strong>{formatINR(paidAmount)}</strong>
              </div>
              <div>
                <span>Pending Amount</span>
                <strong className={dueAmount > 0 ? "danger-line" : "success-line"}>
                  {formatINR(dueAmount)}
                </strong>
              </div>
              <div>
                <span>Payment Status</span>
                <strong className={paymentStatus === "Paid" ? "success-line" : dueAmount > 0 ? "danger-line" : ""}>
                  {paymentStatus}
                </strong>
              </div>
            </div>
          </FormCard>
          {message && <div className={message.includes("activated") ? "success-box" : "error-box"}>{message}</div>}
          <button className="primary-btn big" onClick={createActivation}>Generate Invoice + Activate</button>
        </div>
      </section>
      <section className="panel amc-coverages-panel"><h3>Active Coverages</h3>{coverages.length === 0 ? <p className="muted">No active records.</p> : coverages.slice(0, 8).map((c) => <div className="job-card coverage-card" key={c.id}><strong>{c.customer_name}</strong><p>{c.mobile} • {c.source_name}</p><p>Activation: {c.activation_date} | Expiry: {c.expiry_date}</p><p>Reminder: {c.next_service_due_date}</p><p>Visits: {c.used_visits}/{c.free_visits}</p></div>)}</section>
    </>
  );
}
