import { useState } from "react";
import { supabase } from "../supabaseClient";

export function LoginScreen({ onAdminLogin, onTechnicianOpen, onTelecallerOpen, onSalesOpen }) {
  const [mode, setMode] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function adminLogin() {
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Email and password are required.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.user) {
      onAdminLogin(data.user);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="logo-mark">💧</div>
        <h1>AquaBiz</h1>
        <p>RO Service Business App</p>
      </section>

      <section className="login-card auth-card">
        <div className="auth-tabs">
          <button className={mode === "admin" ? "active" : ""} onClick={() => setMode("admin")} type="button">
            Admin Login
          </button>
          <button className={mode === "technician" ? "active" : ""} onClick={() => setMode("technician")} type="button">
            Technician Login
          </button>
          <button className={mode === "telecaller" ? "active" : ""} onClick={() => setMode("telecaller")} type="button">
            Telecaller Login
          </button>
          <button className={mode === "sales" ? "active" : ""} onClick={() => setMode("sales")} type="button">
            Sales Login
          </button>
        </div>

        {mode === "admin" ? (
          <>
            <h2>Admin / Shop Owner Login</h2>
            <p className="muted">Login with the email and password created in Supabase Authentication.</p>

            <label>Email Address</label>
            <input
              placeholder="admin@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <label>Password</label>
            <input
              placeholder="Enter password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") adminLogin();
              }}
            />

            {message && <div className="error-box">{message}</div>}

            <button className="primary-btn big" onClick={adminLogin} disabled={saving}>
              {saving ? "Logging in..." : "Login to Dashboard"}
            </button>
          </>
        ) : mode === "technician" ? (
          <>
            <h2>Technician Login</h2>
            <p className="muted">Technician login uses mobile number and 6-digit PIN inside the Technician App.</p>

            <button className="primary-btn big" onClick={onTechnicianOpen}>
              Open Technician Login
            </button>

            <button className="ghost-btn" onClick={() => setMode("admin")} type="button">
              Back to Admin Login
            </button>
          </>
        ) : mode === "telecaller" ? (
          <>
            <h2>Telecaller Login</h2>
            <p className="muted">Telecaller login uses mobile number and 6-digit PIN.</p>

            <button className="primary-btn big" onClick={onTelecallerOpen}>
              Open Telecaller Login
            </button>

            <button className="ghost-btn" onClick={() => setMode("admin")} type="button">
              Back to Admin Login
            </button>
          </>
        ) : (
          <>
            <h2>Sales Login</h2>
            <p className="muted">Sales person login uses mobile number and 6-digit PIN.</p>

            <button className="primary-btn big" onClick={onSalesOpen}>
              Open Sales Login
            </button>

            <button className="ghost-btn" onClick={() => setMode("admin")} type="button">
              Back to Admin Login
            </button>
          </>
        )}
      </section>
    </div>
  );
}
