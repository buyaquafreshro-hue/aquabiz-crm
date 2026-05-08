import { formatINR } from "../utils/appUtils";

export function StatCard({ icon, label, value, onClick }) {
  const content = (
    <>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-arrow">View</span>
      </div>
      <strong>{value}</strong>
      <small>{label}</small>
    </>
  );

  if (onClick) {
    return (
      <button className="stat-card premium-stat clickable" type="button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="stat-card premium-stat">{content}</div>;
}

export function FormCard({ label, children }) {
  return <section className="form-card"><label>{label}</label>{children}</section>;
}

export function BookingRow({ booking, jobs, technicians }) {
  const job = jobs.find((j) => String(j.booking_id) === String(booking.id));
  const tech = technicians.find((t) => String(t.id) === String(job?.technician_id));
  return (
    <div className="booking-row">
      <div>
        <strong>{booking.customer_name}</strong>
        <p>{booking.service_type} | {formatINR(booking.booking_amount)} | {booking.mobile}</p>
      </div>
      <span className={job ? "status assigned" : "status unassigned"}>{job ? tech?.name || "Assigned" : "Unassigned"}</span>
    </div>
  );
}

export function BookingMini({ booking }) {
  if (!booking) return <p className="muted">Booking not found.</p>;
  return (
    <div className="booking-mini">
      <strong>{booking.customer_name}</strong>
      <p>{booking.mobile}</p>
      <p>{booking.service_type} | {formatINR(booking.booking_amount)}</p>
      <p>{booking.address}</p>
      {booking.complaint_notes && <p><strong>Notes:</strong> {booking.complaint_notes}</p>}
    </div>
  );
}

export function DetailDrawer({ title, subtitle, fields = [], children, onClose }) {
  if (!title) return null;

  return (
    <div className="detail-drawer-backdrop" role="presentation" onClick={onClose}>
      <section className="detail-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button className="ghost-btn small" type="button" onClick={onClose}>Close</button>
        </div>

        {fields.length > 0 && (
          <div className="detail-grid">
            {fields.map((field) => (
              <div key={field.label}>
                <span>{field.label}</span>
                <strong>{field.value || "-"}</strong>
              </div>
            ))}
          </div>
        )}

        {children}
      </section>
    </div>
  );
}

export function BottomNav({ page, setPage }) {
  const items = [
    ["dashboard", "Dashboard", "D"],
    ["customers", "Customers", "C"],
    ["jobs", "Jobs", "J"],
    ["collections", "Payments", "P"],
    ["settings", "More", "M"],
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([key, label, icon]) => (
        <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>
          <span>{icon}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}
