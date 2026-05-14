import React, { useState } from "react";
import { InvoiceBuilder } from "../components/InvoiceBuilder";
import { StatCard } from "../components/shared";
import { getText } from "../constants/text";
import { formatINR, isActive, todayISO } from "../utils/appUtils";
import { buildWhatsAppUrl, reminderMessage } from "../utils/whatsappUtils";
export function Dashboard({ stats, services = [], bookings, jobs, technicians, telecallers = [], technicianParts = [], inventory, coverages, invoices, amcPlans, products, salesPersons = [], businessSettings, leads = [], dataErrors = [], onUpdated, setPage, setReportFilter, language }) {
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [invoiceBookingId, setInvoiceBookingId] = useState(null);
  const [jobFilter, setJobFilter] = useState("all");

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

  const isCompletedStatus = (s) => ["completed", "complete", "closed", "done"].includes(String(s || "").toLowerCase());
  const isClosedJobStatus = (s) => isCompletedStatus(s) || ["cancelled", "canceled"].includes(String(s || "").toLowerCase());



  return (
    <>
      <section className="premium-hero">
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
        <StatCard icon="🧾" label="Invoices" value={invoices.length} onClick={() => setPage("invoices")} />
        <StatCard icon="🎯" label="Leads" value={leads.length} onClick={() => setPage("leads")} />
        <StatCard icon="🔧" label="Jobs Pipeline" value={stats.totalJobs} onClick={() => setPage("jobsPipeline")} />
        <StatCard icon="🔔" label={t.reminders} value={stats.remindersDue} onClick={() => setPage("reminders")} />
        <StatCard icon="⚠️" label={t.lowStock} value={stats.lowStock} onClick={() => openReport("low_stock")} />
      </section>

      <section className="action-panel">
        <div className="section-head">
          <div>
            <h3>{t.quickActions}</h3>
            <p>{t.shortcuts}</p>
          </div>
        </div>
        <div className="action-grid">
          <button onClick={() => setPage("leads")}>Leads</button>
          <button onClick={() => setPage("sale")}>{t.amcNewSale}</button>
          <button onClick={() => setPage("collections")}>Collections</button>
          <button onClick={() => setPage("reminders")}>Reminders</button>
          <button onClick={() => setPage("jobsPipeline")}>Jobs Pipeline</button>
          <button onClick={() => setPage("plans")}>{t.plansProducts}</button>
          <button onClick={() => setPage("inventory")}>{t.inventory}</button>
          <button onClick={() => setPage("technicianParts")}>Technician Parts</button>
          <button onClick={() => setPage("reports")}>{t.reports}</button>
          <button onClick={() => setPage("business")}>{t.businessSettings}</button>
          <button onClick={() => setPage("customers")}>Customers</button>
          <button onClick={() => setPage("customerHistory")}>{t.customerHistory}</button>
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
      </section>

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
              onClose={() => { setInvoiceJobId(null); setInvoiceBookingId(null); }}
              onDone={async () => {
                setInvoiceJobId(null);
                setInvoiceBookingId(null);
                await onUpdated();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
