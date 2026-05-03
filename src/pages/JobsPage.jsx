import { useState } from "react";
import { InvoiceBuilder } from "../components/InvoiceBuilder";
import { BookingMini } from "../components/shared";
import { saveJobAssignment } from "../services/jobAssignments";
import { supabase } from "../supabaseClient";
import { getBookingPriority, getCustomerCoverageStatus, isCompletedStatus } from "../utils/appUtils";
import { getCompletionTime, isOpenJobStatus, isRecentCompletedJob } from "../utils/roleDashboard";
export function JobsPage({ bookings, jobs, technicians, technicianParts = [], inventory, coverages, invoices, amcPlans, products, salesPersons = [], businessSettings, onUpdated }) {
  const [selectedTech, setSelectedTech] = useState({});
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [openUnassignedId, setOpenUnassignedId] = useState(null);
  const [openJobId, setOpenJobId] = useState(null);
  const assignedBookingIds = new Set(jobs.map((j) => String(j.booking_id)));
  const unassignedBookings = bookings.filter((b) => !assignedBookingIds.has(String(b.id)) && isOpenJobStatus(b.status || b.job_status || ""));
  const openJobs = jobs.filter((job) => isOpenJobStatus(job.status));

  async function assignJob(bookingId) {
    const technicianId = selectedTech[bookingId];
    if (!technicianId) return alert("Please select technician.");
    const { error } = await saveJobAssignment(bookingId, technicianId);
    if (error) return alert(error.message);
    await onUpdated();
  }

  async function updateStatus(job, status) {
    const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
    if (status === "Completed" && booking?.close_otp) {
      const entered = window.prompt("Enter customer OTP to close this job");
      if (String(entered || "").trim() !== String(booking.close_otp)) {
        alert("Wrong OTP. Job not closed.");
        return;
      }
      await supabase.from("bookings").update({ close_otp_verified: true }).eq("id", booking.id);
    }

    const payload = status === "Completed" ? { status, completed_at: new Date().toISOString() } : { status };
    const { error } = await supabase.from("job_assignments").update(payload).eq("id", job.id);
    if (error) alert(error.message);
    await onUpdated();
  }

  return (
    <>
      <section className="page-head"><h2>Jobs & Assignment</h2><p>Assign unassigned bookings and generate invoices for completed jobs.</p></section>

      <section className="panel">
        <h3>Unassigned Bookings</h3>
        {unassignedBookings.length === 0 ? <p className="muted">No unassigned bookings.</p> : unassignedBookings.map((b) => {
          const isOpen = String(openUnassignedId) === String(b.id);
          const coverageStatus = getCustomerCoverageStatus(b.mobile, coverages);

          return (
            <div className="job-card" key={b.id}>
              <button
                className="booking-card-head compact-click"
                type="button"
                onClick={() => setOpenUnassignedId(isOpen ? null : b.id)}
              >
                <div>
                  <strong>{b.customer_name}</strong>
                  <p>{isOpen ? "Hide details" : "Click to view details"}</p>
                </div>
                <div className="row-actions no-margin">
                  <span className="status unassigned">Unassigned</span>
                  <span className="status assigned">{coverageStatus}</span>
                </div>
              </button>

              {isOpen && (
                <>
                  <BookingMini booking={b} />
                  {b.close_otp && (
                    <div className="row-actions">
                      <a className="ghost-btn small" href={`https://wa.me/91${b.mobile}?text=${encodeURIComponent(`AquaBiz job closing OTP: ${b.close_otp}. Share this OTP after work is completed.`)}`} target="_blank" rel="noreferrer">Send Close OTP</a>
                    </div>
                  )}
                  <select value={selectedTech[b.id] || ""} onChange={(e) => setSelectedTech({ ...selectedTech, [b.id]: e.target.value })}>
                    <option value="">Select Technician</option>{technicians.filter((t) => t.is_active !== false).map((t) => <option value={t.id} key={t.id}>{t.name} ({t.mobile})</option>)}
                  </select>
                  <button className="primary-btn" onClick={() => assignJob(b.id)}>Assign Technician</button>
                </>
              )}
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h3>Assigned Open Jobs</h3>
        {openJobs.length === 0 ? <p className="muted">No open assigned jobs.</p> : openJobs.map((job) => {
          const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
          const tech = technicians.find((t) => String(t.id) === String(job.technician_id));
          const hasInvoice = invoices.some((i) => String(i.booking_id) === String(job.booking_id));
          const isOpen = String(openJobId) === String(job.id);
          const coverageStatus = getCustomerCoverageStatus(booking?.mobile, coverages);

          return (
            <div className="job-card" key={job.id}>
              <button
                className="booking-card-head compact-click"
                type="button"
                onClick={() => setOpenJobId(isOpen ? null : job.id)}
              >
                <div>
                  <strong>{booking?.customer_name || "Booking not found"}</strong>
                  <p>{isOpen ? "Hide details" : `${tech?.name || "Unknown technician"} - ${job.status}`}</p>
                </div>
                <div className="row-actions no-margin">
                  <span className="status assigned">{job.status}</span>
                  <span className="status assigned">{coverageStatus}</span>
                </div>
              </button>

              {isOpen && (
                <>
                  {booking ? <BookingMini booking={booking} /> : <p className="muted">Booking not found</p>}
                  <p><strong>Technician:</strong> {tech?.name || "Unknown technician"}</p>
                  <p><strong>Customer Type:</strong> {coverageStatus}</p>
                  <div className="row-actions">
                    {["Assigned", "In Progress", "Completed"].map((s) => <button key={s} className="ghost-btn small" onClick={() => updateStatus(job, s)}>{s}</button>)}
                    {booking?.close_otp && <a className="ghost-btn small" href={`https://wa.me/91${booking.mobile}?text=${encodeURIComponent(`AquaBiz job closing OTP: ${booking.close_otp}. Share this OTP after work is completed.`)}`} target="_blank" rel="noreferrer">Send Close OTP</a>}
                    {!hasInvoice && <button className="primary-btn small" onClick={() => setInvoiceJobId(invoiceJobId === job.id ? null : job.id)}>Generate Invoice</button>}
                    {hasInvoice && <span className="status assigned">Invoice Generated</span>}
                  </div>
                  {invoiceJobId === job.id && (
                    <InvoiceBuilder job={job} booking={booking} inventory={inventory} technicianParts={technicianParts} coverages={coverages} invoices={invoices}
                      amcPlans={amcPlans}
                      products={products} salesPersons={salesPersons} businessSettings={businessSettings} onClose={() => setInvoiceJobId(null)} onDone={async () => { setInvoiceJobId(null); await onUpdated(); }} />
                  )}
                </>
              )}
            </div>
          );
        })}
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
        <p>{type === "completed" ? "Completed jobs are visible here for 24 hours only. Older jobs can be checked from Customer History." : "Search and filter open jobs by customer, technician, priority, and warranty/AMC status."}</p>
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

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>{title}</h3>
            <p>{filtered.length} jobs found</p>
          </div>
          <button className="link-btn" onClick={() => setPage("jobs")}>Jobs & Assignment</button>
        </div>

        {filtered.length === 0 ? <p className="muted">No jobs found.</p> : filtered.map(({ job, booking, technician, coverageStatus, currentPriority }) => {
          const isOpen = String(openId) === String(job.id);

          return (
            <div className="job-card" key={job.id}>
              <button className="booking-card-head compact-click" type="button" onClick={() => setOpenId(isOpen ? null : job.id)}>
                <div>
                  <strong>{booking.customer_name}</strong>
                  <p>{isOpen ? "Hide details" : `${booking.mobile} - ${booking.service_type}`}</p>
                </div>
                <div className="row-actions no-margin">
                  <span className={currentPriority === "Critical" ? "status unassigned" : "status assigned"}>{currentPriority}</span>
                  <span className="status assigned">{coverageStatus}</span>
                </div>
              </button>

              {isOpen && (
                <>
                  <BookingMini booking={booking} />
                  <p><strong>Technician:</strong> {technician?.name || "Not found"} {technician?.mobile ? `- ${technician.mobile}` : ""}</p>
                  <p><strong>Status:</strong> {job.status}</p>
                  {type === "completed" && <p><strong>Completed:</strong> {getCompletionTime(job, booking) || "Recently"}</p>}
                  <p><strong>Priority:</strong> {currentPriority}</p>
                  <p><strong>Customer Type:</strong> {coverageStatus}</p>
                </>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
