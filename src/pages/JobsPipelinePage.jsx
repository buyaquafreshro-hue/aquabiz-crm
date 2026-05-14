import React, { useState, useMemo } from "react";
import { InvoiceBuilder } from "../components/InvoiceBuilder";
import { getBookingPriority } from "../utils/appUtils";
import { saveJobAssignment, reassignTechnician } from "../services/jobAssignments";
import { supabase } from "../supabaseClient";

export function JobsPipelinePage({ bookings, jobs, technicians, telecallers = [], invoices, services, inventory, technicianParts, coverages, amcPlans, products, salesPersons, businessSettings, onUpdated, setPage }) {
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [invoiceBookingId, setInvoiceBookingId] = useState(null);
  const [jobFilter, setJobFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const itemsPerPage = 50;

  // Selection states for inline dropdowns
  const [selectedTech, setSelectedTech] = useState({});
  const [reassignTech, setReassignTech] = useState({});
  
  // Reschedule state
  const [rescheduleData, setRescheduleData] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const isCompletedStatus = (s) => ["completed", "complete", "closed", "done"].includes(String(s || "").toLowerCase());
  const isClosedJobStatus = (s) => isCompletedStatus(s) || ["cancelled", "canceled"].includes(String(s || "").toLowerCase());

  const repeatBookings = useMemo(() => {
    const repeatIds = new Set();
    const completed = jobs.filter(j => isCompletedStatus(j.status));
    
    bookings.forEach(b => {
      const bTime = new Date(b.created_at || b.booking_date).getTime();
      if (Number.isNaN(bTime)) return;

      const previousCompleted = completed.find(j => {
        const pBooking = bookings.find(pb => String(pb.id) === String(j.booking_id));
        if (!pBooking || String(pBooking.mobile) !== String(b.mobile)) return false;
        if (String(pBooking.id) === String(b.id)) return false;
        const cTime = new Date(j.completed_at || j.updated_at || pBooking.created_at).getTime();
        if (Number.isNaN(cTime)) return false;
        return bTime > cTime && bTime <= cTime + 7 * 24 * 60 * 60 * 1000;
      });

      if (previousCompleted) repeatIds.add(String(b.id));
    });
    return repeatIds;
  }, [jobs, bookings]);

  const dashboardJobs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return bookings.map(b => {
      const job = jobs.find(j => String(j.booking_id) === String(b.id));
      return { booking: b, job };
    }).filter(({ booking, job }) => {
      if (q) {
        const txt = `${booking.customer_name} ${booking.mobile} ${booking.service_type}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      if (jobFilter === "all") return true;
      if (jobFilter === "assigned") return job && !isClosedJobStatus(job.status);
      if (jobFilter === "unassigned") return !job;
      if (jobFilter === "cancelled") return job && ["cancelled", "canceled"].includes(String(job.status).toLowerCase());
      if (jobFilter === "completed") return job && isCompletedStatus(job.status);
      if (jobFilter === "repeat") return repeatBookings.has(String(booking.id));
      return true;
    }).sort((a, b) => new Date(b.booking.created_at || 0).getTime() - new Date(a.booking.created_at || 0).getTime());
  }, [bookings, jobs, jobFilter, repeatBookings, search]);

  const totalPages = Math.ceil(dashboardJobs.length / itemsPerPage) || 1;
  const paginatedJobs = dashboardJobs.slice((pageNumber - 1) * itemsPerPage, pageNumber * itemsPerPage);

  async function assignJob(bookingId) {
    const technicianId = selectedTech[bookingId];
    if (!technicianId) return alert("Please select technician.");
    const { error } = await saveJobAssignment(bookingId, technicianId);
    if (error) return alert(error.message);
    await onUpdated();
  }

  async function confirmReassign(job) {
    const technicianId = reassignTech[job.id];
    if (!technicianId) return alert("Please select a new technician.");
    const { error } = await reassignTechnician({ bookingId: job.booking_id, job, newTechnicianId: technicianId });
    if (error) return alert(error.message);
    setReassignTech({ ...reassignTech, [job.id]: "" });
    await onUpdated();
  }

  async function updateStatus(job, status) {
    const payload = { status };
    const { error } = await supabase.from("job_assignments").update(payload).eq("id", job.id);
    if (error) return alert(error.message);
    await onUpdated();
  }

  async function confirmReschedule() {
    if (!rescheduleDate) return alert("Please select a new date.");
    const { booking, job } = rescheduleData;

    const { error: bookingError } = await supabase.from("bookings").update({
      booking_date: rescheduleDate,
      booking_time: rescheduleTime
    }).eq("id", booking.id);

    if (bookingError) return alert(bookingError.message);

    if (job) {
      await supabase.from("job_assignments").update({ status: "Rescheduled" }).eq("id", job.id);
    }

    setRescheduleData(null);
    setRescheduleDate("");
    setRescheduleTime("");
    await onUpdated();
  }

  return (
    <>
      <section className="page-head">
        <h2>Jobs Pipeline</h2>
        <p>Track all assignments, completions, and repeat jobs in a detailed list.</p>
      </section>

      <section className="panel mt-md">
        <div className="section-head" style={{ flexWrap: "wrap", gap: "10px", marginBottom: "15px", alignItems: "center" }}>
          <div className="chip-grid" style={{ display: "flex", flexWrap: "wrap" }}>
            <button className={jobFilter === "all" ? "chip active" : "chip"} onClick={() => {setJobFilter("all"); setPageNumber(1);}}>All</button>
            <button className={jobFilter === "assigned" ? "chip active" : "chip"} onClick={() => {setJobFilter("assigned"); setPageNumber(1);}}>Assigned</button>
            <button className={jobFilter === "unassigned" ? "chip active" : "chip"} onClick={() => {setJobFilter("unassigned"); setPageNumber(1);}}>Unassigned</button>
            <button className={jobFilter === "completed" ? "chip active" : "chip"} onClick={() => {setJobFilter("completed"); setPageNumber(1);}}>Completed</button>
            <button className={jobFilter === "cancelled" ? "chip active" : "chip"} onClick={() => {setJobFilter("cancelled"); setPageNumber(1);}}>Cancelled</button>
            <button className={jobFilter === "repeat" ? "chip active" : "chip"} onClick={() => {setJobFilter("repeat"); setPageNumber(1);}}>Repeat</button>
          </div>
          <div style={{ marginLeft: "auto" }}>
             <input type="text" placeholder="Search customer, mobile..." value={search} onChange={(e) => {setSearch(e.target.value); setPageNumber(1);}} style={{ minHeight: "40px", width: "250px" }} />
          </div>
        </div>

        <div className="table-responsive excel-table-container">
          <table className="excel-table">
            <thead>
              <tr>
                <th>Customer Details</th>
                <th>Booking Date</th>
                <th>Visit Date</th>
                <th>Service & Priority</th>
                <th>Status</th>
                <th>Technician Assignment</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.length === 0 ? (
                <tr><td colSpan="5" className="muted text-center">No jobs found.</td></tr>
              ) : paginatedJobs.map(({ booking, job }) => {
                 const tech = job ? technicians.find(t => String(t.id) === String(job.technician_id)) : null;
                 const priority = getBookingPriority(booking);
                 const hasInvoice = invoices.some(i => String(i.booking_id) === String(booking.id));
                 const isRepeat = repeatBookings.has(String(booking.id));
                 const isClosed = job && isClosedJobStatus(job.status);
                 const dateStr = booking.created_at ? new Date(booking.created_at).toLocaleString('en-IN', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : "-";
                 const scheduledStr = booking.booking_date ? `Scheduled: ${booking.booking_date} ${booking.booking_time || ""}` : "";
                 
                 const telecallerId = booking.telecaller_id || booking.created_by_telecaller_id;
                 const telecaller = telecallerId ? telecallers.find(t => String(t.id) === String(telecallerId)) : null;
                 const creatorName = telecaller ? telecaller.name : "Admin";
                 const creatorRole = telecaller ? "Telecaller" : "";

                 return (
                   <tr key={booking.id} className={isRepeat ? "repeat-row" : ""}>
                     <td>
                       <strong>{booking.customer_name}</strong>
                       {isRepeat && <span className="status unassigned ml-sm" style={{fontSize: '10px', padding: '2px 6px', marginLeft: '8px'}}>Repeat</span>}
                       <br/><span className="muted" style={{fontSize: '12px'}}>{booking.mobile}</span>
                     </td>
                     <td style={{fontSize: '12px', color: 'var(--muted)'}}>{dateStr}</td>
                     <td style={{fontSize: '12px', color: 'var(--primary)', fontWeight: '600'}}>
                       {scheduledStr ? scheduledStr.replace("Scheduled: ", "") : "-"}
                     </td>
                     <td>
                        {booking.service_type}<br/>
                        <span className={`dispatch-pill ${priority === 'Critical' || priority === 'High' ? 'urgent' : ''}`} style={{fontSize: '10px', marginTop: '4px', display: 'inline-block'}}>{priority}</span>
                     </td>
                     <td>
                       <span className={job ? (isCompletedStatus(job.status) ? "status assigned" : "status progress") : "status unassigned"}>
                         {job ? job.status : "Unassigned"}
                       </span>
                     </td>
                     <td>
                       {!job && (
                         <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                           <select value={selectedTech[booking.id] || ""} onChange={(e) => setSelectedTech({ ...selectedTech, [booking.id]: e.target.value })} style={{ minHeight: '30px', padding: '2px 6px', fontSize: '12px' }}>
                             <option value="">Select Tech...</option>
                             {technicians.filter((t) => t.is_active !== false).map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}
                           </select>
                           <button className="primary-btn small" onClick={() => assignJob(booking.id)}>Assign</button>
                         </div>
                       )}
                       {job && !isClosed && (
                         <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
                           <strong>{tech?.name || "-"}</strong>
                           <div style={{ display: "flex", gap: "5px", width: "100%", marginTop: '4px' }}>
                             <select value={reassignTech[job.id] || ""} onChange={(e) => setReassignTech({ ...reassignTech, [job.id]: e.target.value })} style={{ minHeight: '30px', padding: '2px 6px', fontSize: '12px', flex: 1 }}>
                               <option value="">Reassign...</option>
                               {technicians.filter((t) => t.is_active !== false && String(t.id) !== String(job.technician_id)).map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}
                             </select>
                             <button className="ghost-btn small" onClick={() => confirmReassign(job)}>Set</button>
                           </div>
                         </div>
                       )}
                       {job && isClosed && <strong>{tech?.name || "-"}</strong>}
                     </td>
                     <td>
                       <span style={{fontSize: '13px'}}>{creatorName}</span>
                       {creatorRole && <><br/><span className="muted" style={{fontSize: '10px'}}>{creatorRole}</span></>}
                     </td>
                     <td>
                       <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" }}>
                         {job && !hasInvoice && !isClosed && (
                           <button className="primary-btn small" onClick={() => { setInvoiceJobId(job.id); setInvoiceBookingId(booking.id); }}>Invoice</button>
                         )}
                         {job && hasInvoice && <span className="success-line" style={{fontSize: '12px'}}>Invoiced</span>}
                         
                         {job && !isClosed && (
                            <>
                              <button className="danger-btn small" onClick={() => updateStatus(job, "Cancelled")}>Cancel</button>
                              <button className="ghost-btn small" onClick={() => setRescheduleData({ booking, job })}>Reschedule</button>
                            </>
                         )}
                         {!job && (
                            <button className="ghost-btn small" onClick={() => setRescheduleData({ booking, job: null })}>Reschedule</button>
                         )}
                       </div>
                     </td>
                   </tr>
                 )
              })}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "15px" }}>
            <span className="muted" style={{ fontSize: "13px" }}>
              Showing {(pageNumber - 1) * itemsPerPage + 1} to {Math.min(pageNumber * itemsPerPage, dashboardJobs.length)} of {dashboardJobs.length} jobs
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="ghost-btn small" disabled={pageNumber === 1} onClick={() => setPageNumber(pageNumber - 1)}>Previous</button>
              <button className="ghost-btn small" disabled={pageNumber === totalPages} onClick={() => setPageNumber(pageNumber + 1)}>Next</button>
            </div>
          </div>
        )}
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
      {rescheduleData && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div className="panel" style={{ width: "100%", maxWidth: "400px", background: "#fff" }}>
            <h3>Reschedule Job</h3>
            <p className="muted mt-sm mb-sm" style={{fontSize: '14px', marginBottom: '15px'}}>Select a new date and time for this booking.</p>
            <div className="form-stack">
              <div>
                <label>New Date</label>
                <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
              </div>
              <div>
                <label>New Time</label>
                <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} />
              </div>
              <div className="row-actions mt-sm" style={{justifyContent: "flex-end", marginTop: '20px'}}>
                <button className="ghost-btn" onClick={() => { setRescheduleData(null); setRescheduleDate(""); setRescheduleTime(""); }}>Cancel</button>
                <button className="primary-btn" onClick={confirmReschedule}>Confirm Reschedule</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
