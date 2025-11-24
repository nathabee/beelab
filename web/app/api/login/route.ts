import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const backend = process.env.BACKEND_INTERNAL_URL ?? "http://django:8000";

  const r = await fetch(`${backend}/api/user/auth/login/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  const text = await r.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!r.ok) {
    const detail = data?.detail ?? "invalid credentials";
    return NextResponse.json({ error: detail }, { status: r.status || 401 });
  }

  // create response FIRST, then set cookies
  const res = NextResponse.json({ ok: true });

  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("access", data.access, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // 15 minutes
  });
  res.cookies.set("refresh", data.refresh, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}
