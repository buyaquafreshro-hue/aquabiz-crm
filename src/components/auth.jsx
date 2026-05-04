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
        <div className="login-bg-glow one" />
        <div className="login-bg-glow two" />
        <div className="logo-mark">A</div>
        <h1>AquaBiz</h1>
        <p>Reliable Water Solutions</p>
      </section>

      <main className="login-content">
        <section className="login-card auth-card">
          <div>
            <h2>Welcome to AquaBiz</h2>
            <p className="muted">Sign in to manage your services</p>
          </div>

          <div className="auth-tabs">
            <button className={mode === "admin" ? "active" : ""} onClick={() => setMode("admin")} type="button">
              Admin
            </button>
            <button className={mode === "technician" ? "active" : ""} onClick={() => setMode("technician")} type="button">
              Technician
            </button>
            <button className={mode === "telecaller" ? "active" : ""} onClick={() => setMode("telecaller")} type="button">
              Telecaller
            </button>
            <button className={mode === "sales" ? "active" : ""} onClick={() => setMode("sales")} type="button">
              Sales
            </button>
          </div>

          {mode === "admin" ? (
            <>
              <div className="login-field">
                <label>Email Address</label>
                <div className="login-input-wrap">
                  <span>@</span>
                  <input
                    placeholder="admin@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Password</label>
                <div className="login-input-wrap">
                  <span>*</span>
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
                </div>
              </div>

              {message && <div className="error-box">{message}</div>}

              <button className="primary-btn big login-submit" onClick={adminLogin} disabled={saving}>
                {saving ? "Logging in..." : "Login"}
                <span>-&gt;</span>
              </button>
            </>
          ) : mode === "technician" ? (
            <>
              <div className="role-login-panel">
                <strong>Technician Login</strong>
                <p>Technician login uses mobile number and 6-digit PIN inside the Technician App.</p>
              </div>

              <button className="primary-btn big login-submit" onClick={onTechnicianOpen}>
                Open Technician Login
                <span>-&gt;</span>
              </button>
            </>
          ) : mode === "telecaller" ? (
            <>
              <div className="role-login-panel">
                <strong>Telecaller Login</strong>
                <p>Telecaller login uses mobile number and 6-digit PIN.</p>
              </div>

              <button className="primary-btn big login-submit" onClick={onTelecallerOpen}>
                Open Telecaller Login
                <span>-&gt;</span>
              </button>
            </>
          ) : (
            <>
              <div className="role-login-panel">
                <strong>Sales Login</strong>
                <p>Sales person login uses mobile number and 6-digit PIN.</p>
              </div>

              <button className="primary-btn big login-submit" onClick={onSalesOpen}>
                Open Sales Login
                <span>-&gt;</span>
              </button>
            </>
          )}

          <div className="login-divider">
            <span />
            <strong>Secure CRM Access</strong>
            <span />
          </div>

          <button className="ghost-btn login-outline" onClick={() => setMode("admin")} type="button">
            Admin / Shop Owner Access
          </button>
        </section>

        <section className="login-trust-grid">
          <div>
            <span>✓</span>
            <strong>Certified Technicians</strong>
          </div>
          <div>
            <span>◇</span>
            <strong>Purity Guaranteed</strong>
          </div>
        </section>

        <footer className="login-footer">
          By continuing, you agree to AquaBiz Terms of Service and Privacy Policy.
        </footer>
      </main>
    </div>
  );
}
