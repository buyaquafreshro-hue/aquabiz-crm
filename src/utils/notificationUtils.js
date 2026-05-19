export function getNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}

export function showBrowserNotification(title, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  new Notification(title, {
    icon: "/app-icon-192.png",
    badge: "/favicon-32x32.png",
    ...options,
  });
  return true;
}
