// ============================================================================
// Vercel API Route — BOQ Proxy
// ============================================================================
// เหตุผล: Browser ไม่สามารถเรียก Railway Hub ตรงได้ (CORS) — ต้องผ่าน Vercel
// API route เสมอ ตาม Server-side Proxy Pattern (decisions.md)
//
// Convention เดียวกับ Hub (boq-routes.cjs):
//   - GET request  → forward ไป Hub  /api/boq/<path>
//   - POST/PATCH/DELETE → forward ไป Hub  /action/boq/<path>
// ทำให้ฝั่ง frontend เรียกผ่าน namespace เดียว `/api/boq/...` เสมอ ไม่ต้องสนใจ
// ว่า Hub แยก api/action อย่างไร
//
// ต้องตั้ง env vars ใน Vercel:
//   HUB_URL    = https://ap-home-platform-production.up.railway.app (ค่า default ด้านล่างใช้ค่านี้อยู่แล้ว)
//   HUB_SECRET = ค่าเดียวกับ x-hub-token ที่ Hub ต้องการ (ตาม S-10 pattern)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const HUB_URL = process.env.HUB_URL || 'https://ap-home-platform-production.up.railway.app';
const HUB_SECRET = process.env.HUB_SECRET || '';

async function forward(req: NextRequest, pathParts: string[], method: string) {
  const isWrite = method !== 'GET';
  const hubPath = `${isWrite ? '/action' : '/api'}/boq/${pathParts.join('/')}`;
  const search = new URL(req.url).search; // preserve ?search=&category=&status= ฯลฯ
  const target = `${HUB_URL}${hubPath}${search}`;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-hub-token': HUB_SECRET,
    },
  };

  if (isWrite) {
    const body = await req.text();
    if (body) init.body = body;
  }

  let hubRes: Response;
  try {
    hubRes = await fetch(target, init);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Hub unreachable: ${err.message}` },
      { status: 502 }
    );
  }

  const text = await hubRes.text();
  return new NextResponse(text, {
    status: hubRes.status,
    headers: { 'Content-Type': hubRes.headers.get('content-type') || 'application/json' },
  });
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(req, path, 'GET');
}
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(req, path, 'POST');
}
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(req, path, 'PATCH');
}
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(req, path, 'DELETE');
}
