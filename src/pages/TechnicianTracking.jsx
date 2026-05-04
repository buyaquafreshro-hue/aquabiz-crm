import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { supabase } from "../supabaseClient";
import { detectStops, formatDuration } from "../utils/locationUtils";
import { todayISO } from "../utils/appUtils";
import { useAutoHideMessage } from "../utils/toastUtils";

const markerIcon = L.divIcon({
  className: "tech-location-pin",
  html: "<span></span>",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapFocus({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center, map]);
  return null;
}

export function TechnicianTracking({ technicians = [] }) {
  const [latest, setLatest] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [message, setMessage] = useState("");
  useAutoHideMessage(message, setMessage);

  async function loadLatest() {
    const { data, error } = await supabase.from("latest_technician_locations").select("*").order("created_at", { ascending: false });
    if (error) {
      setMessage(error.message);
      return;
    }
    setLatest(data || []);
  }

  async function loadHistory() {
    setHistory([]);
    if (!selectedTechnicianId || !date) return;
    const start = `${date}T00:00:00+05:30`;
    const end = `${date}T23:59:59+05:30`;
    const { data, error } = await supabase
      .from("technician_locations")
      .select("*")
      .eq("technician_id", selectedTechnicianId)
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }
    setHistory(data || []);
  }

  useEffect(() => {
    loadLatest();
    const timer = window.setInterval(loadLatest, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [selectedTechnicianId, date]);

  const latestRows = latest.map((row) => ({
    ...row,
    technician: technicians.find((tech) => String(tech.id) === String(row.technician_id)),
  }));
  const activeRows = latestRows.filter((row) => Number(row.latitude) && Number(row.longitude));
  const route = history.map((row) => [Number(row.latitude), Number(row.longitude)]).filter(([lat, lng]) => lat && lng);
  const stops = useMemo(() => detectStops(history), [history]);
  const mapCenter = route[0] || (activeRows[0] ? [Number(activeRows[0].latitude), Number(activeRows[0].longitude)] : [28.6139, 77.2090]);

  return (
    <>
      <section className="page-head">
        <h2>Technician Tracking</h2>
        <p>Live technician location, route history, and stop duration.</p>
      </section>

      {message && <div className="error-box">{message}</div>}

      <section className="panel tracking-layout">
        <div className="tracking-map">
          <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="leaflet-map">
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapFocus center={mapCenter} />
            {activeRows.map((row) => (
              <Marker key={row.technician_id} position={[Number(row.latitude), Number(row.longitude)]} icon={markerIcon}>
                <Popup>
                  <strong>{row.technician?.name || row.technician_name || "Technician"}</strong><br />
                  {row.is_online ? "Online" : "Offline"}<br />
                  Last: {new Date(row.created_at).toLocaleString()}
                </Popup>
              </Marker>
            ))}
            {route.length > 1 && <Polyline positions={route} color="#0f766e" weight={4} />}
          </MapContainer>
        </div>

        <div className="tracking-side">
          <h3>Route History</h3>
          <select value={selectedTechnicianId} onChange={(e) => setSelectedTechnicianId(e.target.value)}>
            <option value="">Select technician</option>
            {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="primary-btn small" onClick={() => { loadLatest(); loadHistory(); }}>Refresh</button>

          <h3>Latest Status</h3>
          {latestRows.length === 0 ? <p className="muted">No technician locations yet.</p> : latestRows.map((row) => (
            <div className="mini-card" key={row.technician_id}>
              <strong>{row.technician?.name || row.technician_name || "Technician"}</strong>
              <p>{row.is_online ? "Online" : "Offline"} | {new Date(row.created_at).toLocaleString()}</p>
              <p>{Number(row.latitude).toFixed(5)}, {Number(row.longitude).toFixed(5)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Stop Points</h3>
        {stops.length === 0 ? <p className="muted">No stop of 5 minutes or more found for selected date.</p> : stops.map((stop, index) => (
          <div className="booking-row" key={`${stop.start.toISOString()}-${index}`}>
            <div>
              <strong>Stop {index + 1}</strong>
              <p>{stop.start.toLocaleTimeString()} - {stop.end.toLocaleTimeString()} | {formatDuration(stop.durationMs)}</p>
              <p>{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}</p>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
