"use client";

import { useEffect, useState, useCallback } from "react";

const KEY = "ta_auth_mock";

export interface MockUser {
  name: string;
  credits: number;
}

const DEFAULT_USER: MockUser = { name: "Investor", credits: 12 };

function readUser(): MockUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch {
    return null;
  }
}

export function useMockAuth() {
  const [user, setUser] = useState<MockUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(readUser());
    setReady(true);

    // 监听同页面其他 useMockAuth 实例写入的自定义事件
    function onAuthChange() {
      setUser(readUser());
    }
    // 监听跨 tab 的 storage 事件
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) setUser(readUser());
    }

    window.addEventListener("ta_auth_change", onAuthChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("ta_auth_change", onAuthChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const login = useCallback((u: MockUser = DEFAULT_USER) => {
    localStorage.setItem(KEY, JSON.stringify(u));
    setUser(u);
    window.dispatchEvent(new Event("ta_auth_change"));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setUser(null);
    window.dispatchEvent(new Event("ta_auth_change"));
  }, []);

  /** 扣除 Credits，返回扣除后余额；余额不足返回 -1 不扣除 */
  const deductCredit = useCallback((amount = 1): number => {
    const u = readUser();
    if (!u || u.credits < amount) return -1;
    const updated = { ...u, credits: u.credits - amount };
    localStorage.setItem(KEY, JSON.stringify(updated));
    setUser(updated);
    window.dispatchEvent(new Event("ta_auth_change"));
    return updated.credits;
  }, []);

  return { user, ready, login, logout, isLoggedIn: !!user, deductCredit };
}

