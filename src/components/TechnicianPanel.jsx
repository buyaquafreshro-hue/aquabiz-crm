import { useEffect, useRef, useState } from "react";
import { InvoiceBuilder } from "./InvoiceBuilder";
import { BookingMini } from "./shared";
import { PartsTable } from "./PartsTable";
import { completeJobWithInvoice } from "../services/jobAssignments";
import { supabase } from "../supabaseClient";
import { formatINR } from "../utils/appUtils";
import { calculateTechnicianStats, isOpenJobStatus } from "../utils/roleDashboard";
import { clearRoleSession, getRoleSession, saveRoleSession } from "../utils/roleSession";
import { buildWhatsAppUrl, customerGreetingMessage } from "../utils/whatsappUtils";
import { useAutoHideMessage } from "../utils/toastUtils";

const TECH_DUTY_SESSION_KEY = "aquabiz_technician_duty_session";
const TECH_DUTY_SESSION_MS = 18 * 60 * 60 * 1000;

function saveDutySession(technician, tracking) {
  if (!technician?.id || !tracking?.active) return;
  localStorage.setItem(TECH_DUTY_SESSION_KEY, JSON.stringify({
    technicianId: technician.id,
    active: true,
    type: tracking.type || "duty",
    jobId: tracking.jobId || null,
    updatedAt: new Date().toISOString(),
  }));
}

function getDutySession(technicianId) {
  const stored = localStorage.getItem(TECH_DUTY_SESSION_KEY);
  if (!stored || !technicianId) return null;

  try {
    const parsed = JSON.parse(stored);
    const updatedTime = new Date(parsed.updatedAt).getTime();
    const expired = Number.isNaN(updatedTime) || Date.now() - updatedTime > TECH_DUTY_SESSION_MS;
    if (expired || String(parsed.technicianId) !== String(technicianId) || !parsed.active) {
      localStorage.removeItem(TECH_DUTY_SESSION_KEY);
      return null;
    }
    return {
      active: true,
      type: parsed.type || "duty",
      jobId: parsed.jobId || null,
    };
  } catch {
    localStorage.removeItem(TECH_DUTY_SESSION_KEY);
    return null;
  }
}

function clearDutySession() {
  localStorage.removeItem(TECH_DUTY_SESSION_KEY);
}

