import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["en", "zh"] as const;

export function proxy(req: NextRequest) {
  const locale = process.env.LOCALE ?? "en";
  const validLocale = (LOCALES as readonly string[]).includes(locale)
    ? locale
    : "en";

  const { pathname } = req.nextUrl;

  // Already has a locale prefix — just set the cookie and continue
  const hasLocalePrefix = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );

  if (!hasLocalePrefix) {
    // Redirect bare paths (e.g. /login → /en/login) to the correct locale
    const redirectPath = pathname === "/" ? `/${validLocale}/` : `/${validLocale}${pathname}`;
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

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
