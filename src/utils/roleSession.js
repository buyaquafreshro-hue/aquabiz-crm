const ROLE_SESSION_KEYS = [
  "aquabiz_user_role",
  "aquabiz_user_id",
  "aquabiz_user_name",
  "aquabiz_user_mobile",
  "aquabiz_session_created_at",
  "aquabiz_technician_id",
  "aquabiz_telecaller_id",
  "aquabiz_sales_person_id",
];

const ROLE_SESSION_DAYS = 7;
const ROLE_SESSION_MS = ROLE_SESSION_DAYS * 24 * 60 * 60 * 1000;

export function saveRoleSession(role, user) {
  if (!role || !user?.id) return;

  clearRoleSession();
  localStorage.setItem("aquabiz_user_role", role);
  localStorage.setItem("aquabiz_user_id", String(user.id));
  localStorage.setItem("aquabiz_user_name", user.name || "");
  localStorage.setItem("aquabiz_user_mobile", user.mobile || "");
  localStorage.setItem("aquabiz_session_created_at", new Date().toISOString());

  if (role === "technician") localStorage.setItem("aquabiz_technician_id", String(user.id));
  if (role === "telecaller") localStorage.setItem("aquabiz_telecaller_id", String(user.id));
  if (role === "sales") localStorage.setItem("aquabiz_sales_person_id", String(user.id));
}

export function getRoleSession() {
  const role = localStorage.getItem("aquabiz_user_role");
  const userId = localStorage.getItem("aquabiz_user_id");
  const createdAt = localStorage.getItem("aquabiz_session_created_at");

  if (!role || !userId || !createdAt) return null;

  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime) || Date.now() - createdTime > ROLE_SESSION_MS) {
    clearRoleSession();
    return null;
  }

  return {
    role,
    userId,
    name: localStorage.getItem("aquabiz_user_name") || "",
    mobile: localStorage.getItem("aquabiz_user_mobile") || "",
  };
}

export function clearRoleSession() {
  ROLE_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem("aquabiz_sales_person");
}

export function roleToAuthUser(role) {
  if (role === "technician") return { id: "technician-mode", email: "technician@aquabiz.local" };
  if (role === "telecaller") return { id: "telecaller-mode", email: "telecaller@aquabiz.local" };
  if (role === "sales") return { id: "sales-mode", email: "sales@aquabiz.local" };
  return null;
}
