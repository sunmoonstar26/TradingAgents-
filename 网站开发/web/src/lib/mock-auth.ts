"use client";

import { useEffect, useState, useCallback } from "react";

const KEY = "ta_auth_mock";

export interface MockUser {
  name: string;
  credits: number;
}

const DEFAULT_USER: MockUser = { name: "投资者", credits: 12 };

export function useMockAuth() {
  const [user, setUser] = useState<MockUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setUser(raw ? (JSON.parse(raw) as MockUser) : null);
    } catch {
      setUser(null);
    }
    setReady(true);
  }, []);

  const login = useCallback((u: MockUser = DEFAULT_USER) => {
    localStorage.setItem(KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setUser(null);
  }, []);

  /** 扣除 Credits，返回扣除后余额；余额不足返回 -1 不扣除 */
  const deductCredit = useCallback((amount = 1): number => {
    const raw = localStorage.getItem(KEY);
    if (!raw) return -1;
    try {
      const u = JSON.parse(raw) as MockUser;
      if (u.credits < amount) return -1;
      const updated = { ...u, credits: u.credits - amount };
      localStorage.setItem(KEY, JSON.stringify(updated));
      setUser(updated);
      return updated.credits;
    } catch {
      return -1;
    }
  }, []);

  return { user, ready, login, logout, isLoggedIn: !!user, deductCredit };
}

