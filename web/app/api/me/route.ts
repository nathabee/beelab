import { NextRequest, NextResponse } from "next/server";

const backend = process.env.BACKEND_INTERNAL_URL ?? "http://django:8000";
const secure = process.env.NODE_ENV === "production";

async function callMe(access: string) {
  return fetch(`${backend}/api/user/me/`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  });
}

export async function GET(req: NextRequest) {
  const access = req.cookies.get("access")?.value;
  const refresh = req.cookies.get("refresh")?.value;

  if (!access) {
    return NextResponse.json({ error: "no access token" }, { status: 401 });
  }

  // try with current access
  let r = await callMe(access);
  if (r.ok) return NextResponse.json(await r.json());

  // if unauthorized and we have refresh, try to refresh once
  if (r.status === 401 && refresh) {
    const rr = await fetch(`${backend}/api/user/auth/refresh/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });

    if (rr.ok) {
      const { access: newAccess } = await rr.json();

      // set new access cookie and retry /api/me
      const retry = await callMe(newAccess);
      const body = await retry.json();
      const res = NextResponse.json(body, { status: retry.status });

      res.cookies.set("access", newAccess, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 15,
      });

      return res;
    }
  }

  // bubble up original error from /api/me
  try {
    return NextResponse.json(await r.json(), { status: r.status });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
