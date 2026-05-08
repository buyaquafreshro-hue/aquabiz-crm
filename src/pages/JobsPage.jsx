import { useState } from "react";
import { InvoiceBuilder } from "../components/InvoiceBuilder";
import { BookingMini } from "../components/shared";
import { completeJobWithInvoice, reassignTechnician, saveJobAssignment } from "../services/jobAssignments";
import { supabase } from "../supabaseClient";
import { formatINR, getBookingPriority, getCustomerCoverageStatus } from "../utils/appUtils";
import { getCompletionTime, isOpenJobStatus, isRecentCompletedJob } from "../utils/roleDashboard";
import { isSuccessToast, useAutoHideMessage } from "../utils/toastUtils";
import { buildWhatsAppUrl, closeOtpMessage } from "../utils/whatsappUtils";

function priorityClass(priority) {
  return priority === "Critical" || priority === "High" ? "urgent" : "";
}

function jobTone(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("progress")) return "progress";
  if (value.includes("completed")) return "done";
  if (value.includes("assigned")) return "assigned";
  return "open";
}

function JobMeta({ booking }) {
  return (
    <div className="dispatch-meta">
      <div><span>Location</span><strong>{booking?.address || "Address not added"}</strong></div>
      <div><span>Service</span><strong>{booking?.service_type || "Service"}</strong></div>
      <div><span>Amount</span><strong>{formatINR(booking?.booking_amount)}</strong></div>
    </div>
  );
}

