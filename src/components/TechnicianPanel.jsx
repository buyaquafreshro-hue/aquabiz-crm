import { useEffect, useRef, useState } from "react";
import { InvoiceBuilder } from "./InvoiceBuilder";
import { BookingMini } from "./shared";
import { supabase } from "../supabaseClient";
import { formatINR } from "../utils/appUtils";
import { calculateTechnicianStats, isOpenJobStatus } from "../utils/roleDashboard";
import { buildWhatsAppUrl, customerGreetingMessage } from "../utils/whatsappUtils";
import { useAutoHideMessage } from "../utils/toastUtils";
export function TechnicianPanel({ jobs, bookings, technicians, technicianParts = [], inventory, coverages, invoices, amcPlans, products, businessSettings, onUpdated }) {
  const [login, setLogin] = useState({ mobile: "", pin: "" });
  const [loggedInTech, setLoggedInTech] = useState(null);
  const [invoiceJobId, setInvoiceJobId] = useState(null);
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
    setLogin({ mobile: "", pin: "" });
    setInvoiceJobId(null);
    setMessage("");
  }

  useEffect(() => () => {
    if (trackingTimerRef.current) window.clearInterval(trackingTimerRef.current);
  }, []);

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
    setTracking({ active: true, type, jobId });
    setMessage(type === "job" ? "Job in progress." : "You are on duty.");
    saveLocation({ online: true, type, jobId });
    trackingTimerRef.current = window.setInterval(() => saveLocation({ online: true, type, jobId }), 60000);
  }

  async function stopTracking() {
    if (trackingTimerRef.current) window.clearInterval(trackingTimerRef.current);
    trackingTimerRef.current = null;
    await saveLocation({ online: false, type: tracking.type || "duty", jobId: tracking.jobId });
    setTracking({ active: false, type: "", jobId: null });
    setMessage("You are currently off duty.");
  }

  function logout() {
    if (tracking.active) stopTracking();
    setLoggedInTech(null);
    setInvoiceJobId(null);
    setMessage("");
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
    const { error } = await supabase
      .from("job_assignments")
      .update(payload)
      .eq("id", job.id);

    if (error) {
      alert(error.message);
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
            {myParts.map((row) => (
              <div className="mini-line" key={row.id}>{row.part_name} x {row.quantity}</div>
            ))}
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
