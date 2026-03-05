import { NextRequest, NextResponse } from "next/server";
import { getInternalAuthHeader } from "@/lib/internal-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const authHeader = await getInternalAuthHeader(req);
  if (!authHeader.Authorization) {
    return NextResponse.json([], { status: 200 });
  }

  const eventCode = req.nextUrl.searchParams.get("event_code");
  if (!eventCode) {
    return NextResponse.json({ detail: "event_code required" }, { status: 400 });
  }

  const res = await fetch(
    `${API_URL}/api/history?event_code=${encodeURIComponent(eventCode)}`,
    { headers: authHeader }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
