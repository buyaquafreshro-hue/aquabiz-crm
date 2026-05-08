import { useEffect, useState } from "react";
import { LeadsPage } from "../pages/LeadsPage";
import { NewBooking } from "../pages/NewBooking";
import { formatINR } from "../utils/appUtils";
import { calculateTelecallerStats } from "../utils/roleDashboard";
import { clearRoleSession, getRoleSession, saveRoleSession } from "../utils/roleSession";
import { useAutoHideMessage } from "../utils/toastUtils";

export function TelecallerPanel({ telecallers, leads, services, technicians, customers = [], bookings = [], jobs = [], invoices = [], onUpdated, onLogout }) {
  const [login, setLogin] = useState({ mobile: "", pin: "" });
  const [loggedInTelecaller, setLoggedInTelecaller] = useState(null);
  const [tab, setTab] = useState("leads");
  const [leadDraft, setLeadDraft] = useState(null);
  const [message, setMessage] = useState("");
  useAutoHideMessage(message, setMessage);

  useEffect(() => {
    if (loggedInTelecaller || telecallers.length === 0) return;
    const session = getRoleSession();
    if (session?.role !== "telecaller") return;
    const user = telecallers.find((t) => String(t.id) === String(session.userId) && t.is_active !== false);
    if (!user) return;
    const timer = window.setTimeout(() => setLoggedInTelecaller(user), 0);
    return () => window.clearTimeout(timer);
  }, [loggedInTelecaller, telecallers]);

  function handleLogin() {
    setMessage("");
    const cleanMobile = login.mobile.trim();
    const cleanPin = login.pin.trim();

    if (!cleanMobile || !cleanPin) {
      setMessage("Mobile number and 6-digit PIN are required.");
      return;
    }

    const user = telecallers.find(
      (t) =>
        String(t.mobile || "").trim() === cleanMobile &&
        String(t.pin || "").trim() === cleanPin &&
        t.is_active !== false
    );

    if (!user) {
      setMessage("Invalid mobile number or PIN.");
      return;
    }

    setLoggedInTelecaller(user);
    saveRoleSession("telecaller", user);
    setLogin({ mobile: "", pin: "" });
  }

  if (!loggedInTelecaller) {
    return (
      <>
        <section className="page-head telecaller-page-head">
          <h2>Telecaller Login</h2>
          <p>Telecaller logs in using mobile number and 6-digit PIN.</p>
        </section>

        <section className="panel telecaller-login-panel">
          <div className="form-stack">
            <input placeholder="Telecaller mobile number" inputMode="numeric" value={login.mobile} onChange={(e) => setLogin({ ...login, mobile: e.target.value })} />
            <input placeholder="6 digit PIN" inputMode="numeric" maxLength="6" type="password" value={login.pin} onChange={(e) => setLogin({ ...login, pin: e.target.value })} />
            {message && <div className="error-box">{message}</div>}
            <button className="primary-btn big" onClick={handleLogin}>Login</button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="page-head telecaller-page-head">
        <h2>Telecaller App</h2>
        <p>Logged in: {loggedInTelecaller.name} ({loggedInTelecaller.mobile})</p>
      </section>

      <section className="cards-grid telecaller-stats-grid">
        {(() => {
          const stats = calculateTelecallerStats({ telecaller: loggedInTelecaller, leads, bookings, jobs, invoices });
          return (
            <>
              <div className="stat-card premium-stat"><strong>{stats.todaysFollowups}</strong><small>Today's Follow-ups</small></div>
              <div className="stat-card premium-stat"><strong>{stats.todaysLeads}</strong><small>Today's Leads</small></div>
              <div className="stat-card premium-stat"><strong>{stats.overdueFollowups}</strong><small>Overdue Follow-ups</small></div>
              <div className="stat-card premium-stat"><strong>{formatINR(stats.currentMonthRevenue)}</strong><small>Current Month Revenue</small></div>
              <div className="stat-card premium-stat"><strong>{formatINR(stats.lastMonthRevenue)}</strong><small>Last Month Revenue</small></div>
              <div className="stat-card premium-stat"><strong>{stats.totalBookingsCreated}</strong><small>Jobs/Bookings Created</small></div>
              <div className="stat-card premium-stat"><strong>{stats.openJobsCreated}</strong><small>Open Jobs Created</small></div>
            </>
          );
        })()}
      </section>

      <section className="panel telecaller-tabs-panel">
        <div className="row-actions">
          <button className={tab === "leads" ? "primary-btn small" : "ghost-btn small"} onClick={() => setTab("leads")}>Leads</button>
          <button className={tab === "booking" ? "primary-btn small" : "ghost-btn small"} onClick={() => setTab("booking")}>New Booking</button>
          <button className="ghost-btn small" onClick={() => { clearRoleSession(); setLoggedInTelecaller(null); onLogout?.(); }}>Logout</button>
        </div>
      </section>

      {tab === "leads" ? (
        <LeadsPage
          leads={leads.filter((lead) => !lead.assigned_telecaller_id || String(lead.assigned_telecaller_id) === String(loggedInTelecaller.id))}
          customers={customers}
          telecallers={telecallers}
          loggedInTelecaller={loggedInTelecaller}
          onUpdated={onUpdated}
          setPage={() => setTab("booking")}
          onCreateBooking={(lead) => { setLeadDraft(lead); setTab("booking"); }}
        />
      ) : (
        <NewBooking services={services} technicians={technicians} customers={customers} initialLead={leadDraft} telecaller={loggedInTelecaller} onDone={async () => { setLeadDraft(null); await onUpdated(); }} />
      )}
    </>
  );
}
