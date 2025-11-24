import { NextRequest, NextResponse } from "next/server";

const backend = process.env.BACKEND_INTERNAL_URL ?? "http://django:8000";

export async function GET(req: NextRequest) {
  const access = req.cookies.get("access")?.value;
  if (!access) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const r = await fetch(`${backend}/api/pomolobee/farms/`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  });

  const text = await r.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!r.ok) return NextResponse.json(data, { status: r.status });
  return NextResponse.json(data);
}
