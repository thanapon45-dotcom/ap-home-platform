// middleware.ts (project root, next to app/ and lib/)
// Default-deny gate for the whole app. Order of checks:
//   1. public paths            -> pass
//   2. x-service-token         -> pass, but ONLY for MACHINE_ALLOWED paths
//   3. valid session cookie    -> pass
//   4. otherwise               -> 401 (api) / redirect to /login (pages)
//
// AUTH_ENFORCE !== "true" means report-only: everything passes, and every
// request that WOULD have been denied is logged as AUTH_WOULD_DENY.

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, safeEqual, verifySessionToken } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

// Routes that n8n / cron must be able to call without a browser session.
// Keep this list as short as possible. Extend only after seeing the caller in
// the AUTH_WOULD_DENY logs.
const MACHINE_ALLOWED = [
  "/api/chat", // Market Intel Collector v2 (n8n) - also used by dashboard
  "/api/fb/queue/run-next", // Queue Auto-run (n8n)
  "/api/blog/queue/run-next", // candidate - confirm from logs
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const enforce = process.env.AUTH_ENFORCE === "true";
  const secret = process.env.SESSION_SECRET;
  const serviceToken = process.env.SERVICE_TOKEN;

  // 2. machine caller
  const presented = req.headers.get("x-service-token");
  if (
    presented &&
    serviceToken &&
    MACHINE_ALLOWED.includes(pathname) &&
    (await safeEqual(presented, serviceToken))
  ) {
    return NextResponse.next();
  }

  // 3. human session
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(cookie, secret)) return NextResponse.next();

  // 4. would deny
  const reason = presented
    ? "service_token_rejected_or_route_not_allowed"
    : cookie
      ? "invalid_or_expired_session"
      : "no_credentials";
  console.warn(
    JSON.stringify({
      event: "AUTH_WOULD_DENY",
      enforce,
      method: req.method,
      path: pathname,
      reason,
      ua: (req.headers.get("user-agent") ?? "").slice(0, 80),
    })
  );

  if (!enforce) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};
