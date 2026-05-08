import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getRoleSession, roleToAuthUser } from "../utils/roleSession";

export function useAuthSession({ onSignedIn, onSignedOut } = {}) {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setAuthUser(data.session.user);
        onSignedIn?.(data.session.user);
      } else {
        const roleUser = roleToAuthUser(getRoleSession()?.role);
        if (roleUser) setAuthUser(roleUser);
      }
      setAuthLoading(false);
    }

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        onSignedIn?.(session.user);
      } else {
        const roleUser = roleToAuthUser(getRoleSession()?.role);
        if (roleUser) {
          setAuthUser(roleUser);
          return;
        }
        setAuthUser(null);
        onSignedOut?.();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, [onSignedIn, onSignedOut]);

  return {
    authUser,
    authLoading,
    setAuthUser,
  };
}
