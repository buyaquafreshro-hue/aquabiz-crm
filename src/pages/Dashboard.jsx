import { useState } from "react";
import { InvoiceBuilder } from "../components/InvoiceBuilder";
import { StatCard } from "../components/shared";
import { getText } from "../constants/text";
import { formatINR, isActive, todayISO } from "../utils/appUtils";
import { buildWhatsAppUrl, reminderMessage } from "../utils/whatsappUtils";
export function Dashboard({ stats, bookings, jobs, technicians, technicianParts = [], inventory, coverages, invoices, amcPlans, products, salesPersons = [], businessSettings, leads = [], dataErrors = [], onUpdated, setPage, setReportFilter, language }) {
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [openBookingId, setOpenBookingId] = useState(null);
  const recent = bookings.slice(0, 5);
  const coverageReminders = coverages
    .filter((c) => c.next_service_due_date && String(c.next_service_due_date) <= todayISO() && isActive(c))
    .map((c) => ({ ...c, reminder_type: "Service", due_date: c.next_service_due_date }));
  const emiReminders = bookings
    .filter((b) => b.payment_option === "emi" && b.emi_next_due_date && String(b.emi_next_due_date) <= todayISO())
    .map((b) => ({ id: `emi-${b.id}`, customer_name: b.customer_name, mobile: b.mobile, reminder_type: "EMI", due_date: b.emi_next_due_date }));
  const reminders = [...coverageReminders, ...emiReminders].slice(0, 5);
  const t = getText(language);

  function openReport(filter) {
    setReportFilter(filter);
    setPage("reports");
  }

  return (
    <>
      <section className="premium-hero dashboard-overview-head">
        <div>
          <h2>Service Overview</h2>
          <p>Manage your daily service pipeline and financials.</p>
        </div>
        <button className="hero-btn" onClick={() => setPage("booking")}>
          New Booking
        </button>
      </section>

      <section className="summary-strip">
        <button onClick={() => openReport("collection")}>
          <span>Current Month Collection ({stats.month})</span>
          <strong>{formatINR(stats.totalCollection)}</strong>
        </button>
        <button onClick={() => openReport("collection")}>
          <span>Last Month Collection ({stats.lastMonth})</span>
          <strong>{formatINR(stats.lastMonthCollection)}</strong>
        </button>
        <button onClick={() => setPage("collections")}>
          <span>{t.pending}</span>
          <strong>{formatINR(stats.pending)}</strong>
        </button>
        <button onClick={() => setPage("customers")}>
          <span>{t.customers}</span>
          <strong>{stats.customers}</strong>
        </button>
      </section>

      {dataErrors.length > 0 && (
        <section className="error-box dashboard-warning">
          Data load issue found: {dataErrors.slice(0, 3).join(" | ")}
        </section>
      )}

      {invoices.length === 0 && jobs.some((job) => job.status === "Completed") && (
        <section className="error-box dashboard-warning">
          Completed jobs found, but invoices table returned 0 records. Run the Supabase SQL policies again, then refresh.
        </section>
      )}

      <section className="premium-grid">
        <StatCard icon="🛒" label={t.newSales} value={formatINR(stats.currentMonthSales)} onClick={() => openReport("new_sale")} />
        <StatCard icon="🛡️" label={t.amcSales} value={formatINR(stats.currentMonthAmc)} onClick={() => openReport("amc")} />
        <StatCard icon="I" label="Invoices" value={invoices.length} onClick={() => setPage("invoices")} />
        <StatCard icon="L" label="Leads" value={leads.length} onClick={() => setPage("leads")} />
        <StatCard icon="📋" label={t.bookings} value={stats.totalBookings} onClick={() => openReport("bookings")} />
        <StatCard icon="J" label="Total Jobs" value={stats.totalJobs} onClick={() => setPage("jobs")} />
        <StatCard icon="O" label="Open Jobs" value={stats.openJobs} onClick={() => setPage("openJobs")} />
        <StatCard icon="🔔" label={t.reminders} value={stats.remindersDue} onClick={() => setPage("reminders")} />
        <StatCard icon="⚠️" label={t.lowStock} value={stats.lowStock} onClick={() => openReport("low_stock")} />
        <StatCard icon="👨‍🔧" label={t.completedJobs} value={stats.completedJobs} onClick={() => setPage("completedJobs")} />
      </section>

      <section className="action-panel">
        <div className="section-head">
          <div>
            <h3>{t.quickActions}</h3>
            <p>{t.shortcuts}</p>
          </div>
        </div>
        <div className="action-grid">
          <button onClick={() => setPage("booking")}>{t.newBooking}</button>
          <button onClick={() => setPage("leads")}>Leads</button>
          <button onClick={() => setPage("sale")}>{t.amcNewSale}</button>
          <button onClick={() => setPage("collections")}>Collections</button>
          <button onClick={() => setPage("reminders")}>Reminders</button>
          <button onClick={() => setPage("openJobs")}>Open Jobs</button>
          <button onClick={() => setPage("completedJobs")}>Completed Jobs</button>
          <button onClick={() => setPage("plans")}>{t.plansProducts}</button>
          <button onClick={() => setPage("inventory")}>{t.inventory}</button>
          <button onClick={() => setPage("technicianParts")}>Technician Parts</button>
          <button onClick={() => setPage("reports")}>{t.reports}</button>
          <button onClick={() => setPage("business")}>{t.businessSettings}</button>
          <button onClick={() => setPage("customers")}>Customers</button>
          <button onClick={() => setPage("customerHistory")}>{t.customerHistory}</button>
          <button onClick={() => setPage("technician")}>{t.technicianApp}</button>
        </div>
      </section>

      <section className="dashboard-columns">
        <section className="panel premium-panel">
          <div className="section-head">
            <div>
              <h3>{t.serviceReminders}</h3>
              <p>{t.dueOverdue}</p>
            </div>
            <button className="link-btn" onClick={() => setPage("reminders")}>{t.view}</button>
          </div>

          {reminders.length === 0 ? (
            <div className="empty-state">
              <strong>{t.noReminders}</strong>
              <p>{t.remindersEmpty}</p>
            </div>
          ) : (
            reminders.map((r) => (
              <div className="premium-list-row" key={r.id}>
                <div>
                  <strong>{r.customer_name}</strong>
                  <p>{r.mobile} • {r.reminder_type} Due: {r.due_date}</p>
                </div>
                <div className="row-actions">
                  <a className="ghost-btn small" href={`tel:${r.mobile}`}>Call</a>
                  <a className="ghost-btn small" href={buildWhatsAppUrl(r.mobile, reminderMessage({ ...r, label: r.reminder_type }, businessSettings))} target="_blank" rel="noreferrer">WA</a>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="panel premium-panel">
          <div className="section-head">
            <div>
              <h3>{t.recentBookings}</h3>
              <p>{t.latestRequests}</p>
            </div>
            <button className="link-btn" onClick={() => setPage("jobs")}>{t.allJobs}</button>
          </div>

          {recent.length === 0 ? (
            <div className="empty-state">
              <strong>{t.noBookings}</strong>
              <p>New bookings will appear here.</p>
            </div>
          ) : (
            recent.map((b) => {
              const job = jobs.find((j) => String(j.booking_id) === String(b.id));
              const hasInvoice = invoices.some((i) => String(i.booking_id) === String(b.id));
              const isOpen = String(openBookingId) === String(b.id);
              return (
                <div className="premium-booking-card" key={b.id}>
                  <button
                    className="booking-card-head compact-click"
                    type="button"
                    onClick={() => setOpenBookingId(isOpen ? null : b.id)}
                  >
                    <div>
                      <strong>{b.customer_name}</strong>
                      <p>{isOpen ? "Hide details" : "Click to view details"}</p>
                    </div>
                    <span className={job ? "status assigned" : "status unassigned"}>
                      {job ? job.status : "Unassigned"}
                    </span>
                  </button>
                  {isOpen && (
                    <>
                      <p>{b.mobile}</p>
                      {b.address && <p className="muted">Address: {b.address}</p>}
                  <p>{b.service_type} • {formatINR(b.booking_amount)}</p>
                  {b.complaint_notes && <p className="muted">Notes: {b.complaint_notes}</p>}
                  <div className="row-actions">
                    {!job && <button className="ghost-btn small" onClick={() => setPage("jobs")}>Assign</button>}
                    {job && !hasInvoice && (
                      <button className="primary-btn small" onClick={() => setInvoiceJobId(invoiceJobId === job.id ? null : job.id)}>
                        Invoice
                      </button>
                    )}
                    {hasInvoice && <span className="status assigned">Invoice Generated</span>}
                  </div>

                  {invoiceJobId === job?.id && (
                    <InvoiceBuilder
                      job={job}
                      booking={b}
                      inventory={inventory}
                      technicianParts={technicianParts}
                      coverages={coverages}
                      invoices={invoices}
                      amcPlans={amcPlans}
                      products={products}
                      salesPersons={salesPersons}
                      businessSettings={businessSettings}
                      onClose={() => setInvoiceJobId(null)}
                      onDone={async () => {
                        setInvoiceJobId(null);
                        await onUpdated();
                      }}
                    />
                  )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </section>
      </section>
    </>
  );
}
