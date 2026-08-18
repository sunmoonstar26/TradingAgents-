"use client";

/**
 * 本地单用户模式 — 无认证，始终视为已登录。
 */
export interface AuthUser {
  name: string;
  email: string;
  credits: number;
}

const LOCAL_USER: AuthUser = {
  name: "本地用户",
  email: "local",
  credits: Infinity,
};

export function useAuth() {
  return {
    user: LOCAL_USER,
    ready: true,
    isLoggedIn: true,
    login: async () => {},
    register: async () => ({ needsVerification: false }),
    logout: async () => {},
    deductCredit: async () => Infinity,
  };
}
