import { useEffect, useState } from "react";
import { BookingMini, StatCard } from "../components/shared";
import { PartsTable } from "../components/PartsTable";
import { supabase } from "../supabaseClient";
import { coverageLabel, formatINR, getDueAmount, getPaidAmount, isActive, isCompletedStatus, normalizeMobile, todayISO } from "../utils/appUtils";
import { downloadCsv, parseCustomerUploadFile } from "../utils/csvUtils";
import { isSuccessToast, useAutoHideMessage } from "../utils/toastUtils";
import { buildWhatsAppUrl, customerGreetingMessage, invoiceShareMessage } from "../utils/whatsappUtils";
export function CustomerHistoryPage({ mode = "search", initialMobile = "", customers, bookings, jobs = [], technicians = [], invoices, invoiceItems, invoicePayments = [], usage = [], coverages, leads = [], businessSettings, onCustomerOpen, onBack, onCreateBooking, onUpdated }) {
  const [search, setSearch] = useState("");
  const [selectedMobile, setSelectedMobile] = useState(initialMobile || "");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  useAutoHideMessage(message, setMessage);
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
  const customerUsageRows = customerUsage.map((row) => {
    const invoice = customerInvoices.find((inv) => String(inv.id) === String(row.invoice_id));
    const booking = customerBookings.find((b) => String(b.id) === String(row.booking_id || invoice?.booking_id));
    const job = jobs.find((j) => String(j.booking_id) === String(booking?.id));
    const technician = technicians.find((t) => String(t.id) === String(row.technician_id || job?.technician_id));
    return {
      ...row,
      invoice_number: invoice?.invoice_number || getInvoiceNumber(invoice || {}, 0),
      installed_date: invoice?.invoice_date || row.created_at || booking?.created_at || "",
      technician_name: technician?.name || "Not found",
      technician_mobile: technician?.mobile || "",
      address: booking?.address || "",
    };
  });
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
  const timelineEntries = [
    ...customerBookings.map((booking) => ({
      id: `booking-${booking.id}`,
      date: booking.created_at || booking.booking_date,
      type: "Booking",
      title: booking.service_type || "Service booking",
      detail: `${booking.mobile || ""}${booking.address ? ` | ${booking.address}` : ""}`,
    })),
    ...customerJobs.map(({ booking, job, technician }) => ({
      id: `job-${job.id}`,
      date: job.completed_at || job.updated_at || booking.created_at,
      type: isCompletedStatus(job.status) ? "Completed Job" : "Job",
      title: `${booking.service_type || "Job"} - ${job.status || "Assigned"}`,
      detail: `Technician: ${technician?.name || "Not assigned"}${technician?.mobile ? ` | ${technician.mobile}` : ""}`,
    })),
    ...customerInvoices.map((invoice, index) => ({
      id: `invoice-${invoice.id}`,
      date: invoice.invoice_date || invoice.created_at,
      type: "Invoice",
      title: `${getInvoiceNumber(invoice, index)} - ${formatINR(invoice.total_amount)}`,
      detail: `Paid ${formatINR(getPaidAmount(invoice))} | Due ${formatINR(getDueAmount(invoice))} | ${invoice.payment_status || ""}`,
    })),
    ...customerPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      date: payment.payment_date || payment.created_at,
      type: "Payment",
      title: formatINR(Number(payment.cash_amount || 0) + Number(payment.upi_amount || 0)),
      detail: `Cash ${formatINR(payment.cash_amount)} | UPI ${formatINR(payment.upi_amount)}${payment.note ? ` | ${payment.note}` : ""}`,
    })),
    ...customerCoverages.map((coverage) => ({
      id: `coverage-${coverage.id}`,
      date: coverage.activation_date || coverage.created_at,
      type: coverage.source_type === "new_sale" ? "Warranty" : "AMC",
      title: coverage.source_name || "Coverage activated",
      detail: `Expiry ${coverage.expiry_date || "Not set"} | Next service ${coverage.next_service_due_date || "Not set"}`,
    })),
    ...customerLeads.map((lead) => ({
      id: `lead-${lead.id}`,
      date: lead.follow_up_date || lead.created_at,
      type: "Lead",
      title: `${lead.interest || lead.service_need || "Lead"} - ${lead.status || "New"}`,
      detail: `${lead.source || "Manual"}${lead.notes ? ` | ${String(lead.notes).split("\n")[0]}` : ""}`,
    })),
    ...customerUsage.map((row) => ({
      id: `part-${row.id}`,
      date: row.created_at,
      type: "Part",
      title: `${row.part_name} x ${row.quantity}`,
      detail: `Billing ${formatINR(row.billing_price)}${row.is_covered ? " | Covered" : ""}`,
    })),
  ]
    .filter((entry) => entry.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  function formatTimelineDate(value) {
    if (!value) return "Date not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  }

  function customerWhatsAppLink() {
    return buildWhatsAppUrl(selectedMobile, customerGreetingMessage(selectedCustomer?.name, businessSettings?.business_name));
  }

  function getInvoiceNumber(invoice, index = 0) {
    const shortId = String(invoice.id || "").slice(0, 6).toUpperCase();
    return `${businessSettings?.invoice_prefix || "INV"}-${shortId || index + 1}`;
  }

  function invoiceShareText(invoice, items, index) {
    return invoiceShareMessage(invoice, items, businessSettings, getInvoiceNumber(invoice, index));
  }

  function customerExportRows() {
    return customers.map((customer) => {
      const mobile = normalizeMobile(customer.mobile);
      const customerInvoiceRows = invoices.filter((invoice) => normalizeMobile(invoice.mobile) === mobile);
      const customerBookingRows = bookings.filter((booking) => normalizeMobile(booking.mobile) === mobile);
      const customerCoverageRows = coverages.filter((coverage) => normalizeMobile(coverage.mobile) === mobile);
      return [
        customer.name || "",
        customer.mobile || "",
        customer.address || "",
        customer.area || "",
        customer.created_at || "",
        customerBookingRows.length,
        customerInvoiceRows.length,
        customerInvoiceRows.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0),
        customerInvoiceRows.reduce((sum, invoice) => sum + getPaidAmount(invoice), 0),
        customerInvoiceRows.reduce((sum, invoice) => sum + getDueAmount(invoice), 0),
        customerCoverageRows.filter(isActive).length,
      ];
    });
  }

  function downloadCustomers() {
    downloadCsv(
      `aquabiz-customers-${todayISO()}.csv`,
      ["name", "mobile", "address", "area", "created_at", "bookings", "invoices", "total_billing", "paid", "pending", "active_coverages"],
      customerExportRows()
    );
  }

  function downloadCustomerTemplate() {
    downloadCsv(
      "aquabiz-customer-upload-template.csv",
      ["name", "mobile", "address", "area", "notes"],
      [["Rahul Sharma", "9876543210", "House no, area, city", "Area name", "Old customer"]]
    );
  }

  async function importCustomers(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage("");
    setImporting(true);
    try {
      const rows = await parseCustomerUploadFile(file);
      const payload = rows
        .map((row) => {
          const mobile = normalizeMobile(row.mobile || row.phone || row.contact || row.contact_number);
          return {
            name: row.name || row.customer_name || row.full_name || "",
            mobile,
            address: row.address || row.customer_address || "",
            area: row.area || row.locality || "",
            notes: row.notes || row.note || "",
          };
        })
        .filter((row) => row.name.trim() && /^\d{10}$/.test(row.mobile));

      if (payload.length === 0) {
        setMessage("No valid customers found. CSV must have name and 10 digit mobile.");
        return;
      }

      const uniqueByMobile = Array.from(new Map(payload.map((row) => [row.mobile, row])).values());
      const mobiles = uniqueByMobile.map((row) => row.mobile);
      const { data: existingRows, error: findError } = await supabase.from("customers").select("id,mobile").in("mobile", mobiles);
      if (findError) {
        setMessage(findError.message);
        return;
      }
      const existingByMobile = new Map((existingRows || []).map((row) => [normalizeMobile(row.mobile), row]));
      const inserts = [];
      const updates = [];
      uniqueByMobile.forEach((row) => {
        const existing = existingByMobile.get(row.mobile);
        if (existing?.id) updates.push({ id: existing.id, ...row });
        else inserts.push(row);
      });

      if (inserts.length > 0) {
        const { error } = await supabase.from("customers").insert(inserts);
        if (error) {
          setMessage(error.message);
          return;
        }
      }

      for (const row of updates) {
        const { id, ...payloadRow } = row;
        const { error } = await supabase.from("customers").update(payloadRow).eq("id", id);
        if (error) {
          setMessage(error.message);
          return;
        }
      }
      setMessage(`${uniqueByMobile.length} customers uploaded successfully.`);
      await onUpdated?.();
    } catch (error) {
      setMessage(error.message || "Customer upload failed.");
    } finally {
      setImporting(false);
    }
  }

  function shareInvoiceWhatsApp(invoice, items, index) {
    window.open(buildWhatsAppUrl(invoice.mobile || selectedCustomer?.mobile, invoiceShareText(invoice, items, index)), "_blank");
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

      {!isDetailMode && (
        <section className="panel customer-data-tools">
          <div className="section-heading-row">
            <div>
              <h3>Customer Data</h3>
              <p className="muted">Old customer CSV upload aur complete customer download.</p>
            </div>
            <div className="row-actions">
              <button className="ghost-btn small" type="button" onClick={downloadCustomerTemplate}>Template CSV</button>
              <button className="primary-btn small" type="button" onClick={downloadCustomers}>Download Customers</button>
              <label className="ghost-btn small file-action">
                {importing ? "Uploading..." : "Upload CSV"}
                <input type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={importCustomers} disabled={importing} />
              </label>
            </div>
          </div>
          {message && <div className={isSuccessToast(message) ? "success-box" : "error-box"}>{message}</div>}
        </section>
      )}

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
                  <a className="ghost-btn" href={buildWhatsAppUrl(c.mobile, customerGreetingMessage(c.name, businessSettings?.business_name))} target="_blank" rel="noreferrer">WhatsApp</a>
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
                <button className="ghost-btn small" onClick={() => window.print()}>Print History</button>
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

          <section className="panel customer-timeline-panel">
            <h3>Customer Timeline</h3>
            <p className="muted">Bookings, jobs, invoices, payments, AMC/warranty, leads, and parts in one date-wise history.</p>
            {timelineEntries.length === 0 ? <p className="muted">No timeline records found.</p> : (
              <div className="customer-timeline-list">
                {timelineEntries.map((entry) => (
                  <article className="customer-timeline-item" key={entry.id}>
                    <div className="timeline-dot" />
                    <div>
                      <div className="timeline-item-head">
                        <span>{entry.type}</span>
                        <small>{formatTimelineDate(entry.date)}</small>
                      </div>
                      <strong>{entry.title}</strong>
                      {entry.detail && <p>{entry.detail}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
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
            <PartsTable
              items={customerUsageRows}
              showStockFilter={false}
              emptyText="No installed parts found."
              columns={[
                { key: "part_name", label: "Part" },
                { key: "quantity", label: "Qty", sortValue: (row) => Number(row.quantity || 0), render: (row) => <strong>{row.quantity}</strong> },
                { key: "invoice_number", label: "Invoice" },
                { key: "installed_date", label: "Date", render: (row) => row.installed_date ? new Date(row.installed_date).toLocaleDateString("en-IN") : "Not set" },
                { key: "technician_name", label: "Technician", render: (row) => `${row.technician_name}${row.technician_mobile ? ` (${row.technician_mobile})` : ""}` },
                { key: "billing_price", label: "Billing", sortValue: (row) => Number(row.billing_price || 0), render: (row) => formatINR(row.billing_price) },
                { key: "status", label: "Status", render: (row) => <span className={row.is_covered ? "status assigned" : "status unassigned"}>{row.is_covered ? "Covered" : "Paid"}</span> },
              ]}
              renderExpanded={(row) => (
                <div>
                  {row.covered_reason && <p className="success-line">{row.covered_reason}</p>}
                  {row.address && <p className="muted">Address: {row.address}</p>}
                  <p className="muted">Actual price: {formatINR(row.actual_selling_price)}</p>
                </div>
              )}
            />
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
                  <PartsTable
                    items={items.map((item) => ({
                      ...item,
                      name: item.item_name,
                      stock_qty: item.quantity,
                      category_name: item.item_type || "invoice",
                    }))}
                    showStockFilter={false}
                    emptyText="No invoice items."
                    columns={[
                      { key: "item_name", label: "Item" },
                      { key: "item_type", label: "Type" },
                      { key: "quantity", label: "Qty", sortValue: (item) => Number(item.quantity || 0), render: (item) => <strong>{item.quantity}</strong> },
                      { key: "actual_price", label: "Actual", sortValue: (item) => Number(item.actual_price || 0), render: (item) => formatINR(item.actual_price) },
                      { key: "billing_price", label: "Billing", sortValue: (item) => Number(item.billing_price || 0), render: (item) => formatINR(item.billing_price) },
                      { key: "status", label: "Status", render: (item) => <span className={item.is_covered ? "status assigned" : "status unassigned"}>{item.is_covered ? "Covered" : "Chargeable"}</span> },
                    ]}
                  />
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
