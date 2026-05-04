import { useEffect } from "react";

const successWords = [
  "success",
  "saved",
  "updated",
  "added",
  "assigned",
  "removed",
  "activated",
  "deactivated",
  "uploaded",
  "generated",
  "completed",
  "deducted",
  "closed",
  "rescheduled",
  "received",
  "approved",
  "paid",
  "deleted",
  "on duty",
  "off duty",
  "job in progress",
];

export function isSuccessToast(message = "") {
  const text = String(message || "").toLowerCase();
  return successWords.some((word) => text.includes(word));
}

export function toastAutoHideMs(message = "") {
  if (!message) return 0;
  return isSuccessToast(message) ? 3000 : 10000;
}

export function useAutoHideMessage(message, setMessage) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), toastAutoHideMs(message));
    return () => window.clearTimeout(timer);
  }, [message, setMessage]);
}
