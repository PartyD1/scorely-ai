import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const rawToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, raw: true });

  if (!rawToken) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${rawToken}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
