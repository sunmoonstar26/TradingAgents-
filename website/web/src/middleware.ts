import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const locale = process.env.LOCALE ?? "en";
  const validLocale = ["en", "zh"].includes(locale) ? locale : "en";

  const res = NextResponse.next();
  res.cookies.set("NEXT_LOCALE", validLocale, {
    path: "/",
    sameSite: "lax",
  });
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
