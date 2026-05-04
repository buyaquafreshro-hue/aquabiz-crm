import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { FormCard } from "./shared";
import { PartsTable, StockBadge } from "./PartsTable";
import { supabase } from "../supabaseClient";
import { addDays, coverageLabel, formatINR, isActive, itemCoveredByRecord, nextMonthlyDate, todayISO } from "../utils/appUtils";
import { calculateSalesIncentive } from "../utils/salesUtils";
import { isSuccessToast, useAutoHideMessage } from "../utils/toastUtils";
export function InvoiceBuilder({ job, booking, inventory, technicianParts = [], coverages, invoices, amcPlans = [], products = [], salesPersons = [], businessSettings = {}, onClose, onDone }) {
  const [invoiceType, setInvoiceType] = useState("service");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [selectedPart, setSelectedPart] = useState("");
  const [qty, setQty] = useState("1");
  const [partQtyById, setPartQtyById] = useState({});
  const [parts, setParts] = useState([]);
  const [paymentMode, setPaymentMode] = useState("split");
  const [cashAmount, setCashAmount] = useState("0");
  const [upiAmount, setUpiAmount] = useState("0");
  const [emiMonths, setEmiMonths] = useState("6");
  const [emiStartDate, setEmiStartDate] = useState(todayISO());
  const [emiNotes, setEmiNotes] = useState("");
  const [rentalDeposit, setRentalDeposit] = useState("0");
  const [rentalMonthly, setRentalMonthly] = useState("0");
  const [rentalStartDate, setRentalStartDate] = useState(todayISO());
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [salesPersonId, setSalesPersonId] = useState("");
  const [message, setMessage] = useState("");
  useAutoHideMessage(message, setMessage);

  const selectedPlan = amcPlans.find((p) => String(p.id) === String(selectedPlanId));
  const selectedProduct = products.find((p) => String(p.id) === String(selectedProductId));
  const selectedSalesPerson = salesPersons.find((person) => String(person.id) === String(salesPersonId));
  const selectedPartItem = inventory.find((p) => String(p.id) === String(selectedPart));
  const selectedTechnicianPartQty = selectedPartItem
    ? technicianParts
        .filter((row) => String(row.technician_id) === String(job?.technician_id) && String(row.inventory_item_id) === String(selectedPartItem.id))
        .reduce((sum, row) => sum + Number(row.quantity || 0), 0)
    : 0;

  const activeCoverage = coverages?.find((a) => String(a.mobile) === String(booking?.mobile) && isActive(a));
  const serviceCovered = invoiceType === "service" && activeCoverage && Number(activeCoverage.used_visits || 0) < Number(activeCoverage.free_visits || 0);

  const baseServiceCharge = Number(booking?.booking_amount || 0);
  const serviceCharge = invoiceType === "service" ? (serviceCovered ? 0 : baseServiceCharge) : 0;

  const planAmount = invoiceType === "amc" ? Number(selectedPlan?.price || 0) : 0;
  const productAmount = invoiceType === "new_sale" ? Number(selectedProduct?.price || 0) : 0;
  const rentalAmount = invoiceType === "rental" ? Number(rentalDeposit || 0) + Number(rentalMonthly || 0) : 0;
  const partsTotal = parts.reduce((sum, p) => sum + Number(p.billing_price || 0) * Number(p.quantity || 0), 0);
  const discountAmount = Number(discount || 0);
  const subtotal = serviceCharge + planAmount + productAmount + rentalAmount + partsTotal;
  const total = Math.max(subtotal - discountAmount, 0);

  const paidAmount = Number(cashAmount || 0) + Number(upiAmount || 0);
  const dueAmount = Math.max(total - paidAmount, 0);
  const paymentStatus = paidAmount <= 0 ? "Pending" : paidAmount >= total ? "Paid" : "Partial";
  const safeEmiMonths = Math.max(Number(emiMonths || 1), 1);
  const monthlyEmi = Math.ceil(dueAmount / safeEmiMonths);
  const paymentMethod =
    paymentMode === "emi"
      ? "emi"
      : paymentMode === "pending"
        ? "pending"
        :
    Number(cashAmount || 0) > 0 && Number(upiAmount || 0) > 0
      ? "cash_upi"
      : Number(cashAmount || 0) > 0
        ? "cash"
        : Number(upiAmount || 0) > 0
          ? "upi"
          : "pending";
  const upiAmountNumber = Number(upiAmount || 0);
  const upiId = businessSettings?.upi_id || "";
  const upiName = businessSettings?.upi_name || businessSettings?.business_name || "AquaBiz";
  const isEmiInvoice = paymentMode === "emi";
  const productPrice = invoiceType === "new_sale" ? productAmount : total;
  const downPaymentCash = isEmiInvoice ? Number(cashAmount || 0) : 0;
  const downPaymentUpi = isEmiInvoice ? Number(upiAmount || 0) : 0;
  const downPaymentTotal = isEmiInvoice ? downPaymentCash + downPaymentUpi : 0;
  const upfrontUpiQrAmount = isEmiInvoice ? downPaymentUpi : upiAmountNumber;
  const invoicePrintQrAmount = isEmiInvoice ? monthlyEmi : upiAmountNumber;
  const salesIncentiveAmount = invoiceType === "amc" || invoiceType === "new_sale" ? calculateSalesIncentive(total, selectedSalesPerson) : 0;
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${encodeURIComponent(upfrontUpiQrAmount.toFixed(2))}&cu=INR&tn=${encodeURIComponent("AquaBiz Invoice Payment")}`;

  function getTechnicianQty(itemId) {
    return technicianParts
      .filter((row) => String(row.technician_id) === String(job?.technician_id) && String(row.inventory_item_id) === String(itemId))
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  }

  function addPartItem(item, requestedQty) {
    if (!item) return;

    const safeQty = Number(requestedQty || 1);
    const technicianQty = getTechnicianQty(item.id);

    if (safeQty <= 0) {
      setMessage("Part quantity must be greater than 0.");
      return;
    }

    if (job?.technician_id && technicianQty < safeQty) {
      setMessage(`${item.name} is not enough with this technician. Available with technician: ${technicianQty}.`);
      return;
    }

    const covered = invoiceType === "service" && activeCoverage && itemCoveredByRecord(item, activeCoverage);
    const selling = Number(item.selling_price || 0);

    setParts([
      ...parts,
      {
        inventory_item_id: item.id,
        part_name: item.name,
        category: item.category_name,
        quantity: safeQty,
        actual_selling_price: selling,
        billing_price: covered ? 0 : selling,
        is_covered: !!covered,
        covered_reason: covered ? "Covered under AMC/Warranty" : "",
      },
    ]);

    setSelectedPart("");
    setQty("1");
    setPartQtyById({ ...partQtyById, [item.id]: "1" });
  }

  function addPart() {
    const item = inventory.find((p) => String(p.id) === String(selectedPart));
    addPartItem(item, qty);
  }

  async function createCoverageFromInvoice(invoiceId) {
    const invoiceDate = todayISO();

    const source = invoiceType === "amc" ? selectedPlan : selectedProduct;
    if (!source) return null;

    const validityDays =
      invoiceType === "amc"
        ? Number(source.validity_days || 365)
        : Number(source.warranty_validity_days || 365);

    const expiryDate = addDays(invoiceDate, validityDays - 1);
    const reminderDays = Number(source.service_reminder_days || 90);
    const nextServiceDue = addDays(invoiceDate, reminderDays);

    const payload = {
      customer_name: booking.customer_name,
      mobile: booking.mobile,
      source_type: invoiceType,
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

    const { data, error } = await supabase.from("customer_coverages").insert([payload]).select().single();
    if (error) throw error;
    return data;
  }

  async function generateInvoice(forceConfirmed = false) {
    setMessage("");

    if (!booking) return setMessage("Booking missing.");

    const already = invoices.find((i) => String(i.booking_id) === String(booking.id));
    if (already) return setMessage("Invoice already generated for this booking.");

    if (invoiceType === "amc" && !selectedPlan) return setMessage("Please select an AMC plan.");
    if (invoiceType === "new_sale" && !selectedProduct) return setMessage("Please select an RO product.");
    if (invoiceType === "new_sale" && paymentMode === "emi" && selectedProduct && paidAmount < Number(selectedProduct.min_down_payment || 0)) {
      return setMessage("Down payment cannot be less than minimum down payment for this product.");
    }
    if (isEmiInvoice && productPrice <= 0) return setMessage("Product price is required for EMI invoice.");
    if (isEmiInvoice && downPaymentTotal <= 0) return setMessage("Down payment total is required for EMI invoice.");
    if (isEmiInvoice && Math.abs(downPaymentTotal - (downPaymentCash + downPaymentUpi)) > 0.01) return setMessage("Down payment total must equal cash plus UPI.");
    if (isEmiInvoice && monthlyEmi <= 0) return setMessage("EMI amount is required for EMI invoice.");
    if (isEmiInvoice && safeEmiMonths <= 0) return setMessage("EMI tenure is required for EMI invoice.");
    if (upfrontUpiQrAmount > 0 && !upiId) return setMessage("Please add UPI ID in Business Settings before accepting UPI payment.");
    if (isEmiInvoice && invoicePrintQrAmount > 0 && !upiId) return setMessage("Please add UPI ID in Business Settings before printing EMI QR.");
    if (upfrontUpiQrAmount > 0 && !paymentConfirmed && !forceConfirmed) {
      setShowPaymentConfirm(true);
      return;
    }

    for (const part of parts) {
      const inv = inventory.find((p) => String(p.id) === String(part.inventory_item_id));
      if (inv && Number(inv.stock_qty || 0) < Number(part.quantity || 0)) {
        return setMessage(`${part.part_name} stock not enough.`);
      }

      if (job?.technician_id) {
        const technicianQty = technicianParts
          .filter((row) => String(row.technician_id) === String(job.technician_id) && String(row.inventory_item_id) === String(part.inventory_item_id))
          .reduce((sum, row) => sum + Number(row.quantity || 0), 0);

        if (technicianQty < Number(part.quantity || 0)) {
          return setMessage(`${part.part_name} is not enough with this technician. Available with technician: ${technicianQty}.`);
        }
      }
    }

    let createdCoverage = null;

    if (invoiceType === "amc" || invoiceType === "new_sale") {
      // Create invoice first with no coverage_id, then activate coverage and update invoice.
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert([
        {
          invoice_type: invoiceType,
          booking_id: booking.id,
          customer_name: booking.customer_name,
          mobile: booking.mobile,
          service_charge: serviceCharge,
          parts_charge: partsTotal,
          discount: discountAmount,
          total_amount: total,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          telecaller_id: booking.telecaller_id || booking.created_by_telecaller_id || null,
          technician_id: job?.technician_id || booking.assigned_technician_id || booking.technician_id || null,
          sales_person_id: selectedSalesPerson?.id || null,
          sales_incentive_amount: salesIncentiveAmount,
          cash_amount: Number(cashAmount || 0),
          upi_amount: Number(upiAmount || 0),
          paid_amount: paidAmount,
          due_amount: dueAmount,
          payment_confirmed: upfrontUpiQrAmount > 0 ? true : false,
          payment_confirmed_at: upfrontUpiQrAmount > 0 ? new Date().toISOString() : null,
          payment_confirmed_by: upfrontUpiQrAmount > 0 ? "AquaBiz user" : "",
          upi_qr_amount: upfrontUpiQrAmount,
          is_emi: isEmiInvoice,
          product_price: isEmiInvoice ? productPrice : 0,
          down_payment_total: downPaymentTotal,
          down_payment_cash: downPaymentCash,
          down_payment_upi: downPaymentUpi,
          emi_amount: isEmiInvoice ? monthlyEmi : 0,
          upfront_upi_qr_amount: upfrontUpiQrAmount,
          invoice_print_qr_amount: invoicePrintQrAmount,
          upi_id: upiId,
          emi_total_amount: paymentMode === "emi" ? total : 0,
          emi_advance_amount: paymentMode === "emi" ? paidAmount : 0,
          emi_monthly_amount: paymentMode === "emi" ? monthlyEmi : 0,
          emi_months: paymentMode === "emi" ? safeEmiMonths : 0,
          emi_start_date: paymentMode === "emi" ? emiStartDate : null,
          emi_next_due_date: paymentMode === "emi" ? emiStartDate : null,
          emi_notes: paymentMode === "emi" ? emiNotes.trim() : "",
          rental_security_deposit: invoiceType === "rental" ? Number(rentalDeposit || 0) : 0,
          rental_monthly_rent: invoiceType === "rental" ? Number(rentalMonthly || 0) : 0,
          rental_start_date: invoiceType === "rental" ? rentalStartDate : null,
          rental_next_due_date: invoiceType === "rental" ? nextMonthlyDate(rentalStartDate) : null,
          coverage_id: activeCoverage?.id || null,
        },
      ])
      .select()
      .single();

    if (invoiceError) return setMessage(invoiceError.message);

    if (invoiceType === "amc" || invoiceType === "new_sale") {
      try {
        createdCoverage = await createCoverageFromInvoice(invoice.id);
        if (createdCoverage?.id) {
          await supabase.from("invoices").update({ coverage_id: createdCoverage.id }).eq("id", invoice.id);
        }
      } catch (err) {
        return setMessage("Invoice saved, but coverage activation error: " + err.message);
      }
    }

    const items = [];

    if (invoiceType === "service") {
      items.push({
        invoice_id: invoice.id,
        item_type: "service",
        item_name: booking.service_type,
        quantity: 1,
        actual_price: baseServiceCharge,
        billing_price: serviceCharge,
        is_covered: !!serviceCovered,
        covered_reason: serviceCovered ? "Free service visit used" : "",
      });
    }

    if (invoiceType === "amc" && selectedPlan) {
      items.push({
        invoice_id: invoice.id,
        item_type: "amc",
        item_name: selectedPlan.name,
        quantity: 1,
        actual_price: planAmount,
        billing_price: Math.max(planAmount - discountAmount, 0),
        is_covered: false,
        covered_reason: "",
      });
    }

    if (invoiceType === "new_sale" && selectedProduct) {
      items.push({
        invoice_id: invoice.id,
        item_type: "new_sale",
        item_name: selectedProduct.name,
        quantity: 1,
        actual_price: productAmount,
        billing_price: Math.max(productAmount - discountAmount, 0),
        is_covered: false,
        covered_reason: "",
      });
    }

    if (invoiceType === "rental") {
      items.push({
        invoice_id: invoice.id,
        item_type: "rental",
        item_name: "RO Rental",
        quantity: 1,
        actual_price: rentalAmount,
        billing_price: rentalAmount,
        is_covered: false,
        covered_reason: "",
      });
    }

    const partItems = parts.map((p) => ({
      invoice_id: invoice.id,
      item_type: "part",
      inventory_item_id: p.inventory_item_id,
      item_name: p.part_name,
      quantity: p.quantity,
      actual_price: p.actual_selling_price,
      billing_price: p.billing_price,
      is_covered: p.is_covered,
      covered_reason: p.covered_reason,
    }));

    const { error: itemsError } = await supabase.from("invoice_items").insert([...items, ...partItems]);
    if (itemsError) return setMessage(itemsError.message);

    for (const part of parts) {
      const inv = inventory.find((p) => String(p.id) === String(part.inventory_item_id));
      if (inv) {
        const newStock = Number(inv.stock_qty || 0) - Number(part.quantity || 0);
        await supabase.from("inventory_items").update({ stock_qty: newStock }).eq("id", inv.id);
        await supabase.from("inventory_usage").insert([
          {
            booking_id: booking.id,
            invoice_id: invoice.id,
            inventory_item_id: part.inventory_item_id,
            part_name: part.part_name,
            quantity: part.quantity,
            actual_selling_price: part.actual_selling_price,
            billing_price: part.billing_price,
            is_covered: part.is_covered,
            covered_reason: part.covered_reason,
            technician_id: job.technician_id,
          },
        ]);

        if (job?.technician_id) {
          let remainingQty = Number(part.quantity || 0);
          const technicianRows = technicianParts
            .filter((row) => String(row.technician_id) === String(job.technician_id) && String(row.inventory_item_id) === String(part.inventory_item_id))
            .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));

          for (const row of technicianRows) {
            if (remainingQty <= 0) break;

            const rowQty = Number(row.quantity || 0);
            const deductQty = Math.min(rowQty, remainingQty);
            const updatedQty = rowQty - deductQty;

            await supabase.from("technician_parts").update({ quantity: updatedQty }).eq("id", row.id);
            remainingQty -= deductQty;
          }
        }
      }
    }

    if (serviceCovered && activeCoverage) {
      const nextServiceDate = addDays(todayISO(), Number(activeCoverage.service_reminder_days || 90));
      await supabase
        .from("customer_coverages")
        .update({
          used_visits: Number(activeCoverage.used_visits || 0) + 1,
          last_service_date: todayISO(),
          next_service_due_date: nextServiceDate,
        })
        .eq("id", activeCoverage.id);
    }

    if (paymentMode === "emi") {
      await supabase
        .from("bookings")
        .update({
          payment_option: "emi",
          emi_total_amount: total,
          emi_advance_amount: paidAmount,
          emi_monthly_amount: monthlyEmi,
          emi_months: safeEmiMonths,
          emi_start_date: emiStartDate,
          emi_next_due_date: emiStartDate,
          emi_notes: emiNotes.trim(),
        })
        .eq("id", booking.id);
    }

    await supabase.from("job_assignments").update({ status: "Completed" }).eq("id", job.id);

    setMessage("Invoice generated successfully.");
    await onDone();
  }

  return (
    <section className="modal-card inline-invoice">
      <div className="panel-head">
        <h3>Generate Invoice</h3>
        <button className="ghost-btn small" onClick={onClose}>Close</button>
      </div>

      <FormCard label="Invoice Type">
        <div className="chip-grid">
          <button className={invoiceType === "service" ? "chip active" : "chip"} type="button" onClick={() => setInvoiceType("service")}>Service Invoice</button>
          <button className={invoiceType === "amc" ? "chip active" : "chip"} type="button" onClick={() => setInvoiceType("amc")}>AMC Sale</button>
          <button className={invoiceType === "new_sale" ? "chip active" : "chip"} type="button" onClick={() => setInvoiceType("new_sale")}>New RO Sale</button>
          <button className={invoiceType === "rental" ? "chip active" : "chip"} type="button" onClick={() => setInvoiceType("rental")}>RO Rental</button>
        </div>
      </FormCard>

      {invoiceType === "service" && (
        <>
          {activeCoverage ? (
            <div className="success-box">
              Coverage Active: {coverageLabel(activeCoverage.coverage_type)} | Visits Remaining: {Number(activeCoverage.free_visits || 0) - Number(activeCoverage.used_visits || 0)}
            </div>
          ) : (
            <div className="muted-box">No active AMC/Warranty found.</div>
          )}
          <div className="amount-box">
            <strong>Service Charge</strong>
            <strong>{formatINR(serviceCharge)}</strong>
          </div>
        </>
      )}

      {invoiceType === "amc" && (
        <FormCard label="Select AMC Plan">
          <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
            <option value="">Select AMC Plan ({amcPlans.length} found)</option>
            {amcPlans.map((p) => (
              <option value={p.id} key={p.id}>{p.name} — {formatINR(p.price)}</option>
            ))}
          </select>
          {selectedPlan && (
            <div className="success-box">
              {selectedPlan.name} | Price {formatINR(selectedPlan.price)} | Validity {selectedPlan.validity_days} days | Free Visits {selectedPlan.free_visits}
            </div>
          )}
        </FormCard>
      )}

      {invoiceType === "new_sale" && (
        <FormCard label="Select RO Product">
          <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
            <option value="">Select RO Product ({products.length} found)</option>
            {products.map((p) => (
              <option value={p.id} key={p.id}>{p.name} — {formatINR(p.price)}</option>
            ))}
          </select>
          {selectedProduct && (
            <div className="success-box">
              {selectedProduct.name} | Price {formatINR(selectedProduct.price)} | Warranty {selectedProduct.warranty_validity_days} days | Free Visits {selectedProduct.free_visits}
            </div>
          )}
        </FormCard>
      )}

      {invoiceType === "rental" && (
        <FormCard label="RO Rental">
          <div className="two-col">
            <input type="number" placeholder="Security deposit" value={rentalDeposit} onChange={(e) => setRentalDeposit(e.target.value)} />
            <input type="number" placeholder="Monthly rent" value={rentalMonthly} onChange={(e) => setRentalMonthly(e.target.value)} />
          </div>
          <input type="date" value={rentalStartDate} onChange={(e) => setRentalStartDate(e.target.value)} />
          <div className="muted-box">Rent Reminder: {nextMonthlyDate(rentalStartDate)} | First Invoice: {formatINR(rentalAmount)}</div>
        </FormCard>
      )}

      {(invoiceType === "amc" || invoiceType === "new_sale") && (
        <FormCard label="Discount">
          <input
            placeholder="Discount amount"
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <p className="helper">For AMC/New Sale, service/visit charge will remain ₹0.</p>
        </FormCard>
      )}

      {(invoiceType === "amc" || invoiceType === "new_sale") && (
        <FormCard label="Sales Person">
          <select value={salesPersonId} onChange={(e) => setSalesPersonId(e.target.value)}>
            <option value="">No sales person</option>
            {salesPersons.filter((person) => person.is_active !== false).map((person) => (
              <option key={person.id} value={person.id}>{person.name} ({person.mobile})</option>
            ))}
          </select>
          {selectedSalesPerson && <div className="success-box mt-sm">Incentive: {formatINR(salesIncentiveAmount)}</div>}
        </FormCard>
      )}

      <FormCard label="Add Used Part / Extra Accessory">
        <PartsTable
          items={inventory}
          emptyText="No inventory parts found."
          columns={[
            { key: "name", label: "Part Name" },
            { key: "category_name", label: "Category" },
            { key: "stock_qty", label: "Shop Stock", sortValue: (item) => Number(item.stock_qty || 0), render: (item) => <strong>{item.stock_qty}</strong> },
            { key: "tech_stock", label: "Tech Stock", sortValue: (item) => getTechnicianQty(item.id), render: (item) => job?.technician_id ? <strong>{getTechnicianQty(item.id)}</strong> : "-" },
            { key: "selling_price", label: "Selling", sortValue: (item) => Number(item.selling_price || 0), render: (item) => formatINR(item.selling_price) },
            { key: "stock_status", label: "Status", render: (item) => <StockBadge item={item} /> },
          ]}
          actions={(item) => {
            const rowQty = partQtyById[item.id] || "1";
            const techQty = getTechnicianQty(item.id);
            const blocked = job?.technician_id && techQty < Number(rowQty || 1);
            return (
              <div className="part-add-actions">
                <input
                  type="number"
                  min="1"
                  value={rowQty}
                  onChange={(e) => setPartQtyById({ ...partQtyById, [item.id]: e.target.value })}
                />
                <button className={blocked ? "danger-btn small" : "primary-btn small"} onClick={() => addPartItem(item, rowQty)}>
                  Add
                </button>
              </div>
            );
          }}
        />
        {selectedPartItem && job?.technician_id && selectedTechnicianPartQty < Number(qty || 1) && (
          <div className="error-box mt-sm">Technician stock available: {selectedTechnicianPartQty}</div>
        )}
      </FormCard>

      {parts.length > 0 && (
        <div className="panel sub-panel">
          <h3>Used Parts</h3>
          {parts.map((p, idx) => (
            <div className="booking-row" key={idx}>
              <div>
                <strong>{p.part_name}</strong>
                <p>Qty {p.quantity} • Actual {formatINR(p.actual_selling_price)} • Billing {formatINR(p.billing_price)}</p>
                {p.is_covered && <p className="success-line">Covered under AMC/Warranty</p>}
              </div>
              <button className="ghost-btn small" onClick={() => setParts(parts.filter((_, i) => i !== idx))}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <FormCard label="Payment Collection">
        <div className="chip-grid">
          <button className={paymentMode === "cash" ? "chip active" : "chip"} type="button" onClick={() => { setPaymentMode("cash"); setCashAmount(String(total)); setUpiAmount("0"); }}>Cash Full</button>
          <button className={paymentMode === "upi" ? "chip active" : "chip"} type="button" onClick={() => { setPaymentMode("upi"); setCashAmount("0"); setUpiAmount(String(total)); }}>UPI Full</button>
          <button className={paymentMode === "split" ? "chip active" : "chip"} type="button" onClick={() => setPaymentMode("split")}>Cash + UPI</button>
          <button className={paymentMode === "emi" ? "chip active" : "chip"} type="button" onClick={() => setPaymentMode("emi")}>EMI</button>
          <button className={paymentMode === "pending" ? "chip active" : "chip"} type="button" onClick={() => { setPaymentMode("pending"); setCashAmount("0"); setUpiAmount("0"); }}>Pending</button>
        </div>

        <div className="two-col">
          <div>
            <label className="field-label">{paymentMode === "emi" ? "Cash Advance" : "Cash Received"}</label>
            <input
              placeholder="Enter cash amount"
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">{paymentMode === "emi" ? "UPI Advance" : "UPI Received"}</label>
            <input
              placeholder="Enter UPI amount"
              type="number"
              value={upiAmount}
              onChange={(e) => setUpiAmount(e.target.value)}
            />
          </div>
        </div>

        {paymentMode === "emi" && (
          <div className="sub-panel">
            <h3>EMI Reminder</h3>
            <div className="two-col">
              <input placeholder="No. of EMI months" type="number" value={emiMonths} onChange={(e) => setEmiMonths(e.target.value)} />
              <input type="date" value={emiStartDate} onChange={(e) => setEmiStartDate(e.target.value)} />
            </div>
            <input placeholder="EMI notes" value={emiNotes} onChange={(e) => setEmiNotes(e.target.value)} />
            <div className="muted-box">Next EMI Reminder: {emiStartDate} | Monthly EMI: {formatINR(monthlyEmi)}</div>
          </div>
        )}

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

        <p className="helper">
          Cash + UPI total invoice amount se kam hai to payment status automatically Partial/Pending will remain.
        </p>
      </FormCard>

      <div className="amount-box total">
        <strong>Total Invoice</strong>
        <strong>{formatINR(total)}</strong>
      </div>

      {message && <div className={isSuccessToast(message) ? "success-box" : "error-box"}>{message}</div>}

      {showPaymentConfirm && upfrontUpiQrAmount > 0 && (
        <section className="payment-confirm-box">
          <div className="panel-head">
            <h3>Confirm UPI Payment</h3>
            <button className="ghost-btn small" onClick={() => setShowPaymentConfirm(false)}>Close</button>
          </div>
          <div className="payment-summary">
            <div><span>Customer</span><strong>{booking.customer_name}</strong></div>
            <div><span>Invoice Total</span><strong>{formatINR(total)}</strong></div>
            <div><span>Cash</span><strong>{formatINR(cashAmount)}</strong></div>
            <div><span>{isEmiInvoice ? "Down Payment UPI" : "UPI"}</span><strong>{formatINR(upfrontUpiQrAmount)}</strong></div>
          </div>
          <div className="qr-preview">
            <QRCodeCanvas value={upiUri} size={180} />
            <p>UPI ID: {upiId}</p>
            <p>{isEmiInvoice ? "Down Payment UPI QR" : "UPI Amount"}: {formatINR(upfrontUpiQrAmount)}</p>
          </div>
          <button
            className="primary-btn big"
            onClick={() => {
              setPaymentConfirmed(true);
              setShowPaymentConfirm(false);
              generateInvoice(true);
            }}
          >
            Payment Received
          </button>
        </section>
      )}

      <button className="primary-btn big" onClick={generateInvoice}>Generate Final Invoice</button>
    </section>
  );
}
