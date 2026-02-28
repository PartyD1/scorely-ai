import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const rawToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, raw: true });

  if (!rawToken) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const res = await fetch(`${API_URL}/api/admin/users/${userId}/submissions`, {
    headers: { Authorization: `Bearer ${rawToken}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
