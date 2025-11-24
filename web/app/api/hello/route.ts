// web/app/api/hello/route.ts
import { NextResponse } from "next/server";

const INTERNAL_DJANGO_URL =
  process.env.BACKEND_INTERNAL_URL ?? "http://django:8000";

export async function GET() {
  const r = await fetch(`${INTERNAL_DJANGO_URL}/api/user/hello/`, {
    // force server-side fetch; no caching for dev
    cache: "no-store",
  });

  if (!r.ok) {
    return NextResponse.json(
      { error: `Upstream error ${r.status}` },
      { status: r.status }
    );
  }

  const data = await r.json();
  return NextResponse.json(data);
}