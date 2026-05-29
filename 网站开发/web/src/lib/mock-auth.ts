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

  return { user, ready, login, logout, isLoggedIn: !!user };
}
