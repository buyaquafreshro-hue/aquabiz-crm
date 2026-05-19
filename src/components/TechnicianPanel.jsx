import { useEffect, useRef, useState } from "react";
import { InvoiceBuilder } from "./InvoiceBuilder";
import { BookingMini } from "./shared";
import { PartsTable } from "./PartsTable";
import { supabase } from "../supabaseClient";
import { findServiceInvoiceForBooking, formatINR } from "../utils/appUtils";
import { calculateTechnicianStats, isOpenJobStatus } from "../utils/roleDashboard";
import { clearRoleSession, getRoleSession, saveRoleSession } from "../utils/roleSession";
import { buildWhatsAppUrl, customerGreetingMessage } from "../utils/whatsappUtils";
import { useAutoHideMessage } from "../utils/toastUtils";
import { getText } from "../constants/text";

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

export function TechnicianPanel({ jobs, bookings, services = [], technicians, technicianParts = [], inventory, coverages, invoices, amcPlans, products, salesPersons = [], businessSettings, language = "en", onUpdated, onLogout }) {
  const t = getText(language);
  const [login, setLogin] = useState({ mobile: "", pin: "" });
  const [loggedInTech, setLoggedInTech] = useState(null);
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [completionJobId, setCompletionJobId] = useState(null);
  const [completionInvoiceType, setCompletionInvoiceType] = useState("service");
  const [openJobId, setOpenJobId] = useState(null);
  const [showPartsWithMe, setShowPartsWithMe] = useState(false);
  const [tracking, setTracking] = useState({ active: false, type: "", jobId: null });
  const [message, setMessage] = useState("");
  const trackingTimerRef = useRef(null);
  useAutoHideMessage(message, setMessage);

  const filteredJobs = loggedInTech
    ? jobs.filter((job) => {
        if (String(job.technician_id) !== String(loggedInTech.id) || !isOpenJobStatus(job.status) || job.is_active === false || job.assignment_status === "reassigned") return false;
        const booking = bookings.find(b => String(b.id) === String(job.booking_id));
        if (booking?.booking_date) {
           const today = new Date();
           const yyyy = today.getFullYear();
           const mm = String(today.getMonth() + 1).padStart(2, '0');
           const dd = String(today.getDate()).padStart(2, '0');
           const todayDateStr = `${yyyy}-${mm}-${dd}`;
           if (booking.booking_date > todayDateStr) return false;
        }
        return true;
      })
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

  function openCompletion(job, type = "service") {
    setCompletionInvoiceType(type);
    setCompletionJobId(job.id);
    setInvoiceJobId(null);
  }

  async function updateStatus(job, status) {
    const booking = bookings.find((b) => String(b.id) === String(job.booking_id));

    if (status === "Completed") {
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
          <h2>{t.technicianApp} {t.login}</h2>
          <p>{language === "hi" ? "टेक्नीशियन मोबाइल नंबर और 6 अंकों के पिन से लॉगिन करें।" : "Technician logs in using mobile number and 6-digit PIN."}</p>
        </section>

        <section className="panel technician-login-panel">
          <h3>{t.login}</h3>

          <div className="form-stack">
            <input
              placeholder={language === "hi" ? "टेक्नीशियन मोबाइल नंबर" : "Technician mobile number"}
              inputMode="numeric"
              value={login.mobile}
              onChange={(e) => setLogin({ ...login, mobile: e.target.value })}
              autoComplete="off"
            />

            <input
              placeholder={t.pin6}
              inputMode="numeric"
              maxLength="6"
              type="password"
              value={login.pin}
              onChange={(e) => setLogin({ ...login, pin: e.target.value })}
              autoComplete="new-password"
            />

            {message && <div className="error-box">{message}</div>}

            <button className="primary-btn big" onClick={handleLogin}>
              {t.login}
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="page-head technician-page-head">
        <h2>{t.technicianApp}</h2>
        <p>{language === "hi" ? "लॉगिन" : "Logged in"}: {loggedInTech.name} ({loggedInTech.mobile})</p>
      </section>

      <section className="cards-grid technician-stats-grid">
        {(() => {
          const stats = calculateTechnicianStats({ technician: loggedInTech, jobs, bookings, invoices });
          return (
            <>
              <div className="stat-card premium-stat"><strong>{stats.openPendingJobs}</strong><small>{language === "hi" ? "खुले / बकाया जॉब्स" : "Open / Pending Jobs"}</small></div>
              <div className="stat-card premium-stat"><strong>{formatINR(stats.currentMonthRevenue)}</strong><small>{language === "hi" ? "इस महीने की आय" : "Current Month Revenue"}</small></div>
              <div className="stat-card premium-stat"><strong>{formatINR(stats.lastMonthRevenue)}</strong><small>{language === "hi" ? "पिछले महीने की आय" : "Last Month Revenue"}</small></div>
              <div className="stat-card premium-stat"><strong>{stats.totalCompletedJobs}</strong><small>{language === "hi" ? "कुल पूरे हुए जॉब्स" : "Total Jobs Completed"}</small></div>
              <div className="stat-card premium-stat"><strong>{stats.repeatJobs}</strong><small>{language === "hi" ? "रिपीट जॉब्स" : "Repeat Jobs"}</small></div>
            </>
          );
        })()}
      </section>

      <section className="panel technician-tracking-panel">
        <div className="panel-head">
          <div>
            <h3>{t.dutyStatus}</h3>
            <p className="muted">{tracking.active ? (language === "hi" ? "आप ड्यूटी पर हैं" : "You are on duty") : (language === "hi" ? "आप अभी ऑफ ड्यूटी हैं" : "You are currently off duty")}</p>
          </div>
          <span className={tracking.active ? "status assigned" : "status unassigned"}>{tracking.active ? "Online" : "Offline"}</span>
        </div>
        <div className="row-actions">
          <button className="primary-btn small" onClick={() => startTracking("duty", null)} disabled={tracking.active}>{t.startDuty}</button>
          <button className="ghost-btn small" onClick={stopTracking} disabled={!tracking.active}>{t.endDuty}</button>
        </div>
        <p className="helper">Duty status saves every 60 seconds while duty or job is active.</p>
        {message && <div className={message.includes("duty") || message.includes("Job in progress") ? "success-box" : "error-box"}>{message}</div>}
      </section>

      <section className="panel technician-jobs-panel">
        <div className="panel-head">
          <h3>{t.myJobs}</h3>
          <button className="ghost-btn small" onClick={logout}>{t.logout}</button>
        </div>

        {myParts.length > 0 && (
          <>
            <button
              className="parts-with-me-card"
              type="button"
              onClick={() => setShowPartsWithMe(!showPartsWithMe)}
            >
              <div>
                <strong>{t.partsWithMe}</strong>
                <p>{myParts.length} assigned item{myParts.length > 1 ? "s" : ""}</p>
              </div>
              <span className="status assigned">{showPartsWithMe ? t.hide : t.view}</span>
            </button>

            {showPartsWithMe && (
              <div className="technician-parts-panel technician-parts-with-me">
                <PartsTable
                  items={myParts.map((row) => ({ ...row, name: row.part_name, stock_qty: row.quantity, category_name: "With technician" }))}
                  showStockFilter={false}
                  emptyText="No parts with you."
                  columns={[
                    { key: "part_name", label: "Part", render: (row) => <strong>{row.part_name}</strong> },
                    { key: "quantity", label: "Qty", sortValue: (row) => Number(row.quantity || 0), render: (row) => <strong>{row.quantity}</strong> },
                    { key: "notes", label: "Notes", render: (row) => row.notes || "-" },
                  ]}
                />
              </div>
            )}
          </>
        )}

        {filteredJobs.length === 0 ? (
          <p className="muted">{language === "hi" ? "आपको कोई खुला जॉब असाइन नहीं है।" : "No open jobs assigned to you."}</p>
        ) : (
          <div className="cards-grid">
            {filteredJobs.map((job) => {
              const booking = bookings.find((b) => String(b.id) === String(job.booking_id));
              const hasInvoice = !!findServiceInvoiceForBooking(invoices, job.booking_id);
              const isOpen = String(openJobId) === String(job.id);

              return (
                <div className="job-card technician-job-card" key={job.id}>
                  <div 
                    className="booking-card-head" 
                    style={{ cursor: "pointer" }}
                    onClick={() => setOpenJobId(isOpen ? null : job.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setOpenJobId(isOpen ? null : job.id); }}
                  >
                    <div>
                      <strong>{booking?.customer_name || "Customer"}</strong>
                      <p>{booking?.service_type || "Service"} • {booking?.mobile || ""}</p>
                      {booking?.area && <p className="success-line" style={{ fontSize: '12px', marginTop: '4px' }}><strong>Area:</strong> {booking.area}</p>}
                      <p className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>{booking?.address || "Address not added"}</p>
                      {booking?.complaint_notes && (
                        <p className="danger-line" style={{ fontSize: '12px', marginTop: '4px' }}><strong>Notes:</strong> {booking.complaint_notes}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <span className={job.status === "Assigned" ? "status unassigned" : "status assigned"}>{job.status}</span>
                      <span className="link-btn" style={{ fontSize: '13px' }}>{isOpen ? t.hide : t.details}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-sm" style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                      {booking ? <BookingMini booking={booking} /> : <p className="muted">Booking not found.</p>}

                      <p className="mt-sm">
                        <strong>{t.currentStatus}:</strong> {job.status}
                      </p>

                      <div className="row-actions mt-sm">
                        <a className="ghost-btn small" href={`tel:${booking?.mobile || ""}`}>
                          {t.call}
                        </a>

                        <a
                          className="ghost-btn small"
                          href={buildWhatsAppUrl(booking?.mobile, customerGreetingMessage(booking?.customer_name, businessSettings?.business_name))}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>

                        {job.status === "Assigned" && (
                          <button
                            className="primary-btn small"
                            onClick={() => {
                              updateStatus(job, "In Progress");
                              startTracking("job", job.id);
                            }}
                          >
                            {t.startJob}
                          </button>
                        )}

                        {job.status === "In Progress" && (
                          <button
                            className="primary-btn small"
                            onClick={() => updateStatus(job, "Completed")}
                          >
                            {t.closeJob}
                          </button>
                        )}

                        {job.status === "In Progress" && tracking.active && String(tracking.jobId || "") === String(job.id) && (
                          <button className="ghost-btn small" onClick={stopTracking}>{t.stopDuty}</button>
                        )}

                        {hasInvoice && <span className="status assigned">{t.invoiceGenerated}</span>}
                      </div>

                      {completionJobId === job.id && booking && (
                        <div className="sub-panel mt-sm">
                          <h3>{language === "hi" ? "जॉब बंद करें और पार्ट्स जोड़ें" : "Close Job & Add Parts"}</h3>
                          <BookingMini booking={booking} />
                          <p className="muted">Please add any used parts below. If this is a free/warranty service (₹0), an OTP will be required to close.</p>
                          <div className="row-actions">
                            <button className="primary-btn small" onClick={() => setCompletionInvoiceType("service")}>{language === "hi" ? "पार्ट्स जोड़ें और बंद करें" : "Add Parts & Close"}</button>
                            <button className="ghost-btn small" onClick={() => setCompletionInvoiceType("zero")}>{language === "hi" ? "फ्री सर्विस / ₹0 बंद करें" : "Free Service / ₹0 Close"}</button>
                            <button className="ghost-btn small" onClick={() => { setCompletionJobId(null); setMessage("Job close cancelled."); }}>{language === "hi" ? "रद्द करें" : "Cancel"}</button>
                          </div>
                          <InvoiceBuilder
                            key={`${job.id}-${completionInvoiceType}`}
                            job={job}
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
                            language={language}
                            defaultInvoiceType={completionInvoiceType}
                            completionMode
                            closedBy={{ id: loggedInTech.id, name: loggedInTech.name, role: "Technician" }}
                            onClose={() => setCompletionJobId(null)}
                            onDone={async () => {
                              setCompletionJobId(null);
                              await onUpdated();
                            }}
                          />
                        </div>
                      )}

                      {invoiceJobId === job.id && booking && (
                        <div className="mt-sm">
                          <InvoiceBuilder
                            job={job}
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
                            language={language}
                            closedBy={{ id: loggedInTech.id, name: loggedInTech.name, role: "Technician" }}
                            onClose={() => setInvoiceJobId(null)}
                            onDone={async () => {
                              setInvoiceJobId(null);
                              await onUpdated();
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