export function TechnicianPanel({ jobs, bookings, technicians, technicianParts = [], inventory, coverages, invoices, amcPlans, products, salesPersons = [], businessSettings, onUpdated, onLogout }) {
  const [login, setLogin] = useState({ mobile: "", pin: "" });
  const [loggedInTech, setLoggedInTech] = useState(null);
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [completionJobId, setCompletionJobId] = useState(null);
  const [completionInvoiceType, setCompletionInvoiceType] = useState("service");
  const [tracking, setTracking] = useState({ active: false, type: "", jobId: null });
  const [message, setMessage] = useState("");
  const trackingTimerRef = useRef(null);
  useAutoHideMessage(message, setMessage);

  const filteredJobs = loggedInTech
    ? jobs.filter((job) => String(job.technician_id) === String(loggedInTech.id) && isOpenJobStatus(job.status))
    : [];
  const myParts = loggedInTech
    ? technicianParts.filter((row) => String(row.technician_id) === String(loggedInTech.id))
    : [];

  useEffect(() => {
    if (loggedInTech || technicians.length === 0) return;
    const session = getRoleSession();
    if (session?.role !== "technician") return;
    const tech = technicians.find((t) => String(t.id) === String(session.userId) && t.is_active !== false);
    if (!tech) return;
    const timer = window.setTimeout(() => {
      setLoggedInTech(tech);
      const dutySession = getDutySession(tech.id);
      if (dutySession) {
        setTracking(dutySession);
        setMessage(dutySession.type === "job" ? "Job duty resumed." : "Duty resumed.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loggedInTech, technicians]);

  function handleLogin() {
    setMessage("");

    const cleanMobile = login.mobile.trim();
    const cleanPin = login.pin.trim();

    if (!cleanMobile || !cleanPin) {
      setMessage("Mobile number and 6-digit PIN are required.");
      return;
    }

    const tech = technicians.find(
      (t) =>
        String(t.mobile || "").trim() === cleanMobile &&
        String(t.pin || "").trim() === cleanPin &&
        t.is_active !== false
    );

    if (!tech) {
      setMessage("Invalid mobile number or PIN.");
      return;
    }

    setLoggedInTech(tech);
    const dutySession = getDutySession(tech.id);
    if (dutySession) {
      setTracking(dutySession);
      setMessage(dutySession.type === "job" ? "Job duty resumed." : "Duty resumed.");
    }
    saveRoleSession("technician", tech);
    setLogin({ mobile: "", pin: "" });
    setInvoiceJobId(null);
    setCompletionJobId(null);
    if (!dutySession) setMessage("");
  }

  useEffect(() => {
    if (!loggedInTech || !tracking.active) return undefined;

    if (trackingTimerRef.current) window.clearInterval(trackingTimerRef.current);
    saveDutySession(loggedInTech, tracking);
    trackingTimerRef.current = window.setInterval(() => {
      saveDutySession(loggedInTech, tracking);
      saveLocation({ online: true, type: tracking.type || "duty", jobId: tracking.jobId || null });
    }, 60000);

    const saveOnReturn = () => {
      if (document.visibilityState === "visible") {
        saveDutySession(loggedInTech, tracking);
        saveLocation({ online: true, type: tracking.type || "duty", jobId: tracking.jobId || null });
      }
    };

    document.addEventListener("visibilitychange", saveOnReturn);
    window.addEventListener("focus", saveOnReturn);

    return () => {
      if (trackingTimerRef.current) window.clearInterval(trackingTimerRef.current);
      trackingTimerRef.current = null;
      document.removeEventListener("visibilitychange", saveOnReturn);
      window.removeEventListener("focus", saveOnReturn);
    };
  }, [loggedInTech, tracking]);

  async function saveLocation({ online = true, type = "duty", jobId = null } = {}) {
    if (!loggedInTech) return;
    if (!navigator.geolocation) {
      setMessage("Duty status is not supported on this device/browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const battery = navigator.getBattery ? await navigator.getBattery().catch(() => null) : null;
        const { error } = await supabase.from("technician_locations").insert([{
          technician_id: loggedInTech.id,
          technician_name: loggedInTech.name,
          job_assignment_id: jobId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          battery_level: battery ? Math.round(Number(battery.level || 0) * 100) : null,
          is_online: online,
          tracking_type: type,
        }]);
        if (error) setMessage(error.message);
      },
      () => setMessage("Permission denied. Please allow duty permission."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }

  function startTracking(type = "duty", jobId = null) {
    if (trackingTimerRef.current) window.clearInterval(trackingTimerRef.current);
    const nextTracking = { active: true, type, jobId };
    setTracking(nextTracking);
    saveDutySession(loggedInTech, nextTracking);
    setMessage(type === "job" ? "Job in progress." : "You are on duty.");
    saveLocation({ online: true, type, jobId });
  }

  async function stopTracking() {
    if (trackingTimerRef.current) window.clearInterval(trackingTimerRef.current);
    trackingTimerRef.current = null;
    await saveLocation({ online: false, type: tracking.type || "duty", jobId: tracking.jobId });
    clearDutySession();
    setTracking({ active: false, type: "", jobId: null });
    setMessage("You are currently off duty.");
  }

  function logout() {
    if (tracking.active) stopTracking();
    clearDutySession();
    clearRoleSession();
    setLoggedInTech(null);
    setInvoiceJobId(null);
    setCompletionJobId(null);
    setMessage("");
    onLogout?.();
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
    setCompletionInvoiceType(type);
    setCompletionJobId(job.id);
    setInvoiceJobId(null);
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
    const { error } = await supabase
      .from("job_assignments")
      .update(payload)
      .eq("id", job.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await onUpdated();
  }

  if (!loggedInTech) {
    return (
      <>
        <section className="page-head technician-page-head">
          <h2>Technician App Login</h2>
          <p>Technician logs in using mobile number and 6-digit PIN.</p>
        </section>

        <section className="panel technician-login-panel">
          <h3>Login</h3>

          <div className="form-stack">
            <input
              placeholder="Technician mobile number"
              inputMode="numeric"
              value={login.mobile}
              onChange={(e) => setLogin({ ...login, mobile: e.target.value })}
              autoComplete="off"
            />

            <input
              placeholder="6 digit PIN"
              inputMode="numeric"
              maxLength="6"
              type="password"
              value={login.pin}
              onChange={(e) => setLogin({ ...login, pin: e.target.value })}
              autoComplete="new-password"
            />

            {message && <div className="error-box">{message}</div>}

            <button className="primary-btn big" onClick={handleLogin}>
              Login
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="page-head technician-page-head">
        <h2>Technician App</h2>
        <p>Logged in: {loggedInTech.name} ({loggedInTech.mobile})</p>
      </section>

      <section className="cards-grid technician-stats-grid">
        {(() => {
          const stats = calculateTechnicianStats({ technician: loggedInTech, jobs, bookings, invoices });
          return (
            <>
              <div className="stat-card premium-stat"><strong>{stats.openPendingJobs}</strong><small>Open / Pending Jobs</small></div>
              <div className="stat-card premium-stat"><strong>{formatINR(stats.currentMonthRevenue)}</strong><small>Current Month Revenue</small></div>
              <div className="stat-card premium-stat"><strong>{formatINR(stats.lastMonthRevenue)}</strong><small>Last Month Revenue</small></div>
              <div className="stat-card premium-stat"><strong>{stats.totalCompletedJobs}</strong><small>Total Jobs Completed</small></div>
              <div className="stat-card premium-stat"><strong>{stats.repeatJobs}</strong><small>Repeat Jobs</small></div>
            </>
          );
        })()}
      </section>

      <section className="panel technician-tracking-panel">
        <div className="panel-head">
          <div>
            <h3>Duty Status</h3>
            <p className="muted">{tracking.active ? "You are on duty" : "You are currently off duty"}</p>
          </div>
          <span className={tracking.active ? "status assigned" : "status unassigned"}>{tracking.active ? "Online" : "Offline"}</span>
        </div>
        <div className="row-actions">
          <button className="primary-btn small" onClick={() => startTracking("duty", null)} disabled={tracking.active}>Start Duty</button>
          <button className="ghost-btn small" onClick={stopTracking} disabled={!tracking.active}>End Duty</button>
        </div>
        <p className="helper">Duty status saves every 60 seconds while duty or job is active.</p>
        {message && <div className={message.includes("duty") || message.includes("Job in progress") ? "success-box" : "error-box"}>{message}</div>}
      </section>

      <section className="panel technician-jobs-panel">
        <div className="panel-head">
          <h3>My Jobs</h3>
          <button className="ghost-btn small" onClick={logout}>Logout</button>
        </div>

        {myParts.length > 0 && (
          <div className="sub-panel">
            <h3>Parts With Me</h3>
            <PartsTable
              items={myParts.map((row) => ({ ...row, name: row.part_name, stock_qty: row.quantity, category_name: "With technician" }))}
              showStockFilter={false}
              emptyText="No parts with you."
              columns={[
                { key: "part_name", label: "Part" },
                { key: "quantity", label: "Qty", sortValue: (row) => Number(row.quantity || 0), render: (row) => <strong>{row.quantity}</strong> },
                { key: "notes", label: "Notes", render: (row) => row.notes || "-" },
              ]}
            />
          </div>
        )}

        {filteredJobs.length === 0 ? (
          <p className="muted">No open jobs assigned to you.</p>
        ) : (
          filteredJobs.map((job) => {
            const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
            const hasInvoice = invoices.some((i) => String(i.booking_id) === String(job.booking_id));

            return (
              <div className="job-card technician-job-card" key={job.id}>
                {booking ? <BookingMini booking={booking} /> : <p className="muted">Booking not found.</p>}

                <p>
                  <strong>Status:</strong> {job.status}
                </p>

                <div className="row-actions">
                  <a className="ghost-btn small" href={`tel:${booking?.mobile || ""}`}>
                    Call
                  </a>

                  <a
                    className="ghost-btn small"
                    href={buildWhatsAppUrl(booking?.mobile, customerGreetingMessage(booking?.customer_name, businessSettings?.business_name))}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>

                  <button
                    className="primary-btn small"
                    onClick={() => updateStatus(job, "In Progress")}
                  >
                    Start Job
                  </button>

                  <button
                    className="ghost-btn small"
                    onClick={() => startTracking("job", job.id)}
                  >
                    Job in progress
                  </button>

                  {tracking.active && String(tracking.jobId || "") === String(job.id) && (
                    <button className="ghost-btn small" onClick={stopTracking}>End Duty</button>
                  )}

                  <button
                    className="primary-btn small"
                    onClick={() => updateStatus(job, "Completed")}
                  >
                    Complete Job
                  </button>

                  {!hasInvoice && booking && (
                    <button
                      className="primary-btn small"
                      onClick={() => setInvoiceJobId(invoiceJobId === job.id ? null : job.id)}
                    >
                      Generate Invoice
                    </button>
                  )}

                  {hasInvoice && <span className="status assigned">Invoice Generated</span>}
                </div>

                {completionJobId === job.id && booking && (
                  <div className="sub-panel">
                    <h3>Generate invoice for this job?</h3>
                    <BookingMini booking={booking} />
                    <p className="muted">Job was not closed yet. Generate an invoice first, then the job will be completed.</p>
                    <div className="row-actions">
                      <button className="primary-btn small" onClick={() => setCompletionInvoiceType("service")}>Generate Invoice</button>
                      <button className="ghost-btn small" onClick={() => setCompletionInvoiceType("zero")}>Generate ₹0 Invoice</button>
                      <button className="ghost-btn small" onClick={() => { setCompletionJobId(null); setMessage("Job was not closed because invoice was not generated."); }}>Cancel</button>
                    </div>
                    <InvoiceBuilder
                      key={`${job.id}-${completionInvoiceType}`}
                      job={job}
                      booking={booking}
                      inventory={inventory}
                      technicianParts={technicianParts}
                      coverages={coverages}
                      invoices={invoices}
                      amcPlans={amcPlans}
                      products={products}
                      salesPersons={salesPersons}
                      businessSettings={businessSettings}
                      defaultInvoiceType={completionInvoiceType}
                      completionMode
                      onClose={() => setCompletionJobId(null)}
                      onDone={async () => {
                        setCompletionJobId(null);
                        await onUpdated();
                      }}
                    />
                  </div>
                )}

                {invoiceJobId === job.id && booking && (
                  <InvoiceBuilder
                    job={job}
                    booking={booking}
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
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
