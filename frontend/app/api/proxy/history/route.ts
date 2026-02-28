import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const rawToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, raw: true });

  if (!rawToken) {
    return NextResponse.json([], { status: 200 });
  }

  const eventCode = req.nextUrl.searchParams.get("event_code");
  if (!eventCode) {
    return NextResponse.json({ detail: "event_code required" }, { status: 400 });
  }

  const res = await fetch(
    `${API_URL}/api/history?event_code=${encodeURIComponent(eventCode)}`,
    { headers: { Authorization: `Bearer ${rawToken}` } }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
