import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  // getToken with raw:true returns the signed JWT string FastAPI can verify
  const rawToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, raw: true });

  const headers: Record<string, string> = {};
  if (rawToken) {
    headers["Authorization"] = `Bearer ${rawToken}`;
  }

  const formData = await req.formData();

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
