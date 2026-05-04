import { useEffect, useState } from "react";
import { BookingMini, StatCard } from "../components/shared";
import { coverageLabel, formatINR, getDueAmount, getPaidAmount, isActive, isCompletedStatus, normalizeMobile, todayISO } from "../utils/appUtils";
export function CustomerHistoryPage({ mode = "search", initialMobile = "", customers, bookings, jobs = [], technicians = [], invoices, invoiceItems, invoicePayments = [], usage = [], coverages, leads = [], businessSettings, onCustomerOpen, onBack, onCreateBooking }) {
  const [search, setSearch] = useState("");
  const [selectedMobile, setSelectedMobile] = useState(initialMobile || "");
  const [filter, setFilter] = useState("all");
  const isListMode = mode === "list";
  const isDetailMode = mode === "detail";

  useEffect(() => {
    if (initialMobile) setSelectedMobile(initialMobile);
  }, [initialMobile]);

  const searchText = search.trim().toLowerCase();
  const baseFiltered = searchText ? customers.filter((c) => {
    const q = searchText;
    return (
      String(c.name || "").toLowerCase().includes(q) ||
      String(c.mobile || "").toLowerCase().includes(q) ||
      String(c.address || "").toLowerCase().includes(q)
    );
  }) : isListMode ? customers : [];

  function customerStatus(customer) {
    const mobile = normalizeMobile(customer.mobile);
    const customerCoverages = coverages.filter((c) => normalizeMobile(c.mobile) === mobile);
    const activeCoverage = customerCoverages.some(isActive);
    const dueService = customerCoverages.some((c) => c.next_service_due_date && String(c.next_service_due_date) <= todayISO() && isActive(c));
    if (dueService) return "Service Due";
    if (activeCoverage) return "Active";
    return "Inactive";
  }

  function initials(name = "") {
    const parts = String(name || "Customer").trim().split(/\s+/);
    return `${parts[0]?.[0] || "C"}${parts[1]?.[0] || ""}`.toUpperCase();
  }

  const filtered = baseFiltered.filter((customer) => {
    if (filter === "all") return true;
    if (filter === "due") return customerStatus(customer) === "Service Due";
    if (filter === "active") return customerStatus(customer) === "Active";
    if (filter === "inactive") return customerStatus(customer) === "Inactive";
    return true;
  });

  const selectedMobileKey = normalizeMobile(selectedMobile);
  const selectedCustomer = customers.find((c) => normalizeMobile(c.mobile) === selectedMobileKey);
  const customerBookings = selectedMobileKey ? bookings.filter((b) => normalizeMobile(b.mobile) === selectedMobileKey) : [];
  const customerInvoices = selectedMobileKey ? invoices.filter((i) => normalizeMobile(i.mobile) === selectedMobileKey) : [];
  const customerCoverages = selectedMobileKey ? coverages.filter((c) => normalizeMobile(c.mobile) === selectedMobileKey) : [];
  const customerLeads = selectedMobileKey ? leads.filter((l) => normalizeMobile(l.mobile) === selectedMobileKey) : [];
  const customerPayments = selectedMobileKey ? invoicePayments.filter((p) => normalizeMobile(p.mobile) === selectedMobileKey) : [];
  const customerInvoiceIds = new Set(customerInvoices.map((invoice) => String(invoice.id)));
  const customerUsage = selectedMobile ? usage.filter((row) => customerInvoiceIds.has(String(row.invoice_id))) : [];
  const customerJobs = customerBookings
    .map((booking) => {
      const job = jobs.find((j) => String(j.booking_id) === String(booking.id));
      const technician = technicians.find((t) => String(t.id) === String(job?.technician_id));
      return { booking, job, technician };
    })
    .filter((item) => item.job);

  const totalSpend = customerInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
  const paid = customerInvoices.reduce((sum, i) => sum + getPaidAmount(i), 0);
  const pending = customerInvoices.reduce((sum, i) => sum + getDueAmount(i), 0);
  const activeCoverageCount = customerCoverages.filter(isActive).length;
  const dueReminderCount = customerCoverages.filter((c) => c.next_service_due_date && String(c.next_service_due_date) <= todayISO() && isActive(c)).length;
  const lastBooking = customerBookings[0];
  const latestInvoice = customerInvoices[0];
  const latestPayment = customerPayments[0];

  function customerWhatsAppLink() {
    const mobile = normalizeMobile(selectedMobile);
    const text = encodeURIComponent(`Namaste ${selectedCustomer?.name || ""}, AquaBiz se baat kar rahe hain.`);
    return mobile ? `https://wa.me/91${mobile}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  function getInvoiceNumber(invoice, index = 0) {
    const shortId = String(invoice.id || "").slice(0, 6).toUpperCase();
    return `${businessSettings?.invoice_prefix || "INV"}-${shortId || index + 1}`;
  }

  function invoiceShareText(invoice, items, index) {
    const lines = [
      `${businessSettings?.business_name || "AquaBiz"} Invoice`,
      `Invoice No: ${getInvoiceNumber(invoice, index)}`,
      `Customer: ${invoice.customer_name || selectedCustomer?.name || ""}`,
      `Mobile: ${invoice.mobile || selectedCustomer?.mobile || ""}`,
      `Type: ${invoice.invoice_type || "service"}`,
      `Total: ${formatINR(invoice.total_amount)}`,
      `Paid: ${formatINR(getPaidAmount(invoice))}`,
      `Pending: ${formatINR(getDueAmount(invoice))}`,
      `Status: ${invoice.payment_status || ""}`,
    ];

    if (items.length > 0) {
      lines.push("", "Items:");
      items.forEach((item) => lines.push(`${item.item_name} x ${item.quantity || 1} - ${formatINR(item.billing_price)}`));
    }

    if (businessSettings?.upi_id && getDueAmount(invoice) > 0) lines.push("", `UPI ID: ${businessSettings.upi_id}`);
    if (businessSettings?.business_phone || businessSettings?.phone) lines.push(`Phone: ${businessSettings.business_phone || businessSettings.phone}`);
    lines.push("Thank you.");
    return lines.join("\n");
  }

  function shareInvoiceWhatsApp(invoice, items, index) {
    const mobile = normalizeMobile(invoice.mobile || selectedCustomer?.mobile);
    const text = encodeURIComponent(invoiceShareText(invoice, items, index));
    window.open(mobile ? `https://wa.me/91${mobile}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
  }

  function printCustomerInvoice(invoice, items, index) {
    const invoiceNo = getInvoiceNumber(invoice, index);
    const business = businessSettings || {};
    const rows = items.length
      ? items.map((item) => `<tr><td>${item.item_name || ""}</td><td>${item.quantity || 1}</td><td>Rs ${Number(item.billing_price || 0).toLocaleString("en-IN")}</td></tr>`).join("")
      : `<tr><td>${invoice.invoice_type || "Service"}</td><td>1</td><td>Rs ${Number(invoice.total_amount || 0).toLocaleString("en-IN")}</td></tr>`;
    const html = `
      <html><head><title>${invoiceNo}</title><style>
        body{font-family:Arial,sans-serif;margin:0;padding:28px;color:#111827;background:#f8fafc}
        .sheet{max-width:760px;margin:auto;background:#fff;border:1px solid #e5e7eb;padding:28px}
        .head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #0f766e;padding-bottom:16px}
        h1{margin:0;color:#000666} p{margin:4px 0;color:#475569}
        .box{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-top:14px}
        table{width:100%;border-collapse:collapse;margin-top:14px} th,td{border:1px solid #e5e7eb;padding:10px;text-align:left}
        th{background:#ecfdf5;color:#064e3b}.total{font-size:22px;font-weight:800;color:#0f766e}
        @media print{body{background:#fff;padding:0}.sheet{border:0}}
      </style></head><body>
        <div class="sheet">
          <div class="head"><div><h1>${business.business_name || "AquaBiz"}</h1><p>${business.business_phone || business.phone || ""}</p><p>${business.business_address || business.address || ""}</p></div><div><strong>${invoiceNo}</strong><p>Date: ${invoice.invoice_date || String(invoice.created_at || "").slice(0, 10)}</p></div></div>
          <div class="box"><p><strong>Customer:</strong> ${invoice.customer_name || selectedCustomer?.name || ""}</p><p><strong>Mobile:</strong> ${invoice.mobile || selectedCustomer?.mobile || ""}</p><p><strong>Type:</strong> ${invoice.invoice_type || "service"}</p></div>
          <table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
          <table><tr><td>Total</td><td class="total">Rs ${Number(invoice.total_amount || 0).toLocaleString("en-IN")}</td></tr><tr><td>Paid</td><td>Rs ${Number(getPaidAmount(invoice) || 0).toLocaleString("en-IN")}</td></tr><tr><td>Pending</td><td>Rs ${Number(getDueAmount(invoice) || 0).toLocaleString("en-IN")}</td></tr><tr><td>Status</td><td>${invoice.payment_status || ""}</td></tr></table>
          <div class="box"><p>${business.terms || "Thank you for your business."}</p></div>
        </div><script>window.onload=function(){window.print()}</script>
      </body></html>`;
    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <>
      <section className="page-head">
        <h2>{isDetailMode ? "Customer Details" : isListMode ? "Customers" : "Customer History"}</h2>
        <p>{isDetailMode ? "Complete customer profile, jobs, invoices, installed parts, and lead history." : isListMode ? "Search and open any customer profile." : "Search by mobile number, name, or address to view complete customer history."}</p>
      </section>

      {!isDetailMode && <section className="panel">
        <div className="customer-search-wrap">
          <span>Search</span>
          <input
            placeholder={isListMode ? "Search customers by name or phone..." : "Search customer by mobile number"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="customer-filter-chips">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} type="button">All Customers</button>
          <button className={filter === "due" ? "active" : ""} onClick={() => setFilter("due")} type="button">Due Service</button>
          <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")} type="button">Active</button>
          <button className={filter === "inactive" ? "active" : ""} onClick={() => setFilter("inactive")} type="button">Inactive</button>
        </div>

        {(isListMode || searchText) && (
          <div className="customer-card-list">
            {filtered.length === 0 ? <p className="muted">No customer found.</p> : (isListMode ? filtered : filtered.slice(0, 8)).map((c) => (
              <article className={selectedMobileKey === normalizeMobile(c.mobile) ? "customer-card active" : "customer-card"} key={c.id}>
                <button
                  type="button"
                  className="customer-card-main"
                  onClick={() => {
                    const mobile = normalizeMobile(c.mobile);
                    setSelectedMobile(mobile);
                    onCustomerOpen?.(mobile);
                  }}
                >
                  <div className="customer-avatar">{initials(c.name)}</div>
                  <div>
                    <h3>{c.name}</h3>
                    <p>{c.mobile}</p>
                  </div>
                  <span className={`customer-status ${customerStatus(c).toLowerCase().replace(/\s+/g, "-")}`}>{customerStatus(c)}</span>
                </button>
                <div className="customer-address-line">
                  <span>Location</span>
                  <p>{c.address || "Address not added"}</p>
                </div>
                <div className="customer-card-actions">
                  <a className="ghost-btn" href={`tel:${c.mobile}`}>Call</a>
                  <a className="ghost-btn" href={`https://wa.me/91${normalizeMobile(c.mobile)}?text=${encodeURIComponent(`Namaste ${c.name || ""}, AquaBiz se baat kar rahe hain.`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  <button className="primary-btn" onClick={() => onCreateBooking?.(c)} type="button">New Booking</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>}

      {!selectedCustomer ? (
        <section className="panel">
          <p className="muted">{isListMode ? "Select a customer from the list." : "Search mobile number and select a customer."}</p>
        </section>
      ) : (
        <>
          <section className="cards-grid">
            <StatCard icon="📋" label="Bookings" value={customerBookings.length} />
            <StatCard icon="🧾" label="Invoices" value={customerInvoices.length} />
            <StatCard icon="💰" label="Total Spend" value={formatINR(totalSpend)} />
            <StatCard icon="⏳" label="Pending" value={formatINR(pending)} />
            <StatCard icon="P" label="Paid" value={formatINR(paid)} />
            <StatCard icon="A" label="Active AMC/Warranty" value={activeCoverageCount} />
            <StatCard icon="R" label="Due Reminders" value={dueReminderCount} />
            <StatCard icon="L" label="Leads" value={customerLeads.length} />
          </section>

          <section className="panel customer-profile-panel">
            <div className="section-head">
              <div className="customer-profile-title">
                <div className="customer-avatar big">{initials(selectedCustomer.name)}</div>
                <div>
                <h3>{selectedCustomer.name}</h3>
                <p>{selectedCustomer.mobile}</p>
                <p>{selectedCustomer.address}</p>
                </div>
              </div>
              <div className="row-actions">
                {isDetailMode && <button className="ghost-btn small" onClick={onBack}>Back</button>}
                <button className="primary-btn small" onClick={() => onCreateBooking?.(selectedCustomer)}>New Booking / Ticket</button>
                <a className="ghost-btn small" href={`tel:${selectedCustomer.mobile}`}>Call</a>
                <a className="ghost-btn small" href={customerWhatsAppLink()} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            </div>
            <div className="payment-summary">
              <div><span>Last Booking</span><strong>{lastBooking ? new Date(lastBooking.created_at).toLocaleDateString("en-IN") : "None"}</strong></div>
              <div><span>Last Invoice</span><strong>{latestInvoice ? formatINR(latestInvoice.total_amount) : "None"}</strong></div>
              <div><span>Last Payment</span><strong>{latestPayment ? `${latestPayment.payment_date} • ${formatINR(Number(latestPayment.cash_amount || 0) + Number(latestPayment.upi_amount || 0))}` : "None"}</strong></div>
            </div>
          </section>

          <section className="panel">
            <h3>AMC / Warranty</h3>
            {customerCoverages.length === 0 ? <p className="muted">No AMC/Warranty records.</p> : customerCoverages.map((c) => (
              <div className="job-card" key={c.id}>
                <strong>{c.source_name}</strong>
                <p>{c.source_type} • {coverageLabel(c.coverage_type)}</p>
                <p>Activation: {c.activation_date} | Expiry: {c.expiry_date}</p>
                <p>Visits: {c.used_visits}/{c.free_visits}</p>
                <p>Next Service: {c.next_service_due_date}</p>
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>Jobs</h3>
            {customerJobs.length === 0 ? <p className="muted">No jobs assigned.</p> : customerJobs.map(({ booking, job, technician }) => (
              <div className="job-card" key={job.id}>
                <div className="booking-card-head">
                  <div>
                    <strong>{booking.service_type}</strong>
                    <p>{booking.address}</p>
                  </div>
                  <span className={isCompletedStatus(job.status) ? "status assigned" : "status unassigned"}>{job.status}</span>
                </div>
                <p>Technician: {technician?.name || "Not found"} {technician?.mobile ? `• ${technician.mobile}` : ""}</p>
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>Bookings</h3>
            {customerBookings.length === 0 ? <p className="muted">No bookings.</p> : customerBookings.map((b) => (
              <div className="job-card" key={b.id}>
                <BookingMini booking={b} />
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>Installed Parts / Service Parts</h3>
            {customerUsage.length === 0 ? <p className="muted">No installed parts found.</p> : customerUsage.map((row) => {
              const invoice = customerInvoices.find((inv) => String(inv.id) === String(row.invoice_id));
              const booking = customerBookings.find((b) => String(b.id) === String(row.booking_id || invoice?.booking_id));
              const job = jobs.find((j) => String(j.booking_id) === String(booking?.id));
              const technician = technicians.find((t) => String(t.id) === String(row.technician_id || job?.technician_id));
              const installedDate = invoice?.invoice_date || row.created_at || booking?.created_at;

              return (
                <div className="job-card" key={row.id}>
                  <div className="booking-card-head">
                    <div>
                      <strong>{row.part_name}</strong>
                      <p>Qty {row.quantity} | Invoice {invoice?.invoice_number || invoice?.id || "Not found"}</p>
                    </div>
                    <span className={row.is_covered ? "status assigned" : "status unassigned"}>
                      {row.is_covered ? "Covered" : "Paid"}
                    </span>
                  </div>
                  <p>Date: {installedDate ? new Date(installedDate).toLocaleDateString("en-IN") : "Not set"}</p>
                  <p>Technician: {technician?.name || "Not found"} {technician?.mobile ? `- ${technician.mobile}` : ""}</p>
                  <p>Billing: {formatINR(row.billing_price)} | Actual: {formatINR(row.actual_selling_price)}</p>
                  {row.covered_reason && <p className="success-line">{row.covered_reason}</p>}
                  {booking?.address && <p className="muted">Address: {booking.address}</p>}
                </div>
              );
            })}
          </section>

          <section className="panel">
            <h3>Invoices</h3>
            {customerInvoices.length === 0 ? <p className="muted">No invoices.</p> : customerInvoices.map((inv, index) => {
              const items = invoiceItems.filter((i) => String(i.invoice_id) === String(inv.id));
              return (
                <div className="job-card" key={inv.id}>
                  <div className="booking-card-head">
                    <div>
                      <strong>{getInvoiceNumber(inv, index)} - {inv.invoice_type}</strong>
                      <p>Status: {inv.payment_status} | Method: {inv.payment_method}</p>
                    </div>
                    <span className={getDueAmount(inv) > 0 ? "status unassigned" : "status assigned"}>{getDueAmount(inv) > 0 ? "Pending" : "Paid"}</span>
                  </div>
                  <p>Total: {formatINR(inv.total_amount)} | Paid: {formatINR(getPaidAmount(inv))} | Due: {formatINR(getDueAmount(inv))}</p>
                  {inv.payment_method === "emi" && <p className="muted">EMI: {formatINR(inv.emi_monthly_amount)} | Next Due: {inv.emi_next_due_date || "Not set"}</p>}
                  {items.map((item) => (
                    <div className="mini-line" key={item.id}>{item.item_name} x {item.quantity} — {formatINR(item.billing_price)}</div>
                  ))}
                  <div className="customer-invoice-actions">
                    <button className="primary-btn small" onClick={() => printCustomerInvoice(inv, items, index)}>View / Print Invoice</button>
                    <button className="ghost-btn small" onClick={() => shareInvoiceWhatsApp(inv, items, index)}>Share WhatsApp</button>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="panel">
            <h3>Lead History</h3>
            {customerLeads.length === 0 ? <p className="muted">No leads for this customer.</p> : customerLeads.map((lead) => (
              <div className="job-card" key={lead.id}>
                <div className="booking-card-head">
                  <div>
                    <strong>{lead.interest}</strong>
                    <p>{lead.source} - Follow-up: {lead.follow_up_date || "Not set"}</p>
                  </div>
                  <span className="status assigned">{lead.status}</span>
                </div>
                {lead.notes && <p className="muted">{lead.notes}</p>}
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
