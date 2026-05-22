import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { formatISTDate, todayISO } from "../utils/appUtils";

export function CommunicationReportPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Filters
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [mobileFilter, setMobileFilter] = useState("");

  async function fetchLogs() {
    setLoading(true);
    try {
      // Query communication_logs
      let query = supabase.from("communication_logs").select("*").order("created_at", { ascending: false });

      // Apply date filters locally or on query
      // To ensure correct timezone handling of timestamptz with todayISO local date boundaries,
      // we query within the UTC range that covers the selected local days (Asia/Kolkata timezone offset is UTC+5:30)
      const startUtc = new Date(`${startDate}T00:00:00+05:30`).toISOString();
      const endUtc = new Date(`${endDate}T23:59:59+05:30`).toISOString();
      
      query = query.gte("created_at", startUtc).lte("created_at", endUtc);

      const { data, error } = await query;
      if (error) {
        setMessage(error.message);
      } else {
        setLogs(data || []);
      }
    } catch (err) {
      setMessage("Failed to fetch communication logs.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  // Derive unique staff list for filters
  const staffList = Array.from(
    new Map(logs.map((log) => [log.actor_id || log.actor_name, { name: log.actor_name, role: log.actor_role }])).values()
  );

  // Filter logs locally based on select/input filters
  const filteredLogs = logs.filter((log) => {
    if (selectedRole && log.actor_role !== selectedRole) return false;
    if (selectedStaff && log.actor_name !== selectedStaff) return false;
    if (selectedAction && log.action_type !== selectedAction) return false;
    if (mobileFilter && !String(log.customer_mobile || "").includes(mobileFilter.trim())) return false;
    return true;
  });

  // Calculate Summary metrics
  const today = todayISO();
  const logsToday = logs.filter((log) => {
    const logDate = log.created_at ? new Date(log.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "";
    return logDate === today;
  });

  const totalCallsToday = logsToday.filter((l) => l.action_type === "call").length;
  const totalWhatsAppToday = logsToday.filter((l) => l.action_type === "whatsapp").length;

  // Telecaller-wise counts (for selected date range)
  const telecallerCounts = filteredLogs
    .filter((l) => l.actor_role === "telecaller")
    .reduce((acc, curr) => {
      acc[curr.actor_name] = (acc[curr.actor_name] || 0) + 1;
      return acc;
    }, {});

  // Technician-wise counts (for selected date range)
  const technicianCounts = filteredLogs
    .filter((l) => l.actor_role === "technician")
    .reduce((acc, curr) => {
      acc[curr.actor_name] = (acc[curr.actor_name] || 0) + 1;
      return acc;
    }, {});

  // Totals for filtered date range
  const totalCallsRange = filteredLogs.filter((l) => l.action_type === "call").length;
  const totalWhatsAppRange = filteredLogs.filter((l) => l.action_type === "whatsapp").length;
  const isToday = startDate === todayISO() && endDate === todayISO();

  return (
    <>
      <section className="page-head">
        <h2>Communication Logs Report</h2>
        <p>Track contact attempts (Call / WhatsApp clicks) across customer profiles, bookings, and leads.</p>
      </section>

      {/* Summary Cards */}
      <section className="cards-grid">
        <div className="stat-card premium-stat">
          <strong>{totalCallsRange}</strong>
          <small>📞 Call Clicks {isToday ? "Today" : `(${startDate} – ${endDate})`}</small>
        </div>
        <div className="stat-card premium-stat">
          <strong>{totalWhatsAppRange}</strong>
          <small>💬 WhatsApp Clicks {isToday ? "Today" : `(${startDate} – ${endDate})`}</small>
        </div>
        <div className="stat-card premium-stat">
          <div style={{ maxHeight: "70px", overflowY: "auto", fontSize: "12px", textAlign: "left", width: "100%" }}>
            {Object.keys(telecallerCounts).length === 0 ? (
              <span className="muted">No telecaller clicks</span>
            ) : (
              Object.entries(telecallerCounts).map(([name, count]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{name}:</span>
                  <strong>{count}</strong>
                </div>
              ))
            )}
          </div>
          <small>Telecaller Clicks (Filtered)</small>
        </div>
        <div className="stat-card premium-stat">
          <div style={{ maxHeight: "70px", overflowY: "auto", fontSize: "12px", textAlign: "left", width: "100%" }}>
            {Object.keys(technicianCounts).length === 0 ? (
              <span className="muted">No technician clicks</span>
            ) : (
              Object.entries(technicianCounts).map(([name, count]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{name}:</span>
                  <strong>{count}</strong>
                </div>
              ))
            )}
          </div>
          <small>Technician Clicks (Filtered)</small>
        </div>
      </section>

      {/* Filters Box */}
      <section className="panel">
        <h3>Filter Log Entries</h3>
        <div className="form-stack">
          <div className="two-col">
            <label className="settings-field">
              <span>Start Date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="settings-field">
              <span>End Date</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>

          <div className="two-col mt-sm">
            <label className="settings-field">
              <span>Filter by Role</span>
              <select value={selectedRole} onChange={(e) => { setSelectedRole(e.target.value); setSelectedStaff(""); }}>
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="telecaller">Telecaller</option>
                <option value="technician">Technician</option>
                <option value="sales">Sales Executive</option>
              </select>
            </label>

            <label className="settings-field">
              <span>Filter by Staff Member</span>
              <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                <option value="">All Staff</option>
                {staffList
                  .filter((s) => !selectedRole || s.role === selectedRole)
                  .map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.role})
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="two-col mt-sm">
            <label className="settings-field">
              <span>Action Type</span>
              <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
                <option value="">All Actions</option>
                <option value="call">Call Only</option>
                <option value="whatsapp">WhatsApp Only</option>
              </select>
            </label>

            <label className="settings-field">
              <span>Customer Mobile</span>
              <input
                placeholder="Search mobile number"
                type="text"
                value={mobileFilter}
                onChange={(e) => setMobileFilter(e.target.value)}
              />
            </label>
          </div>
        </div>
      </section>

      {/* Logs Table */}
      <section className="panel">
        <div className="panel-head">
          <h3>Log History ({filteredLogs.length} entries)</h3>
          <button className="ghost-btn small" onClick={fetchLogs}>Refresh</button>
        </div>

        {message && <div className="error-box">{message}</div>}

        {loading ? (
          <p className="muted">Loading communication logs...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="muted">No communication logs match the filters.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f2f4ff", borderBottom: "1px solid #ddd" }}>
                  <th style={{ padding: "8px", textAlign: "left" }}>Date & Time (IST)</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Staff Member</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Role</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Action</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Customer Name</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Mobile</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Source Screen</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px" }}>{formatISTDate(log.created_at)}</td>
                    <td style={{ padding: "8px" }}><strong>{log.actor_name || "Admin"}</strong></td>
                    <td style={{ padding: "8px" }}>
                      <span className="status assigned" style={{ fontSize: "11px", textTransform: "capitalize" }}>
                        {log.actor_role}
                      </span>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <span style={{
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        background: log.action_type === "call" ? "#e0f2fe" : "#dcfce7",
                        color: log.action_type === "call" ? "#0369a1" : "#15803d"
                      }}>
                        {log.action_type === "call" ? "📞 Call" : "💬 WhatsApp"}
                      </span>
                    </td>
                    <td style={{ padding: "8px" }}>{log.customer_name || "-"}</td>
                    <td style={{ padding: "8px" }}>{log.customer_mobile || "-"}</td>
                    <td style={{ padding: "8px", color: "#666" }}>{log.source_screen || "-"}</td>
                    <td style={{ padding: "8px", fontStyle: "italic", color: "#888" }}>{log.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
