"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase";

export interface AuthUser {
  name: string;
  email: string;
  credits: number;
}

/**
 * 真实 Auth hook，接口与 useMockAuth 兼容。
 * 所有消费方（Header、PrivateZone、ResearchConsole 等）无需改动。
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const fetchCredits = useCallback(async (supabaseUser: User): Promise<AuthUser> => {
    const res = await fetch("/api/user/credits");
    const credits = res.ok ? (await res.json()).credits ?? 0 : 0;
    return {
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "Investor",
      email: supabaseUser.email ?? "",
      credits,
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (u) setUser(await fetchCredits(u));
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(await fetchCredits(session.user));
      } else {
        setUser(null);
      }
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [fetchCredits]);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const register = useCallback(async (email: string, password: string): Promise<{ needsVerification: boolean }> => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/en/reset-password`,
      },
    });
    if (error) throw error;
    // session is non-null when email confirmation is disabled in Supabase
    return { needsVerification: !data.session };
  }, []);

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    window.dispatchEvent(new Event("ta_auth_change"));
  }, []);

  const deductCredit = useCallback(async (amount = 1): Promise<number> => {
    const res = await fetch("/api/user/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) return -1;
    const { credits } = await res.json();
    setUser((prev) => prev ? { ...prev, credits } : null);
    window.dispatchEvent(new Event("ta_auth_change"));
    return credits;
  }, []);

  return {
    user,
    ready,
    login,
    register,
    logout,
    isLoggedIn: !!user,
    deductCredit,
  };
}
