import { useState } from "react";
import { supabase } from "../supabaseClient";

export function TopBar({ title, onRefresh, loading, language, setLanguage, authUser, businessSettings, onLocalLogout, onBackup, onRestore }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isLimitedRole = authUser?.id === "technician-mode" || authUser?.id === "telecaller-mode" || authUser?.id === "sales-mode";

  async function logout() {
    if (isLimitedRole) {
      onLocalLogout?.();
      return;
    }

    await supabase.auth.signOut();
    onLocalLogout?.();
  }

  return (
    <header className="topbar compact-topbar">
      <div className="brand">
        <span className="brand-icon">💧</span>
        <div>
          <strong>{title}</strong>
        </div>
      </div>

      <div className="topbar-menu-wrap">
        <button className="menu-trigger" type="button" onClick={() => setMenuOpen(!menuOpen)}>
          ☰ Menu
        </button>

        {menuOpen && (
          <div className="topbar-dropdown">
            <label>
              Language
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </label>

            {!isLimitedRole && <button type="button" onClick={() => { onBackup?.(); setMenuOpen(false); }}>Backup</button>}

            <button type="button" onClick={() => { window.location.href = "mailto:contact@aquabiz.in"; setMenuOpen(false); }}>
              Contact / Help
            </button>

            {!isLimitedRole && <label className="dropdown-upload">
              Restore
              <input type="file" accept="application/json" hidden onChange={(e) => { onRestore?.(e); setMenuOpen(false); }} />
            </label>}

            <button type="button" onClick={() => { onRefresh?.(); setMenuOpen(false); }}>
              {loading ? "Loading..." : "Refresh"}
            </button>

            {authUser?.email && (
              <button className="logout-menu-btn" type="button" onClick={logout}>Logout</button>
            )}

            {authUser?.email && (
              <small className="menu-login-email">
                Login: {authUser.email}
              </small>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
