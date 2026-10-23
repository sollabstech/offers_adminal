import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Admin credentials live in server-only env vars (ADMIN_LOGIN_ID / ADMIN_PASSWORD) so they never ship in the repo or the JS bundle. */
export async function POST(req: NextRequest) {
  const expectedId = process.env.ADMIN_LOGIN_ID;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedId || !expectedPassword) {
    return NextResponse.json(
      { error: "Admin login is not configured. Set ADMIN_LOGIN_ID and ADMIN_PASSWORD in .env.local." },
      { status: 503 }
    );
  }

  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const ok = safeEqual(email ?? "", expectedId) && safeEqual(password ?? "", expectedPassword);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 401 });
}
