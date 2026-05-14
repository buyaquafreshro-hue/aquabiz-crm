import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

export function TopBar({ title, onRefresh, loading, language, setLanguage, authUser, onLocalLogout, onBackup, onRestore }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isLimitedRole = authUser?.id === "technician-mode" || authUser?.id === "telecaller-mode" || authUser?.id === "sales-mode";

  useEffect(() => {
    function handlePointerDown(event) {
      const path = event.composedPath?.();
      const clickedInsideMenu = path ? path.includes(menuRef.current) : menuRef.current?.contains(event.target);

      if (!clickedInsideMenu) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("pointerdown", handlePointerDown, true);
    }
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [menuOpen]);

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
        <img className="brand-logo" src="/shop-logo-watermark.png" alt="" aria-hidden="true" />
        <div>
          <strong>{title}</strong>
        </div>
      </div>

      <div className="topbar-menu-wrap" ref={menuRef}>
        <button className="notification-btn" type="button" onClick={() => onRefresh?.()} title="Refresh">
          {loading ? "..." : "!"}
        </button>
        <button className="menu-trigger" type="button" onClick={() => setMenuOpen(!menuOpen)}>
          Menu
        </button>

        {menuOpen && (
          <div className="topbar-dropdown">
            <label>
              Language
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </label>

            {!isLimitedRole && <button type="button" onClick={() => { onBackup?.(); setMenuOpen(false); }}>Backup</button>}

            <button type="button" onClick={() => { window.location.href = "mailto:contact@aquabiz.in"; setMenuOpen(false); }}>
              Contact / Help
            </button>

            {!isLimitedRole && (
              <label className="dropdown-upload">
                Restore
                <input type="file" accept="application/json" hidden onChange={(e) => { onRestore?.(e); setMenuOpen(false); }} />
              </label>
            )}

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
