import { useEffect, useState } from "react";
import { InvoiceBuilder } from "../components/InvoiceBuilder";
import { DetailDrawer, StatCard } from "../components/shared";
import { formatINR, getCompletedJobInvoiceState, getDueAmount, getLocalMonthKey, getPaidAmount, isActive, isCompletedStatus, todayISO, formatISTDate } from "../utils/appUtils";
import { isSuccessToast, useAutoHideMessage } from "../utils/toastUtils";
import { buildWhatsAppUrl, reminderMessage } from "../utils/whatsappUtils";
export function ReportsPage({ invoices, invoiceItems, usage, jobs = [], technicians = [], bookings = [], customers = [], inventory = [], coverages = [], leads = [], services = [], technicianParts = [], amcPlans = [], products = [], salesPersons = [], businessSettings = {}, initialFilter = "all", onUpdated }) {
  const [filter, setFilter] = useState(initialFilter || "all");
  const [dateRange, setDateRange] = useState({
    from: `${getLocalMonthKey()}-01`,
    to: todayISO(),
  });
  const [message, setMessage] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [invoiceBookingId, setInvoiceBookingId] = useState(null);
  useAutoHideMessage(message, setMessage);

  useEffect(() => {
    setFilter(initialFilter || "all");
  }, [initialFilter]);

  const inRange = (record) => {
    const raw = record?.invoice_date || record?.payment_date || record?.created_at || record?.follow_up_date || record?.date;
    if (!raw) return false;
    const day = String(raw).slice(0, 10);
    return day >= dateRange.from && day <= dateRange.to;
  };

  const monthInvoices = invoices.filter(inRange);
  const invoiceIds = new Set(monthInvoices.map((i) => String(i.id)));
  const monthUsage = usage.filter((u) => invoiceIds.has(String(u.invoice_id)));
  const monthBookings = bookings.filter(inRange);
  const rangeLeads = leads.filter(inRange);

  const total = monthInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const paid = monthInvoices.reduce((s, i) => s + getPaidAmount(i), 0);
  const pending = monthInvoices.reduce((s, i) => s + getDueAmount(i), 0);
  const cashTotal = monthInvoices.reduce((s, i) => s + Number(i.cash_amount || 0), 0);
  const upiTotal = monthInvoices.reduce((s, i) => s + Number(i.upi_amount || 0), 0);

  const partsMap = {};
  monthUsage.forEach((u) => {
    const key = u.part_name || "Part";
    if (!partsMap[key]) partsMap[key] = { qty: 0, value: 0 };
    partsMap[key].qty += Number(u.quantity || 0);
    partsMap[key].value += Number(u.billing_price || 0) * Number(u.quantity || 0);
  });

  const activeJobs = jobs.filter((j) => j.is_active !== false && j.assignment_status !== "reassigned");

  const techMap = {};
  activeJobs.forEach((job) => {
    const tech = technicians.find((t) => String(t.id) === String(job.technician_id));
    const key = tech?.name || "Unassigned";
    if (!techMap[key]) techMap[key] = { assigned: 0, completed: 0 };
    techMap[key].assigned += 1;
    if (isCompletedStatus(job.status)) techMap[key].completed += 1;
  });

  const serviceInvoices = monthInvoices.filter(i => !["amc", "new_sale"].includes(i.invoice_type));
  const amcInvoices = monthInvoices.filter(i => i.invoice_type === "amc");
  const saleInvoices = monthInvoices.filter(i => i.invoice_type === "new_sale");
  const pendingInvoices = monthInvoices.filter(i => getDueAmount(i) > 0);
  const serviceMap = {};
  serviceInvoices.forEach((invoice) => {
    const key = invoice.invoice_type || "service";
    if (!serviceMap[key]) serviceMap[key] = { count: 0, paid: 0, total: 0 };
    serviceMap[key].count += 1;
    serviceMap[key].paid += getPaidAmount(invoice);
    serviceMap[key].total += Number(invoice.total_amount || 0);
  });
  const leadSourceMap = {};
  rangeLeads.forEach((lead) => {
    const key = lead.source || "Manual";
    if (!leadSourceMap[key]) leadSourceMap[key] = { total: 0, converted: 0, lost: 0 };
    leadSourceMap[key].total += 1;
    if (lead.status === "Converted") leadSourceMap[key].converted += 1;
    if (lead.status === "Lost") leadSourceMap[key].lost += 1;
  });
  const lowStockItems = inventory.filter((p) => Number(p.stock_qty || 0) <= Number(p.low_stock_qty || 0));
  const dueReminders = coverages.filter((c) => c.next_service_due_date && String(c.next_service_due_date) <= todayISO() && isActive(c));
  const completedJobIds = new Set(
    invoices
      .filter((invoice) => invoice.booking_id && !["amc", "new_sale"].includes(invoice.invoice_type))
      .map((invoice) => String(invoice.booking_id))
  );
  const completedJobs = activeJobs.filter((j) => isCompletedStatus(j.status) || completedJobIds.has(String(j.booking_id)));

  const reportTitles = {
    all: "Full Monthly Report",
    new_sale: "Current Month New Sales",
    amc: "Current Month AMC Sales",
    collection: "Current Month Collection",
    pending: "Pending Payments",
    bookings: "Current Month Bookings",
    reminders: "Service Reminders Due",
    low_stock: "Low Stock Items",
    completed_jobs: "Completed Jobs",
    customers: "Customer Summary",
    leads: "Lead Source Report",
  };

  const activeTitle = reportTitles[filter] || "Monthly Report";

  function downloadCSV() {
    const headers = ["date", "customer", "mobile", "type", "total", "cash", "upi", "paid", "pending", "status"];
    const rows = monthInvoices.map((i) => [
      String(i.created_at || "").slice(0, 10),
      i.customer_name || "",
      i.mobile || "",
      i.invoice_type || "",
      Number(i.total_amount || 0),
      Number(i.cash_amount || 0),
      Number(i.upi_amount || 0),
      getPaidAmount(i),
      getDueAmount(i),
      i.payment_status || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aquabiz-report-${dateRange.from}-to-${dateRange.to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copySummary() {
    const text = [
      "AquaBiz Report",
      `Period: ${dateRange.from} to ${dateRange.to}`,
      `Collection: ${formatINR(paid)}`,
      `Cash: ${formatINR(cashTotal)}`,
      `UPI: ${formatINR(upiTotal)}`,
      `Pending: ${formatINR(pending)}`,
      `Invoices: ${monthInvoices.length}`,
      `Bookings: ${monthBookings.length}`,
      `Leads: ${rangeLeads.length}`,
    ].join("\n");
    await navigator.clipboard?.writeText(text);
    setMessage("Report summary copied.");
  }

  function openInvoiceDetail(invoice) {
    if (!invoice) return;
    const items = invoiceItems.filter((item) => String(item.invoice_id) === String(invoice.id));
    const booking = bookings.find((item) => String(item.id) === String(invoice.booking_id));
    setSelectedDetail({
      title: `Invoice: ${invoice.customer_name || "Customer"}`,
      subtitle: `${invoice.mobile || ""} | ${invoice.invoice_type || "invoice"}`,
      fields: [
        { label: "Total", value: formatINR(invoice.total_amount) },
        { label: "Paid", value: formatINR(getPaidAmount(invoice)) },
        { label: "Due", value: formatINR(getDueAmount(invoice)) },
        { label: "Status", value: invoice.payment_status },
        { label: "Method", value: invoice.payment_method },
        { label: "Booking", value: booking?.service_type || invoice.booking_id },
        { label: "Created", value: invoice.created_at ? formatISTDate(invoice.created_at) : "" },
        { label: "Invoice ID", value: invoice.id },
      ],
      lines: items.map((item) => `${item.item_name} x ${item.quantity} | Billing ${formatINR(item.billing_price)}`),
    });
  }

  function openBookingDetail(booking) {
    if (!booking) return;
    const job = jobs.find((item) => String(item.booking_id) === String(booking.id));
    const tech = technicians.find((item) => String(item.id) === String(job?.technician_id));
    const invoice = invoices.find((item) => String(item.booking_id) === String(booking.id));
    setSelectedDetail({
      title: `Booking: ${booking.customer_name || "Customer"}`,
      subtitle: `${booking.mobile || ""} | ${booking.service_type || "Service"}`,
      fields: [
        { label: "Amount", value: formatINR(booking.booking_amount) },
        { label: "Status", value: booking.booking_status || booking.status },
        { label: "Technician", value: tech?.name || "Not assigned" },
        { label: "Job Status", value: job?.status || "No job" },
        { label: "Invoice", value: invoice ? `${invoice.payment_status || ""} | Due ${formatINR(getDueAmount(invoice))}` : "Not generated" },
        { label: "Address", value: booking.address },
        { label: "Created", value: booking.created_at ? formatISTDate(booking.created_at) : "" },
        { label: "Booking ID", value: booking.id },
      ],
      lines: booking.complaint_notes ? [`Notes: ${booking.complaint_notes}`] : [],
    });
  }

  function openCustomerDetail(customer) {
    if (!customer) return;
    const customerBookings = bookings.filter((booking) => String(booking.mobile || "") === String(customer.mobile || ""));
    const customerInvoices = invoices.filter((invoice) => String(invoice.mobile || "") === String(customer.mobile || ""));
    setSelectedDetail({
      title: `Customer: ${customer.name || "Customer"}`,
      subtitle: customer.mobile || "",
      fields: [
        { label: "Address", value: customer.address },
        { label: "Bookings", value: customerBookings.length },
        { label: "Invoices", value: customerInvoices.length },
        { label: "Total Billing", value: formatINR(customerInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)) },
        { label: "Pending", value: formatINR(customerInvoices.reduce((sum, invoice) => sum + getDueAmount(invoice), 0)) },
        { label: "Customer ID", value: customer.id },
      ],
      lines: customerBookings.slice(0, 5).map((booking) => `${booking.service_type || "Booking"} | ${booking.created_at ? String(booking.created_at).slice(0, 10) : ""}`),
    });
  }

  function openJobDetail(job) {
    const booking = bookings.find((item) => String(item.id) === String(job?.booking_id));
    const tech = technicians.find((item) => String(item.id) === String(job?.technician_id));
    setSelectedDetail({
      title: `Job: ${booking?.customer_name || "Customer"}`,
      subtitle: `${booking?.mobile || ""} | ${job?.status || "Job"}`,
      fields: [
        { label: "Service", value: booking?.service_type },
        { label: "Technician", value: tech?.name || "Unknown" },
        { label: "Amount", value: formatINR(booking?.booking_amount) },
        { label: "Address", value: booking?.address },
        { label: "Completed", value: job?.completed_at ? formatISTDate(job.completed_at) : "" },
        { label: "Job ID", value: job?.id },
      ],
    });
  }

  return (
    <>
      <section className="page-head reports-page-head">
        <h2>{activeTitle}</h2>
        <p>Filtered report for selected date range.</p>
      </section>

      {message && <div className={isSuccessToast(message) ? "settings-toast success" : "settings-toast error"}>{message}</div>}

      <section className="panel reports-filter-panel">
        <div className="two-col">
          <div>
            <label className="field-label">From Date</label>
            <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
          </div>
          <div>
            <label className="field-label">To Date</label>
            <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
          </div>
        </div>
        <div className="two-col mt-sm">
          <div>
            <label className="field-label">Report Type</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Full Monthly Report</option>
              <option value="new_sale">New Sales</option>
              <option value="amc">AMC Sales</option>
              <option value="collection">Collection</option>
              <option value="pending">Pending Payments</option>
              <option value="bookings">Bookings</option>
              <option value="reminders">Service Reminders</option>
              <option value="low_stock">Low Stock</option>
              <option value="completed_jobs">Completed Jobs</option>
              <option value="customers">Customers</option>
              <option value="leads">Leads</option>
            </select>
          </div>
          <div className="row-actions">
            <button className="primary-btn small" type="button" onClick={downloadCSV}>Download CSV</button>
            <button className="ghost-btn small" type="button" onClick={() => window.print()}>Print Report</button>
            <button className="ghost-btn small" type="button" onClick={copySummary}>Copy Summary</button>
          </div>
        </div>
      </section>

      {(filter === "all" || filter === "collection") && (
        <section className="cards-grid reports-summary-grid">
          <StatCard icon="🧾" label="Invoices" value={monthInvoices.length} onClick={() => setFilter("all")} />
          <StatCard icon="💰" label="Total Billing" value={formatINR(total)} onClick={() => setFilter("all")} />
          <StatCard icon="✅" label="Paid" value={formatINR(paid)} onClick={() => setFilter("all")} />
          <StatCard icon="⏳" label="Pending" value={formatINR(pending)} onClick={() => setFilter("pending")} />
          <StatCard icon="💵" label="Cash" value={formatINR(cashTotal)} onClick={() => setFilter("collection")} />
          <StatCard icon="📱" label="UPI" value={formatINR(upiTotal)} onClick={() => setFilter("collection")} />
        </section>
      )}

      {(filter === "all" || filter === "new_sale" || filter === "amc") && (
        <section className="cards-grid reports-summary-grid">
          <StatCard icon="🛒" label="New RO Collection" value={formatINR(saleInvoices.reduce((s,i)=>s+getPaidAmount(i),0))} onClick={() => setFilter("new_sale")} />
          <StatCard icon="🛡️" label="AMC Collection" value={formatINR(amcInvoices.reduce((s,i)=>s+getPaidAmount(i),0))} onClick={() => setFilter("amc")} />
          <StatCard icon="🧰" label="Service Collection" value={formatINR(serviceInvoices.reduce((s,i)=>s+getPaidAmount(i),0))} onClick={() => setFilter("all")} />
          <StatCard icon="📦" label="Parts Items Used" value={Object.keys(partsMap).length} onClick={() => setFilter("all")} />
        </section>
      )}

      {filter === "new_sale" && (
        <ReportInvoiceList title="New RO Sales Invoices" invoices={saleInvoices} onOpen={openInvoiceDetail} />
      )}

      {filter === "amc" && (
        <ReportInvoiceList title="AMC Sales Invoices" invoices={amcInvoices} onOpen={openInvoiceDetail} />
      )}

      {filter === "pending" && (
        <ReportInvoiceList title="Pending Payment Invoices" invoices={pendingInvoices} onOpen={openInvoiceDetail} />
      )}

      {filter === "bookings" && (
        <section className="panel report-panel">
          <h3>Current Month Bookings</h3>
          {monthBookings.length === 0 ? <p className="muted">No bookings this month.</p> : monthBookings.map((b) => (
            <div className="booking-row clickable-row" key={b.id} role="button" tabIndex={0} onClick={() => openBookingDetail(b)} onKeyDown={(event) => { if (event.key === "Enter") openBookingDetail(b); }}>
              <div>
                <strong>{b.customer_name}</strong>
                <p>{b.mobile} • {b.service_type} • {formatINR(b.booking_amount)}</p>
              </div>
              <span className="status assigned">{formatISTDate(b.created_at)}</span>
            </div>
          ))}
        </section>
      )}

      {filter === "reminders" && (
        <section className="panel report-panel">
          <h3>Service Reminders Due</h3>
          {dueReminders.length === 0 ? <p className="muted">No reminders due.</p> : dueReminders.map((r) => (
            <div className="booking-row" key={r.id}>
              <div>
                <strong>{r.customer_name}</strong>
                <p>{r.mobile} • Due: {r.next_service_due_date} • Expiry: {r.expiry_date}</p>
              </div>
              <div className="row-actions">
                <a className="ghost-btn small" href={`tel:${r.mobile}`}>Call</a>
                <a className="ghost-btn small" href={buildWhatsAppUrl(r.mobile, reminderMessage({ ...r, label: "Service Reminder", due_date: r.next_service_due_date }))} target="_blank" rel="noreferrer">WA</a>
              </div>
            </div>
          ))}
        </section>
      )}

      {filter === "low_stock" && (
        <section className="panel report-panel">
          <h3>Low Stock Items</h3>
          {lowStockItems.length === 0 ? <p className="muted">No low stock items.</p> : lowStockItems.map((p) => (
            <div className="booking-row" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <p>{p.category_name} • Stock: {p.stock_qty} • Low Alert: {p.low_stock_qty}</p>
              </div>
              <span className="status unassigned">Low</span>
            </div>
          ))}
        </section>
      )}

      {filter === "completed_jobs" && (
        <section className="panel report-panel">
          <h3>Completed Jobs</h3>
          {completedJobs.length === 0 ? <p className="muted">No completed jobs.</p> : completedJobs.map((job) => {
            const tech = technicians.find((t) => String(t.id) === String(job.technician_id));
            const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
            const invoiceState = getCompletedJobInvoiceState(job, invoices, booking);
            return (
              <div className="booking-row clickable-row" key={job.id} role="button" tabIndex={0} onClick={() => openJobDetail(job)} onKeyDown={(event) => { if (event.key === "Enter") openJobDetail(job); }}>
                <div>
                  <strong>{booking?.customer_name || "Customer"}</strong>
                  <p>{booking?.mobile} • Technician: {tech?.name || "Unknown"}</p>
                  <span className={invoiceState.hasInvoice ? "status assigned" : invoiceState.invoiceWaived ? "status progress" : "status unassigned"}>{invoiceState.badge}</span>
                </div>
                <div className="row-actions">
                  <span className="status assigned">Completed</span>
                  {invoiceState.isInvoicePending && booking && (
                    <button
                      className="primary-btn small"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setInvoiceJobId(job.id);
                        setInvoiceBookingId(booking.id);
                      }}
                    >
                      Create Invoice
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {filter === "customers" && (
        <section className="panel report-panel">
          <h3>Customers</h3>
          {customers.length === 0 ? <p className="muted">No customers.</p> : customers.map((c) => (
            <div className="booking-row clickable-row" key={c.id} role="button" tabIndex={0} onClick={() => openCustomerDetail(c)} onKeyDown={(event) => { if (event.key === "Enter") openCustomerDetail(c); }}>
              <div>
                <strong>{c.name}</strong>
                <p>{c.mobile} • {c.address}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {filter === "leads" && (
        <section className="panel report-panel">
          <h3>Lead Source Report</h3>
          {Object.keys(leadSourceMap).length === 0 ? <p className="muted">No leads found.</p> : Object.entries(leadSourceMap).map(([source, value]) => (
            <div className="booking-row" key={source}>
              <div>
                <strong>{source}</strong>
                <p>Total: {value.total} | Converted: {value.converted} | Lost: {value.lost}</p>
              </div>
              <span className="status assigned">{value.total ? Math.round((value.converted / value.total) * 100) : 0}%</span>
            </div>
          ))}
        </section>
      )}

      {(filter === "all" || filter === "collection") && (
        <section className="panel report-panel">
          <h3>All Invoices</h3>
          {monthInvoices.map((i) => (
            <div className="mini-line clickable-row" key={i.id} role="button" tabIndex={0} onClick={() => openInvoiceDetail(i)} onKeyDown={(event) => { if (event.key === "Enter") openInvoiceDetail(i); }}>
              {i.customer_name} — {i.invoice_type} — {formatINR(i.total_amount)} — Paid {formatINR(i.paid_amount)} — Due {formatINR(i.due_amount)}
            </div>
          ))}
        </section>
      )}

      {filter === "all" && (
        <>
        <section className="panel report-panel">
            <h3>Parts Used Item-wise</h3>
            {Object.keys(partsMap).length === 0 ? <p className="muted">No parts used this month.</p> : Object.entries(partsMap).map(([name, v]) => (
              <div className="booking-row" key={name}>
                <strong>{name}</strong>
                <p>Qty: {v.qty} | Billing: {formatINR(v.value)}</p>
              </div>
            ))}
          </section>

          <section className="panel report-panel">
            <h3>Technician Performance</h3>
            {Object.keys(techMap).length === 0 ? <p className="muted">No technician data.</p> : Object.entries(techMap).map(([name, v]) => (
              <div className="booking-row" key={name}>
                <strong>{name}</strong>
                <p>Assigned: {v.assigned} | Completed: {v.completed}</p>
              </div>
            ))}
          </section>

          <section className="panel report-panel">
            <h3>Service-wise Revenue</h3>
            {Object.keys(serviceMap).length === 0 ? <p className="muted">No service revenue.</p> : Object.entries(serviceMap).map(([name, value]) => (
              <div className="booking-row" key={name}>
                <strong>{name}</strong>
                <p>Invoices: {value.count} | Billing: {formatINR(value.total)} | Collection: {formatINR(value.paid)}</p>
              </div>
            ))}
          </section>
        </>
      )}

      <DetailDrawer
        title={selectedDetail?.title || ""}
        subtitle={selectedDetail?.subtitle || ""}
        fields={selectedDetail?.fields || []}
        onClose={() => setSelectedDetail(null)}
      >
        {selectedDetail?.lines?.length > 0 && (
          <section className="sub-panel">
            <h3>Linked Details</h3>
            {selectedDetail.lines.map((line, index) => (
              <div className="mini-line" key={`${line}-${index}`}>{line}</div>
            ))}
          </section>
        )}
      </DetailDrawer>

      {invoiceJobId && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div style={{ background: "transparent", maxHeight: "100%", overflowY: "auto", width: "100%", maxWidth: "800px" }}>
            <InvoiceBuilder
              job={jobs.find(j => j.id === invoiceJobId)}
              booking={bookings.find(b => b.id === invoiceBookingId)}
              services={services}
              inventory={inventory}
              technicianParts={technicianParts}
              coverages={coverages}
              invoices={invoices}
              amcPlans={amcPlans}
              products={products}
              salesPersons={salesPersons}
              businessSettings={businessSettings}
              closedBy={{ id: null, name: "Admin", role: "Admin" }}
              onClose={() => { setInvoiceJobId(null); setInvoiceBookingId(null); }}
              onDone={async () => {
                setInvoiceJobId(null);
                setInvoiceBookingId(null);
                await onUpdated?.();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function ReportInvoiceList({ title, invoices, onOpen }) {
  return (
          <section className="panel report-panel">
      <h3>{title}</h3>
      {invoices.length === 0 ? <p className="muted">No data found.</p> : invoices.map((i) => (
        <div className="booking-row clickable-row" key={i.id} role="button" tabIndex={0} onClick={() => onOpen?.(i)} onKeyDown={(event) => { if (event.key === "Enter") onOpen?.(i); }}>
          <div>
            <strong>{i.customer_name}</strong>
            <p>{i.mobile} • {i.invoice_type} • {formatISTDate(i.created_at)}</p>
          </div>
          <div>
            <strong>{formatINR(i.total_amount)}</strong>
            <p className={Number(i.due_amount || 0) > 0 ? "danger-line" : "success-line"}>
              Due: {formatINR(i.due_amount)}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
