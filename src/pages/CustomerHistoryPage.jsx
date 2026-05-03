import { useEffect, useState } from "react";
import { BookingMini, StatCard } from "../components/shared";
import { formatINR, getDueAmount, getPaidAmount, isActive, isCompletedStatus, normalizeMobile, todayISO } from "../utils/appUtils";
export function CustomerHistoryPage({ mode = "search", initialMobile = "", customers, bookings, jobs = [], technicians = [], invoices, invoiceItems, invoicePayments = [], usage = [], coverages, leads = [], onCustomerOpen, onBack, onCreateBooking }) {
  const [search, setSearch] = useState("");
  const [selectedMobile, setSelectedMobile] = useState(initialMobile || "");
  const isListMode = mode === "list";
  const isDetailMode = mode === "detail";

  useEffect(() => {
    if (initialMobile) setSelectedMobile(initialMobile);
  }, [initialMobile]);

  const searchText = search.trim().toLowerCase();
  const filtered = searchText ? customers.filter((c) => {
    const q = searchText;
    return (
      String(c.name || "").toLowerCase().includes(q) ||
      String(c.mobile || "").toLowerCase().includes(q) ||
      String(c.address || "").toLowerCase().includes(q)
    );
  }) : isListMode ? customers : [];

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

  return (
    <>
      <section className="page-head">
        <h2>{isDetailMode ? "Customer Details" : isListMode ? "Customers" : "Customer History"}</h2>
        <p>{isDetailMode ? "Complete customer profile, jobs, invoices, installed parts, and lead history." : isListMode ? "Search and open any customer profile." : "Search by mobile number, name, or address to view complete customer history."}</p>
      </section>

      {!isDetailMode && <section className="panel">
        <input
          placeholder={isListMode ? "Search customers by name, mobile, or address" : "Search customer by mobile number"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {(isListMode || searchText) && (
          <div className="customer-list">
            {filtered.length === 0 ? <p className="muted">No customer found.</p> : (isListMode ? filtered : filtered.slice(0, 8)).map((c) => (
              <button
                key={c.id}
                type="button"
                className={selectedMobileKey === normalizeMobile(c.mobile) ? "customer-chip active" : "customer-chip"}
                onClick={() => {
                  const mobile = normalizeMobile(c.mobile);
                  setSelectedMobile(mobile);
                  onCustomerOpen?.(mobile);
                }}
              >
                <strong>{c.name}</strong>
                <span>{c.mobile}</span>
              </button>
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

          <section className="panel">
            <div className="section-head">
              <div>
                <h3>{selectedCustomer.name}</h3>
                <p>{selectedCustomer.mobile}</p>
                <p>{selectedCustomer.address}</p>
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
            {customerInvoices.length === 0 ? <p className="muted">No invoices.</p> : customerInvoices.map((inv) => {
              const items = invoiceItems.filter((i) => String(i.invoice_id) === String(inv.id));
              const payments = invoicePayments.filter((p) => String(p.invoice_id) === String(inv.id));
              return (
                <div className="job-card" key={inv.id}>
                  <strong>{inv.invoice_type}</strong>
                  <p>Total: {formatINR(inv.total_amount)} | Paid: {formatINR(getPaidAmount(inv))} | Due: {formatINR(getDueAmount(inv))}</p>
                  <p>Status: {inv.payment_status} | Method: {inv.payment_method}</p>
                  {inv.payment_method === "emi" && <p className="muted">EMI: {formatINR(inv.emi_monthly_amount)} | Next Due: {inv.emi_next_due_date || "Not set"}</p>}
                  {items.map((item) => (
                    <div className="mini-line" key={item.id}>{item.item_name} x {item.quantity} — {formatINR(item.billing_price)}</div>
                  ))}
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