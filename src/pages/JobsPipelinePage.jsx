import React, { useState, useMemo } from "react";
import { InvoiceBuilder } from "../components/InvoiceBuilder";
import { StatCard } from "../components/shared";
import { addDays, findServiceInvoiceForBooking, getBookingPriority, getCompletedJobInvoiceState, formatISTDate, todayISO } from "../utils/appUtils";
import { saveJobAssignment, reassignTechnician } from "../services/jobAssignments";
import { upsertCustomerFromBooking } from "../services/customerService";
import { supabase } from "../supabaseClient";
import { buildWhatsAppUrl, closeOtpMessage } from "../utils/whatsappUtils";
import { getText } from "../constants/text";

const NO_INVOICE_REASONS = ["No Charge", "Cancelled after visit", "Already paid", "Follow-up job"];

export function JobsPipelinePage({ bookings, jobs, technicians, telecallers = [], serviceAreas = [], invoices, services, inventory, technicianParts, coverages, amcPlans, products, salesPersons, businessSettings, language = "en", onUpdated, setPage, onCustomerOpen }) {
  const t = getText(language);
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [invoiceBookingId, setInvoiceBookingId] = useState(null);
  const [jobFilter, setJobFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [scheduledDateFilter, setScheduledDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkTechnicianId, setBulkTechnicianId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const itemsPerPage = 50;

  // Selection states for inline dropdowns
  const [selectedTech, setSelectedTech] = useState({});
  const [reassignTech, setReassignTech] = useState({});
  
  // Edit Booking state
  const [editBookingData, setEditBookingData] = useState(null);
  const [editBookingForm, setEditBookingForm] = useState({ date: "", time: "", address: "", area: "", notes: "", serviceType: "", alternateMobile: "" });

  // Direct Close state
  const [directCloseData, setDirectCloseData] = useState(null);
  const [closeJobParts, setCloseJobParts] = useState([]);
  const [closeJobPartId, setCloseJobPartId] = useState("");
  const [closeJobPartQty, setCloseJobPartQty] = useState("1");
  const [closeJobReason, setCloseJobReason] = useState("");
  const [closeJobSaving, setCloseJobSaving] = useState(false);

  const isCompletedStatus = (s) => ["completed", "complete", "closed", "done"].includes(String(s || "").toLowerCase());
  const isClosedJobStatus = (s) => isCompletedStatus(s) || ["cancelled", "canceled"].includes(String(s || "").toLowerCase());
  const activeAreas = serviceAreas.filter((area) => area.is_active !== false);

  function getAreaRecord(areaName) {
    return activeAreas.find((area) => String(area.name || "").trim().toLowerCase() === String(areaName || "").trim().toLowerCase());
  }

  function areaTechnicians(areaName) {
    const area = getAreaRecord(areaName);
    const ids = Array.isArray(area?.technician_ids) ? area.technician_ids.map(String) : [];
    return technicians.filter((tech) => tech.is_active !== false && ids.includes(String(tech.id)));
  }

  function otherTechnicians(areaName, excludeId = "") {
    const areaIds = new Set(areaTechnicians(areaName).map((tech) => String(tech.id)));
    return technicians.filter((tech) => tech.is_active !== false && String(tech.id) !== String(excludeId) && !areaIds.has(String(tech.id)));
  }

  function visitDateLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Scheduled Visits";
    return `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} Visits`;
  }

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

  const filterCounts = useMemo(() => {
    const rows = bookings.map((booking) => ({
      booking,
      job: jobs.find((row) => String(row.booking_id) === String(booking.id)),
    }));
    return {
      all: rows.length,
      pending: rows.filter(({ job }) => !job || !isClosedJobStatus(job.status)).length,
      assigned: rows.filter(({ job }) => job && !isClosedJobStatus(job.status)).length,
      unassigned: rows.filter(({ job }) => !job).length,
      completed: rows.filter(({ job }) => job && isCompletedStatus(job.status)).length,
      cancelled: rows.filter(({ job }) => job && ["cancelled", "canceled"].includes(String(job.status).toLowerCase())).length,
      repeat: rows.filter(({ booking }) => repeatBookings.has(String(booking.id))).length,
    };
  }, [bookings, jobs, repeatBookings]);

  const serviceTypeCards = useMemo(() => {
    const tomorrow = addDays(todayISO(), 1);
    const dayAfter = addDays(todayISO(), 2);
    const counts = new Map();
    bookings.forEach((booking) => {
      const label = String(booking.service_type || "Service").trim() || "Service";
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    return [
      { label: "All Types", value: bookings.length, key: "all", icon: "A" },
      { label: visitDateLabel(tomorrow), value: bookings.filter((booking) => String(booking.booking_date || "") === tomorrow).length, key: "date", date: tomorrow, icon: "D" },
      { label: visitDateLabel(dayAfter), value: bookings.filter((booking) => String(booking.booking_date || "") === dayAfter).length, key: "date", date: dayAfter, icon: "D" },
      ...Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([label, value]) => ({ label, value, key: label, icon: "J" })),
    ];
  }, [bookings]);

  const dashboardJobs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return bookings.map(b => {
      const job = jobs.find(j => String(j.booking_id) === String(b.id));
      return { booking: b, job };
    }).filter(({ booking, job }) => {
      if (serviceTypeFilter !== "all" && String(booking.service_type || "Service") !== String(serviceTypeFilter)) return false;
      if (scheduledDateFilter && String(booking.booking_date || "") !== scheduledDateFilter) return false;

      if (q) {
        const txt = `${booking.customer_name} ${booking.mobile} ${booking.service_type}`.toLowerCase();
        if (!txt.includes(q)) return false;
      } else if (booking.booking_date) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayDateStr = `${yyyy}-${mm}-${dd}`;
        if (booking.booking_date > todayDateStr) return false;
      }
      
      if (jobFilter === "all") return true;
      if (jobFilter === "pending") return !job || !isClosedJobStatus(job.status);
      if (jobFilter === "assigned") return job && !isClosedJobStatus(job.status);
      if (jobFilter === "unassigned") return !job;
      if (jobFilter === "cancelled") return job && ["cancelled", "canceled"].includes(String(job.status).toLowerCase());
      if (jobFilter === "completed") return job && isCompletedStatus(job.status);
      if (jobFilter === "repeat") return repeatBookings.has(String(booking.id));
      return true;
    }).sort((a, b) => new Date(b.booking.created_at || 0).getTime() - new Date(a.booking.created_at || 0).getTime());
  }, [bookings, jobs, jobFilter, repeatBookings, search, serviceTypeFilter, scheduledDateFilter]);

  const totalPages = Math.ceil(dashboardJobs.length / itemsPerPage) || 1;
  const paginatedJobs = dashboardJobs.slice((pageNumber - 1) * itemsPerPage, pageNumber * itemsPerPage);
  const selectableRows = paginatedJobs.filter(({ job }) => !job || !isClosedJobStatus(job.status));
  const selectableIds = selectableRows.map(({ booking }) => String(booking.id));
  const selectedOnPage = selectableIds.filter((id) => bulkSelected.includes(id));
  const allPageSelected = selectableIds.length > 0 && selectedOnPage.length === selectableIds.length;

  function toggleBulkSelection(bookingId) {
    const id = String(bookingId);
    setBulkSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  function toggleSelectPage() {
    setBulkSelected((prev) => {
      if (allPageSelected) return prev.filter((id) => !selectableIds.includes(id));
      return Array.from(new Set([...prev, ...selectableIds]));
    });
  }

  async function bulkAssignJobs() {
    if (!bulkSelected.length) return alert("Select jobs first.");
    if (!bulkTechnicianId) return alert("Select technician for bulk assignment.");

    const selectedRows = bookings
      .filter((booking) => bulkSelected.includes(String(booking.id)))
      .map((booking) => ({ booking, job: jobs.find((job) => String(job.booking_id) === String(booking.id)) }))
      .filter(({ job }) => !job || !isClosedJobStatus(job.status));

    if (!selectedRows.length) return alert("No open jobs selected.");

    setBulkAssigning(true);
    for (const { booking, job } of selectedRows) {
      const result = job
        ? await reassignTechnician({ bookingId: booking.id, job, newTechnicianId: bulkTechnicianId })
        : await saveJobAssignment(booking.id, bulkTechnicianId);
      if (result.error) {
        setBulkAssigning(false);
        return alert(result.error.message);
      }
    }

    setBulkSelected([]);
    setBulkTechnicianId("");
    setBulkAssigning(false);
    await onUpdated();
  }

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

  async function confirmDirectClose() {
    if (!closeJobReason) return alert("Select a reason before closing without invoice.");
    setCloseJobSaving(true);
    const { booking, job } = directCloseData;
    const completedAt = new Date().toISOString();

    for (const part of closeJobParts) {
      const inv = inventory.find((p) => String(p.id) === String(part.inventory_item_id));
      if (inv) {
        const newStock = Number(inv.stock_qty || 0) - Number(part.quantity || 0);
        await supabase.from("inventory_items").update({ stock_qty: newStock }).eq("id", inv.id);

        await supabase.from("inventory_usage").insert([{
          booking_id: booking.id,
          invoice_id: null,
          inventory_item_id: part.inventory_item_id,
          part_name: part.part_name,
          quantity: part.quantity,
          actual_selling_price: part.actual_selling_price,
          billing_price: 0,
          is_covered: true,
          covered_reason: `Direct Admin Close - ${closeJobReason}`,
          technician_id: job.technician_id || null,
        }]);

        if (job.technician_id) {
          let remainingQty = Number(part.quantity || 0);
          const techRows = technicianParts
            .filter((row) => String(row.technician_id) === String(job.technician_id) && String(row.inventory_item_id) === String(part.inventory_item_id))
            .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));

          for (const row of techRows) {
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

    const { error: jobError } = await supabase.from("job_assignments").update({ status: "Completed", job_status: "completed", assignment_status: "completed", completed_at: completedAt }).eq("id", job.id);
    if (jobError) {
       alert(jobError.message);
       setCloseJobSaving(false);
       return;
    }

    const { error: jobReasonError } = await supabase.from("job_assignments").update({
      no_invoice_reason: closeJobReason,
      invoice_required: false,
      direct_closed_without_invoice: true,
    }).eq("id", job.id);
    if (jobReasonError) console.warn("No-invoice reason was not saved on job_assignments:", jobReasonError.message);

    const { error: jobClosedByError } = await supabase.from("job_assignments").update({
      closed_by_id: null,
      closed_by_name: "Admin",
      closed_by_role: "Admin",
      closed_at: completedAt,
    }).eq("id", job.id);
    if (jobClosedByError) console.warn("Close-by metadata was not saved on job_assignments:", jobClosedByError.message);
    
    if (booking.id) {
      await supabase.from("bookings").update({ booking_status: "completed", completed_at: completedAt }).eq("id", booking.id);
      const { error: bookingReasonError } = await supabase.from("bookings").update({
        no_invoice_reason: closeJobReason,
        invoice_required: false,
        direct_closed_without_invoice: true,
      }).eq("id", booking.id);
      if (bookingReasonError) console.warn("No-invoice reason was not saved on bookings:", bookingReasonError.message);

      const { error: bookingClosedByError } = await supabase.from("bookings").update({
        closed_by_id: null,
        closed_by_name: "Admin",
        closed_by_role: "Admin",
        closed_at: completedAt,
      }).eq("id", booking.id);
      if (bookingClosedByError) console.warn("Close-by metadata was not saved on bookings:", bookingClosedByError.message);
    }

    if (closeJobReason !== "Cancelled after visit") {
      const customerResult = await upsertCustomerFromBooking(booking);
      if (customerResult.error) console.warn("Customer master was not updated from direct close:", customerResult.error.message);
    }
    
    setDirectCloseData(null);
    setCloseJobParts([]);
    setCloseJobReason("");
    setCloseJobSaving(false);
    await onUpdated();
  }

  async function confirmEditBooking() {
    const { booking, job } = editBookingData;
    const { date, time, address, area, notes, serviceType, alternateMobile } = editBookingForm;

    const { error: bookingError } = await supabase.from("bookings").update({
      booking_date: date || null,
      booking_time: time || null,
      alternate_mobile: (alternateMobile || "").trim(),
      address: address.trim(),
      area: (area || "").trim(),
      complaint_notes: notes.trim(),
      service_type: serviceType
    }).eq("id", booking.id);

    if (bookingError) return alert(bookingError.message);

    if (job && date && date !== booking.booking_date) {
      await supabase.from("job_assignments").update({ status: "Rescheduled" }).eq("id", job.id);
    }

    setEditBookingData(null);
    setEditBookingForm({ date: "", time: "", address: "", area: "", notes: "", serviceType: "", alternateMobile: "" });
    await onUpdated();
  }

  async function deleteBooking(bookingId, jobId) {
    if (!window.confirm("Are you sure you want to permanently delete this booking? All associated jobs will also be removed.")) return;
    if (jobId) {
      await supabase.from("job_assignments").delete().eq("id", jobId);
    }
    const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
    if (error) return alert(error.message);
    await onUpdated();
  }

  return (
    <>
      <section className="page-head">
        <h2>{t.jobsPipeline}</h2>
        <p>{t.jobsPipelineSubtitle}</p>
      </section>

      <details className="jobs-filter-accordion">
        <summary>
          <span>{t.jobTypeFilters}</span>
          <strong>{serviceTypeCards.length}</strong>
        </summary>
        <section className="jobs-type-grid">
          {serviceTypeCards.map((card) => (
            <StatCard
              key={`${card.key}-${card.date || card.label}`}
              icon={card.icon}
              label={card.label}
              value={card.value}
              onClick={() => {
                if (card.key === "date") {
                  setScheduledDateFilter(card.date);
                } else {
                  setServiceTypeFilter(card.key);
                  setScheduledDateFilter("");
                }
                setPageNumber(1);
              }}
            />
          ))}
        </section>
      </details>

      <section className="panel mt-md jobs-list-panel">
        <div className="jobs-filter-bar">
          <div className="jobs-filter-chips">
            {serviceTypeFilter !== "all" && (
              <button className="chip active" onClick={() => { setServiceTypeFilter("all"); setPageNumber(1); }}>
                Type: {serviceTypeFilter} x
              </button>
            )}
            {scheduledDateFilter && (
              <button className="chip active" onClick={() => { setScheduledDateFilter(""); setPageNumber(1); }}>
                Visit Date: {scheduledDateFilter} x
              </button>
            )}
            <button className={jobFilter === "all" ? "chip active" : "chip"} onClick={() => {setJobFilter("all"); setPageNumber(1);}}>{t.all} ({filterCounts.all})</button>
            <button className={jobFilter === "pending" ? "chip active" : "chip"} onClick={() => {setJobFilter("pending"); setPageNumber(1);}}>{t.pendingJobs} ({filterCounts.pending})</button>
            <button className={jobFilter === "assigned" ? "chip active" : "chip"} onClick={() => {setJobFilter("assigned"); setPageNumber(1);}}>{t.assigned} ({filterCounts.assigned})</button>
            <button className={jobFilter === "unassigned" ? "chip active" : "chip"} onClick={() => {setJobFilter("unassigned"); setPageNumber(1);}}>{t.unassigned} ({filterCounts.unassigned})</button>
            <button className={jobFilter === "completed" ? "chip active" : "chip"} onClick={() => {setJobFilter("completed"); setPageNumber(1);}}>{t.completed} ({filterCounts.completed})</button>
            <button className={jobFilter === "cancelled" ? "chip active" : "chip"} onClick={() => {setJobFilter("cancelled"); setPageNumber(1);}}>{t.cancelled} ({filterCounts.cancelled})</button>
            <button className={jobFilter === "repeat" ? "chip active" : "chip"} onClick={() => {setJobFilter("repeat"); setPageNumber(1);}}>{t.repeat} ({filterCounts.repeat})</button>
          </div>
          <div className="jobs-search-box">
             <input type="text" placeholder="Search customer, mobile..." value={search} onChange={(e) => {setSearch(e.target.value); setPageNumber(1);}} />
          </div>
        </div>

        <div className="bulk-assign-bar">
          <div>
            <strong>{bulkSelected.length}</strong>
            <span>{language === "hi" ? " टेक्नीशियन असाइनमेंट के लिए चुने गए" : " selected for technician assignment"}</span>
          </div>
          <select value={bulkTechnicianId} onChange={(e) => setBulkTechnicianId(e.target.value)}>
            <option value="">{language === "hi" ? "टेक्नीशियन चुनें..." : "Select technician..."}</option>
            {technicians.filter((tech) => tech.is_active !== false).map((tech) => (
              <option key={tech.id} value={tech.id}>{tech.name}</option>
            ))}
          </select>
          <button className="primary-btn small" disabled={bulkAssigning || !bulkSelected.length} onClick={bulkAssignJobs}>
            {bulkAssigning ? (language === "hi" ? "असाइन हो रहा है..." : "Assigning...") : (language === "hi" ? "बल्क असाइन" : "Bulk Assign")}
          </button>
          {bulkSelected.length > 0 && (
            <button className="ghost-btn small" disabled={bulkAssigning} onClick={() => setBulkSelected([])}>{language === "hi" ? "क्लियर" : "Clear"}</button>
          )}
        </div>

        <div className="table-responsive excel-table-container">
          <table className="excel-table">
            <thead>
              <tr>
                <th style={{ width: "44px", textAlign: "center" }}>
                  <input type="checkbox" checked={allPageSelected} onChange={toggleSelectPage} aria-label="Select visible open jobs" />
                </th>
                <th>{language === "hi" ? "ग्राहक विवरण" : "Customer Details"}</th>
                <th>{language === "hi" ? "बुकिंग तारीख" : "Booking Date"}</th>
                <th>{language === "hi" ? "विजिट तारीख" : "Visit Date"}</th>
                <th>{language === "hi" ? "सर्विस और प्राथमिकता" : "Service & Priority"}</th>
                <th>{t.status}</th>
                <th>{language === "hi" ? "टेक्नीशियन असाइनमेंट" : "Technician Assignment"}</th>
                <th>{language === "hi" ? "बनाया" : "Created By"}</th>
                <th>{language === "hi" ? "बंद किया" : "Closed By"}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.length === 0 ? (
                <tr><td colSpan="10" className="muted text-center">{language === "hi" ? "कोई जॉब नहीं मिला।" : "No jobs found."}</td></tr>
              ) : paginatedJobs.map(({ booking, job }) => {
                 const tech = job ? technicians.find(t => String(t.id) === String(job.technician_id)) : null;
                 const priority = getBookingPriority(booking);
                 const invoice = findServiceInvoiceForBooking(invoices, booking.id);
                 const hasInvoice = !!invoice;
                 const invoiceState = job ? getCompletedJobInvoiceState(job, invoices, booking) : { hasInvoice, isInvoicePending: false, badge: "" };
                 const isRepeat = repeatBookings.has(String(booking.id));
                 const isClosed = job && isClosedJobStatus(job.status);
                 const isCompleted = job && isCompletedStatus(job.status);
                 const dateStr = booking.created_at ? formatISTDate(booking.created_at) : "-";
                 const scheduledStr = booking.booking_date ? `Scheduled: ${booking.booking_date} ${booking.booking_time || ""}` : "";
                 
                 const telecallerId = booking.telecaller_id || booking.created_by_telecaller_id;
                 const telecaller = telecallerId ? telecallers.find(t => String(t.id) === String(telecallerId)) : null;
                 const creatorName = telecaller ? telecaller.name : "Admin";
                 const creatorRole = telecaller ? "Telecaller" : "";
                 const closedByName = job?.closed_by_name || booking.closed_by_name || (isCompleted && tech ? tech.name : "");
                 const closedByRole = job?.closed_by_role || booking.closed_by_role || (isCompleted && tech ? "Technician" : "");
                 const matchingAreaTechs = areaTechnicians(booking.area);
                 const remainingTechs = otherTechnicians(booking.area);

                 return (
                   <tr key={booking.id} className={isRepeat ? "repeat-row" : ""}>
                     <td style={{ textAlign: "center" }}>
                       {!job || !isClosedJobStatus(job.status) ? (
                         <input
                           type="checkbox"
                           checked={bulkSelected.includes(String(booking.id))}
                           onChange={() => toggleBulkSelection(booking.id)}
                           aria-label={`Select ${booking.customer_name || "job"}`}
                         />
                       ) : (
                         <span className="muted">-</span>
                       )}
                     </td>
                     <td>
                       <button
                         className="customer-history-link"
                         type="button"
                         onClick={() => onCustomerOpen?.(booking.mobile)}
                         title="Open customer history"
                       >
                         {booking.customer_name}
                       </button>
                       {isRepeat && <span className="status unassigned ml-sm" style={{fontSize: '10px', padding: '2px 6px', marginLeft: '8px'}}>{t.repeat}</span>}
                       <br/><span className="muted" style={{fontSize: '12px'}}>{booking.mobile}{booking.alternate_mobile ? ` / ${booking.alternate_mobile}` : ""}</span>
                       {booking.area && <div className="muted" style={{fontSize: '11px', marginTop: '4px'}}><strong>Area:</strong> {booking.area}</div>}
                     </td>
                     <td style={{fontSize: '12px', color: 'var(--muted)'}}>{dateStr}</td>
                     <td style={{fontSize: '12px', color: 'var(--primary)', fontWeight: '600'}}>
                       {scheduledStr ? scheduledStr.replace("Scheduled: ", "") : "-"}
                     </td>
                     <td>
                        {booking.service_type}<br/>
                        <span className={`dispatch-pill ${priority === 'Critical' || priority === 'High' ? 'urgent' : ''}`} style={{fontSize: '10px', marginTop: '4px', display: 'inline-block'}}>{priority}</span>
                        {booking.complaint_notes && <div className="muted" style={{ fontSize: '11px', marginTop: '6px', maxWidth: '200px' }}><strong>Notes:</strong> {booking.complaint_notes}</div>}
                     </td>
                     <td>
                       <span className={job ? (isCompletedStatus(job.status) ? "status assigned" : "status progress") : "status unassigned"}>
                         {job ? job.status : "Unassigned"}
                       </span>
                       {isCompleted && (
                         <div className="mt-sm">
                           <span className={invoiceState.hasInvoice ? "status assigned" : invoiceState.invoiceWaived ? "status progress" : "status unassigned"}>
                             {invoiceState.badge}
                           </span>
                         </div>
                       )}
                     </td>
                     <td>
                       {!job && (
                         <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                           <select value={selectedTech[booking.id] || ""} onChange={(e) => setSelectedTech({ ...selectedTech, [booking.id]: e.target.value })} style={{ minHeight: '30px', padding: '2px 6px', fontSize: '12px' }}>
                             <option value="">{language === "hi" ? "टेक्नीशियन चुनें..." : "Select Tech..."}</option>
                             {matchingAreaTechs.length > 0 && (
                               <optgroup label={`${booking.area} technicians`}>
                                 {matchingAreaTechs.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}
                               </optgroup>
                             )}
                             <optgroup label={matchingAreaTechs.length > 0 ? "Other technicians" : "Technicians"}>
                               {remainingTechs.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}
                             </optgroup>
                           </select>
                           <button className="primary-btn small" onClick={() => assignJob(booking.id)}>{t.assign}</button>
                         </div>
                       )}
                       {job && !isClosed && (
                         <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
                           <strong>{tech?.name || "-"}</strong>
                           <div style={{ display: "flex", gap: "5px", width: "100%", marginTop: '4px' }}>
                             <select value={reassignTech[job.id] || ""} onChange={(e) => setReassignTech({ ...reassignTech, [job.id]: e.target.value })} style={{ minHeight: '30px', padding: '2px 6px', fontSize: '12px', flex: 1 }}>
                               <option value="">{language === "hi" ? "री-असाइन..." : "Reassign..."}</option>
                               {matchingAreaTechs.filter((t) => String(t.id) !== String(job.technician_id)).length > 0 && (
                                 <optgroup label={`${booking.area} technicians`}>
                                   {matchingAreaTechs.filter((t) => String(t.id) !== String(job.technician_id)).map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}
                                 </optgroup>
                               )}
                               <optgroup label="Other technicians">
                                 {otherTechnicians(booking.area, job.technician_id).map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}
                               </optgroup>
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
                       {isCompleted ? (
                         <>
                           <span style={{fontSize: '13px'}}>{closedByName || "-"}</span>
                           {closedByRole && <><br/><span className="muted" style={{fontSize: '10px'}}>{closedByRole}</span></>}
                         </>
                       ) : (
                         <span className="muted" style={{fontSize: '12px'}}>-</span>
                       )}
                     </td>
                     <td>
                       <details className="job-actions-accordion">
                         <summary>{t.actions}</summary>
                         <div className="job-actions-menu">
                           {job && !hasInvoice && (!isClosed || invoiceState.isInvoicePending) && (
                             <button className="primary-btn small" onClick={() => { setInvoiceJobId(job.id); setInvoiceBookingId(booking.id); }}>{isCompleted ? t.createInvoice : t.invoices}</button>
                           )}
                            {job && hasInvoice && <span className="success-line" style={{fontSize: '12px'}}>{language === "hi" ? "इनवॉइस बन चुकी है" : "Invoiced"}</span>}
                           
                            {job && !isClosed && (
                              <>
                                <a className="ghost-btn small" href={buildWhatsAppUrl(booking.mobile, closeOtpMessage(booking, businessSettings))} target="_blank" rel="noreferrer">{t.sendOtp}</a>
                                <button className="ghost-btn small" style={{color: "var(--success-color, #10b981)", borderColor: "var(--success-color, #10b981)"}} onClick={() => { setDirectCloseData({ booking, job }); setCloseJobParts([]); setCloseJobReason(""); }}>{language === "hi" ? "बंद करें" : "Close"}</button>
                                <button className="danger-btn small" onClick={() => updateStatus(job, "Cancelled")}>{language === "hi" ? "रद्द करें" : "Cancel"}</button>
                                <button className="ghost-btn small" onClick={() => {
                                   setEditBookingData({ booking, job });
                                   setEditBookingForm({ date: booking.booking_date || "", time: booking.booking_time || "", address: booking.address || "", area: booking.area || "", notes: booking.complaint_notes || "", serviceType: booking.service_type || "", alternateMobile: booking.alternate_mobile || "" });
                                }}>{t.edit}</button>
                              </>
                           )}
                           {!job && (
                              <button className="ghost-btn small" onClick={() => {
                                 setEditBookingData({ booking, job: null });
                                 setEditBookingForm({ date: booking.booking_date || "", time: booking.booking_time || "", address: booking.address || "", area: booking.area || "", notes: booking.complaint_notes || "", serviceType: booking.service_type || "", alternateMobile: booking.alternate_mobile || "" });
                              }}>{t.edit}</button>
                           )}
                           <button className="danger-btn small" onClick={() => deleteBooking(booking.id, job?.id)}>{t.delete}</button>
                         </div>
                       </details>
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
              language={language}
              closedBy={{ id: null, name: "Admin", role: "Admin" }}
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
      {editBookingData && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div className="panel" style={{ width: "100%", maxWidth: "500px", background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3>Edit Booking</h3>
            <p className="muted mt-sm mb-sm" style={{fontSize: '14px', marginBottom: '15px'}}>Update booking details, address, or reschedule date/time.</p>
            <div className="form-stack">
              <div>
                <label>Service Type</label>
                <select value={editBookingForm.serviceType} onChange={e => setEditBookingForm({ ...editBookingForm, serviceType: e.target.value })}>
                  <option value="">Select Service</option>
                  {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label>Alternate Mobile</label>
                <input value={editBookingForm.alternateMobile} onChange={e => setEditBookingForm({ ...editBookingForm, alternateMobile: e.target.value })} />
              </div>
              <div>
                <label>Address</label>
                <textarea value={editBookingForm.address} onChange={e => setEditBookingForm({ ...editBookingForm, address: e.target.value })} rows={2} />
              </div>
              <div>
                <label>Area / Locality</label>
                {activeAreas.length > 0 ? (
                  <select value={editBookingForm.area} onChange={e => setEditBookingForm({ ...editBookingForm, area: e.target.value })}>
                    <option value="">Select area / territory</option>
                    {activeAreas.map((area) => <option key={area.id} value={area.name}>{area.name}</option>)}
                  </select>
                ) : (
                  <input value={editBookingForm.area} onChange={e => setEditBookingForm({ ...editBookingForm, area: e.target.value })} />
                )}
              </div>
              <div>
                <label>Complaint Notes</label>
                <textarea value={editBookingForm.notes} onChange={e => setEditBookingForm({ ...editBookingForm, notes: e.target.value })} rows={2} />
              </div>
              <div className="two-col">
                <div>
                  <label>Visit Date</label>
                  <input type="date" value={editBookingForm.date} onChange={e => setEditBookingForm({ ...editBookingForm, date: e.target.value })} />
                </div>
                <div>
                  <label>Time Slot</label>
                  <input type="time" value={editBookingForm.time} onChange={e => setEditBookingForm({ ...editBookingForm, time: e.target.value })} />
                </div>
              </div>
              <div className="row-actions mt-sm" style={{justifyContent: "flex-end", marginTop: '20px'}}>
                <button className="ghost-btn" onClick={() => setEditBookingData(null)}>Cancel</button>
                <button className="primary-btn" onClick={confirmEditBooking}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {directCloseData && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div className="panel" style={{ width: "100%", maxWidth: "500px", background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3>Direct Close Job</h3>
            <p className="muted mt-sm mb-sm" style={{fontSize: '14px'}}>Close this job directly only when an invoice is not required. Select the business reason before completing.</p>
            <div className="form-stack mt-md">
              <div>
                <label>No Invoice Reason</label>
                <select value={closeJobReason} onChange={(e) => setCloseJobReason(e.target.value)}>
                  <option value="">Select reason</option>
                  {NO_INVOICE_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label>Select Part to Deduct (Optional)</label>
                  <select value={closeJobPartId} onChange={e => setCloseJobPartId(e.target.value)}>
                    <option value="">Select a part...</option>
                    {inventory.map(item => {
                       const techQty = technicianParts
                         .filter(row => String(row.technician_id) === String(directCloseData.job.technician_id) && String(row.inventory_item_id) === String(item.id))
                         .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
                       return <option key={item.id} value={item.id}>{item.name} (Tech Stock: {techQty})</option>;
                    })}
                  </select>
                </div>
                <div style={{ width: "80px" }}>
                  <label>Qty</label>
                  <input type="number" min="1" value={closeJobPartQty} onChange={e => setCloseJobPartQty(e.target.value)} />
                </div>
                <button className="ghost-btn" style={{ marginBottom: "2px" }} onClick={() => {
                  if (!closeJobPartId) return alert("Select a part first.");
                  const item = inventory.find(i => String(i.id) === String(closeJobPartId));
                  const techQty = technicianParts
                         .filter(row => String(row.technician_id) === String(directCloseData.job.technician_id) && String(row.inventory_item_id) === String(closeJobPartId))
                         .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
                  const qty = Number(closeJobPartQty || 1);
                  if (qty <= 0) return alert("Quantity must be > 0.");
                  if (qty > techQty) return alert("Technician doesn't have enough stock. Available: " + techQty);
                  
                  setCloseJobParts([...closeJobParts, {
                    inventory_item_id: item.id,
                    part_name: item.name,
                    quantity: qty,
                    actual_selling_price: item.selling_price || 0,
                  }]);
                  setCloseJobPartId("");
                  setCloseJobPartQty("1");
                }}>Add</button>
              </div>

              {closeJobParts.length > 0 && (
                <div className="mt-sm">
                  <strong>Parts to Deduct:</strong>
                  {closeJobParts.map((p, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #eee" }}>
                      <span>{p.part_name} (Qty: {p.quantity})</span>
                      <button className="ghost-btn small" onClick={() => setCloseJobParts(closeJobParts.filter((_, i) => i !== idx))}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="row-actions mt-md" style={{justifyContent: "flex-end"}}>
                <button className="ghost-btn" disabled={closeJobSaving} onClick={() => { setDirectCloseData(null); setCloseJobParts([]); setCloseJobReason(""); }}>Cancel</button>
                <button className="primary-btn" disabled={closeJobSaving} onClick={confirmDirectClose}>
                  {closeJobSaving ? "Closing..." : "Confirm Close Job"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
