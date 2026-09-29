// lib/auth.ts
// Session + token helpers. Uses Web Crypto only (works in Edge middleware and
// Node route handlers) so no new npm dependency is needed.
//
// To move to Supabase Auth later, replace verifySessionToken() and the
// login route only; middleware.ts does not need to change.

export const SESSION_COOKIE = "aph_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const enc = new TextEncoder();

function toB64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// Constant-time string comparison (compares SHA-256 digests byte by byte).
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const A = new Uint8Array(ha);
  const B = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < A.length; i++) diff |= A[i] ^ B[i];
  return diff === 0;
}

// Token format: "<expiryUnixSeconds>.<base64url(HMAC-SHA256(expiry))>"
export async function createSessionToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(String(exp)));
  return `${exp}.${toB64Url(sig)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined
): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const key = await hmacKey(secret);
  const expected = toB64Url(await crypto.subtle.sign("HMAC", key, enc.encode(expStr)));
  return safeEqual(sig, expected);
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

// Defense-in-depth for route handlers that use service_role or attach HUB_SECRET.
// Usage at the top of a handler:
//   const denied = await requireSession(req); if (denied) return denied;
export async function requireSession(req: Request): Promise<Response | null> {
  const ok = await verifySessionToken(readCookie(req, SESSION_COOKIE), process.env.SESSION_SECRET);
  return ok ? null : unauthorized();
}

// Same, but also accepts x-service-token (only for routes n8n/cron must call).
export async function requireSessionOrService(req: Request): Promise<Response | null> {
  const presented = req.headers.get("x-service-token");
  const expected = process.env.SERVICE_TOKEN;
  if (presented && expected && (await safeEqual(presented, expected))) return null;
  return requireSession(req);
}