export function JobsPage({ bookings, jobs, technicians, technicianParts = [], inventory, coverages, invoices, amcPlans, products, services = [], salesPersons = [], businessSettings, onUpdated, setPage }) {
  const [selectedTech, setSelectedTech] = useState({});
  const [reassignTech, setReassignTech] = useState({});
  const [reassignJobId, setReassignJobId] = useState(null);
  const [completionJobId, setCompletionJobId] = useState(null);
  const [completionInvoiceType, setCompletionInvoiceType] = useState("service");
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [invoiceBookingId, setInvoiceBookingId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [tab, setTab] = useState("all");
  const [message, setMessage] = useState("");
  useAutoHideMessage(message, setMessage);
  const activeJobs = jobs.filter((job) => job.is_active !== false && job.assignment_status !== "reassigned");
  const assignedBookingIds = new Set(activeJobs.map((j) => String(j.booking_id)));
  const unassignedBookings = bookings.filter((b) => !assignedBookingIds.has(String(b.id)) && isOpenJobStatus(b.status || b.job_status || b.booking_status || ""));
  const openJobs = activeJobs.filter((job) => isOpenJobStatus(job.status));

  const dispatchRows = [
    ...unassignedBookings.map((booking) => ({ type: "unassigned", booking, job: null, tech: null })),
    ...openJobs.map((job) => {
      const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
      const tech = technicians.find((t) => String(t.id) === String(job.technician_id));
      return { type: "assigned", booking, job, tech };
    }).filter((row) => row.booking),
  ];

  const visibleRows = dispatchRows.filter((row) => {
    if (tab === "unassigned") return row.type === "unassigned";
    if (tab === "assigned") return row.type === "assigned";
    if (tab === "completed") return false;
    return true;
  });

  async function assignJob(bookingId) {
    const technicianId = selectedTech[bookingId];
    if (!technicianId) return setMessage("Please select technician.");
    const { error } = await saveJobAssignment(bookingId, technicianId);
    if (error) return setMessage(error.message);
    setMessage("Job assigned.");
    await onUpdated();
  }

  async function confirmReassign(job) {
    const technicianId = reassignTech[job.id];
    if (!technicianId) return setMessage("Please select technician.");
    const { error } = await reassignTechnician({ bookingId: job.booking_id, job, newTechnicianId: technicianId });
    if (error) return setMessage(error.message);
    setReassignJobId(null);
    setReassignTech({ ...reassignTech, [job.id]: "" });
    setMessage("Technician re-assigned.");
    await onUpdated();
  }

  async function completeWithExistingInvoice(job) {
    const invoice = invoices.find((i) => String(i.booking_id) === String(job.booking_id));
    if (!invoice?.id) {
      setMessage("Invoice is required before closing the job.");
      return;
    }
    const { error } = await completeJobWithInvoice({ bookingId: job.booking_id, jobId: job.id, invoiceId: invoice.id });
    if (error) return setMessage(error.message);
    setMessage("Job completed.");
    await onUpdated();
  }

  function openCompletion(job, type = "service") {
    const status = String(job.status || "").trim().toLowerCase();
    if (["completed", "complete", "closed", "done", "cancelled", "canceled"].includes(status)) {
      setMessage("Completed or cancelled jobs cannot be completed again.");
      return;
    }
    setCompletionInvoiceType(type);
    setCompletionJobId(job.id);
    setInvoiceJobId(null);
    setInvoiceBookingId(null);
  }

  async function updateStatus(job, status) {
    const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
    if (status === "Completed" && booking?.close_otp) {
      const entered = window.prompt("Enter customer OTP to close this job");
      if (String(entered || "").trim() !== String(booking.close_otp)) {
        setMessage("Wrong OTP. Job not closed.");
        return;
      }
      await supabase.from("bookings").update({ close_otp_verified: true }).eq("id", booking.id);
    }

    if (status === "Completed") {
      const hasInvoice = invoices.some((i) => String(i.booking_id) === String(job.booking_id));
      if (hasInvoice) return completeWithExistingInvoice(job);
      openCompletion(job);
      return;
    }

    const payload = { status };
    const { error } = await supabase.from("job_assignments").update(payload).eq("id", job.id);
    if (error) return setMessage(error.message);
    setMessage(status === "Completed" ? "Job completed." : "Job updated.");
    await onUpdated();
  }

  return (
    <>
      <section className="jobs-dispatch-head">
        <div>
          <p>Service Operations</p>
          <h2>Jobs Dispatch</h2>
        </div>
        <button className="primary-btn" onClick={() => setPage?.("booking")}>New Booking</button>
      </section>

      <section className="jobs-tabs">
        <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All Jobs ({dispatchRows.length})</button>
        <button className={tab === "unassigned" ? "active" : ""} onClick={() => setTab("unassigned")}>Unassigned ({unassignedBookings.length})</button>
        <button className={tab === "assigned" ? "active" : ""} onClick={() => setTab("assigned")}>Assigned ({openJobs.length})</button>
        <button className={tab === "completed" ? "active" : ""} onClick={() => setTab("completed")}>Completed (48h)</button>
      </section>

      {message && <div className={isSuccessToast(message) ? "settings-toast success" : "settings-toast error"}>{message}</div>}

      <section className="jobs-grid">
        {visibleRows.map(({ type, booking, job, tech }) => {
          const priority = getBookingPriority(booking);
          const coverageStatus = getCustomerCoverageStatus(booking?.mobile, coverages);
          const hasInvoice = invoices.some((i) => String(i.booking_id) === String(booking.id));
          const isOpen = String(openId) === String(job?.id || booking.id);
          const key = job?.id || booking.id;

          return (
            <article className={`dispatch-card ${type} ${jobTone(job?.status)} ${priorityClass(priority)}`} key={key}>
              <div className="dispatch-card-top">
                <div>
                  <div className="dispatch-customer">
                    <span>C</span>
                    <h3>{booking.customer_name}</h3>
                  </div>
                  <p>{booking.service_type}</p>
                </div>
                <span className={`dispatch-pill ${priorityClass(priority)}`}>{type === "unassigned" ? priority : job.status}</span>
              </div>

              <JobMeta booking={booking} />

              <div className="dispatch-tags">
                <span>{coverageStatus}</span>
                <span>{booking.mobile}</span>
              </div>

              {type === "unassigned" ? (
                <div className="dispatch-actions">
                  <select value={selectedTech[booking.id] || ""} onChange={(e) => setSelectedTech({ ...selectedTech, [booking.id]: e.target.value })}>
                    <option value="">Select Technician</option>
                    {technicians.filter((t) => t.is_active !== false).map((t) => <option value={t.id} key={t.id}>{t.name} ({t.mobile})</option>)}
                  </select>
                  <button className="primary-btn" onClick={() => assignJob(booking.id)}>Assign Technician</button>
                  {!hasInvoice && (
                    <button
                      className="ghost-btn"
                      onClick={() => {
                        setOpenId(key);
                        setInvoiceBookingId(invoiceBookingId === booking.id ? null : booking.id);
                        setInvoiceJobId(null);
                        setCompletionJobId(null);
                      }}
                    >
                      Generate Invoice
                    </button>
                  )}
                  {hasInvoice && <span className="status assigned">Invoice Generated</span>}
                </div>
              ) : (
                <div className="dispatch-tech-row">
                  <div className="dispatch-avatar">{String(tech?.name || "T").slice(0, 1).toUpperCase()}</div>
                  <div>
                    <span>Assigned To</span>
                    <strong>{tech?.name || "Unknown technician"}</strong>
                  </div>
                  <button className="link-btn" onClick={() => setOpenId(isOpen ? null : key)}>{isOpen ? "Hide" : "Details"}</button>
                </div>
              )}

              {type === "unassigned" && (
                <button className="ghost-btn" onClick={() => setOpenId(isOpen ? null : key)}>{isOpen ? "Hide Details" : "View Details"}</button>
              )}

              {isOpen && (
                <section className="dispatch-detail">
                  <BookingMini booking={booking} />
                  {booking.close_otp && (
                    <a className="ghost-btn small" href={buildWhatsAppUrl(booking.mobile, closeOtpMessage(booking, businessSettings))} target="_blank" rel="noreferrer">Send Close OTP</a>
                  )}

                  {type === "unassigned" && invoiceBookingId === booking.id && (
                    <InvoiceBuilder
                      booking={booking}
                      services={services}
                      inventory={inventory}
                      technicianParts={technicianParts}
                      coverages={coverages}
                      invoices={invoices}
                      amcPlans={amcPlans}
                      products={products}
                      salesPersons={salesPersons}
                      businessSettings={businessSettings}
                      onClose={() => setInvoiceBookingId(null)}
                      onDone={async () => {
                        setInvoiceBookingId(null);
                        await onUpdated();
                      }}
                    />
                  )}

                  {job && (
                    <>
                      <div className="row-actions">
                        {["Assigned", "In Progress"].map((s) => <button key={s} className="ghost-btn small" onClick={() => updateStatus(job, s)}>{s}</button>)}
                        <button className="primary-btn small" onClick={() => updateStatus(job, "Completed")}>Complete Job</button>
                        <button className="ghost-btn small" onClick={() => setReassignJobId(reassignJobId === job.id ? null : job.id)}>Re-assign Technician</button>
                        {!hasInvoice && <button className="primary-btn small" onClick={() => setInvoiceJobId(invoiceJobId === job.id ? null : job.id)}>Generate Invoice</button>}
                        {hasInvoice && <span className="status assigned">Invoice Generated</span>}
                      </div>
                      {reassignJobId === job.id && (
                        <div className="sub-panel">
                          <h3>Re-assign Technician</h3>
                          <select value={reassignTech[job.id] || ""} onChange={(e) => setReassignTech({ ...reassignTech, [job.id]: e.target.value })}>
                            <option value="">Select new technician</option>
                            {technicians.filter((t) => t.is_active !== false && String(t.id) !== String(job.technician_id)).map((t) => <option value={t.id} key={t.id}>{t.name} ({t.mobile})</option>)}
                          </select>
                          <div className="row-actions">
                            <button className="primary-btn small" onClick={() => confirmReassign(job)}>Confirm Re-assign</button>
                            <button className="ghost-btn small" onClick={() => setReassignJobId(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                      {completionJobId === job.id && (
                        <div className="sub-panel">
                          <h3>Generate invoice for this job?</h3>
                          <BookingMini booking={booking} />
                          <p className="muted">Job was not closed yet. Generate an invoice first, then the job will be completed.</p>
                          <div className="row-actions">
                            <button className="primary-btn small" onClick={() => setCompletionInvoiceType("service")}>Generate Invoice</button>
                            <button className="ghost-btn small" onClick={() => setCompletionInvoiceType("zero")}>Generate ₹0 Invoice</button>
                            <button className="ghost-btn small" onClick={() => { setCompletionJobId(null); setMessage("Job was not closed because invoice was not generated."); }}>Cancel</button>
                          </div>
                          <InvoiceBuilder key={`${job.id}-${completionInvoiceType}`} job={job} booking={booking} services={services} inventory={inventory} technicianParts={technicianParts} coverages={coverages} invoices={invoices}
                            amcPlans={amcPlans}
                            products={products} salesPersons={salesPersons} businessSettings={businessSettings} defaultInvoiceType={completionInvoiceType} completionMode onClose={() => setCompletionJobId(null)} onDone={async () => { setCompletionJobId(null); await onUpdated(); }} />
                        </div>
                      )}
                      {invoiceJobId === job.id && (
                        <InvoiceBuilder job={job} booking={booking} services={services} inventory={inventory} technicianParts={technicianParts} coverages={coverages} invoices={invoices}
                          amcPlans={amcPlans}
                          products={products} salesPersons={salesPersons} businessSettings={businessSettings} onClose={() => setInvoiceJobId(null)} onDone={async () => { setInvoiceJobId(null); await onUpdated(); }} />
                      )}
                    </>
                  )}
                </section>
              )}
            </article>
          );
        })}

        <button className="dispatch-create-card" onClick={() => setPage?.("booking")}>
          <span>+</span>
          <strong>Create New Job</strong>
          <p>Manually enter a customer booking request</p>
        </button>
      </section>
    </>
  );
}

export function JobListPage({ title, type, bookings, jobs, technicians, coverages, setPage }) {
  const [search, setSearch] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [priority, setPriority] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [openId, setOpenId] = useState(null);

  const rows = jobs
    .filter((job) => job.is_active !== false)
    .map((job) => {
      const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
      const technician = technicians.find((t) => String(t.id) === String(job.technician_id));
      const coverageStatus = getCustomerCoverageStatus(booking?.mobile, coverages);
      const currentPriority = getBookingPriority(booking);
      return { job, booking, technician, coverageStatus, currentPriority };
    })
    .filter((row) => row.booking);

  const typeRows = rows.filter(({ job, booking }) => (
    type === "completed" ? isRecentCompletedJob(job, booking) : isOpenJobStatus(job.status)
  ));

  const q = search.trim().toLowerCase();
  const filtered = typeRows.filter(({ booking, technician, coverageStatus, currentPriority }) => {
    const text = `${booking.customer_name || ""} ${booking.mobile || ""} ${booking.address || ""} ${booking.service_type || ""} ${technician?.name || ""}`.toLowerCase();
    if (q && !text.includes(q)) return false;
    if (technicianId && String(technician?.id) !== String(technicianId)) return false;
    if (priority && currentPriority !== priority) return false;
    if (customerType && coverageStatus !== customerType) return false;
    return true;
  });

  return (
    <>
      <section className="page-head">
        <h2>{title}</h2>
        <p>{type === "completed" ? "Completed jobs are visible here for 48 hours only. Older jobs can be checked from Customer History." : "Search and filter open jobs by customer, technician, priority, and warranty/AMC status."}</p>
      </section>

      <section className="panel">
        <div className="form-stack">
          <input placeholder="Search by customer, mobile, address, service, technician" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="two-col">
            <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
              <option value="">All technicians</option>
              {technicians.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All priorities</option>
              {["Normal", "Medium", "High", "Critical"].map((p) => <option value={p} key={p}>{p}</option>)}
            </select>
          </div>
          <select value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
            <option value="">All customer types</option>
            {["Under AMC", "Under Warranty", "Out of Warranty", "New Customer", "Under Coverage"].map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
        </div>
      </section>

      <section className="jobs-grid">
        {filtered.length === 0 ? <p className="muted">No jobs found.</p> : filtered.map(({ job, booking, technician, coverageStatus, currentPriority }) => {
          const isOpen = String(openId) === String(job.id);

          return (
            <article className={`dispatch-card assigned ${jobTone(job.status)} ${priorityClass(currentPriority)}`} key={job.id}>
              <div className="dispatch-card-top">
                <div>
                  <div className="dispatch-customer">
                    <span>C</span>
                    <h3>{booking.customer_name}</h3>
                  </div>
                  <p>{booking.service_type}</p>
                </div>
                <span className={`dispatch-pill ${priorityClass(currentPriority)}`}>{type === "completed" ? "Completed" : currentPriority}</span>
              </div>
              <JobMeta booking={booking} />
              <div className="dispatch-tags">
                <span>{coverageStatus}</span>
                <span>{job.status}</span>
              </div>
              <div className="dispatch-tech-row">
                <div className="dispatch-avatar">{String(technician?.name || "T").slice(0, 1).toUpperCase()}</div>
                <div>
                  <span>Assigned To</span>
                  <strong>{technician?.name || "Not found"}</strong>
                </div>
                <button className="link-btn" onClick={() => setOpenId(isOpen ? null : job.id)}>{isOpen ? "Hide" : "Details"}</button>
              </div>
              {isOpen && (
                <section className="dispatch-detail">
                  <BookingMini booking={booking} />
                  {type === "completed" && <p><strong>Completed:</strong> {getCompletionTime(job, booking) || "Recently"}</p>}
                  <p><strong>Priority:</strong> {currentPriority}</p>
                  <button className="ghost-btn small" onClick={() => setPage("jobs")}>Jobs & Assignment</button>
                </section>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}
