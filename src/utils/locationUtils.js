export function haversineMeters(a, b) {
  const earthRadius = 6371000;
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const deltaLat = toRad(Number(b.latitude) - Number(a.latitude));
  const deltaLng = toRad(Number(b.longitude) - Number(a.longitude));
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDuration(ms) {
  const minutes = Math.max(Math.round(ms / 60000), 0);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}

export function detectStops(points = []) {
  const sorted = [...points].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const stops = [];
  let cluster = [];

  for (const point of sorted) {
    if (!cluster.length || haversineMeters(cluster[0], point) <= 100) {
      cluster.push(point);
    } else {
      pushStop(cluster, stops);
      cluster = [point];
    }
  }

  pushStop(cluster, stops);
  return stops;
}

function pushStop(cluster, stops) {
  if (cluster.length < 2) return;
  const start = new Date(cluster[0].created_at);
  const end = new Date(cluster[cluster.length - 1].created_at);
  const durationMs = end - start;
  if (durationMs < 5 * 60 * 1000) return;
  const latitude = cluster.reduce((sum, point) => sum + Number(point.latitude || 0), 0) / cluster.length;
  const longitude = cluster.reduce((sum, point) => sum + Number(point.longitude || 0), 0) / cluster.length;
  stops.push({ start, end, durationMs, latitude, longitude });
}
