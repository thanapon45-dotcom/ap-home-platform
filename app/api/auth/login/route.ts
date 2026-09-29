import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  safeEqual,
} from "../../../../lib/auth";

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET;
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!secret || secret.length < 32 || !expected) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 500 });
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    // fall through with empty password
  }

  const ok = password.length > 0 && (await safeEqual(password, expected));
  if (!ok) {
    // Small fixed delay slows brute force per instance. Real rate limiting
    // (Upstash) is a separate task.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
