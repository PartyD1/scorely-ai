import { NextRequest, NextResponse } from "next/server";
import { getInternalAuthHeader } from "@/lib/internal-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authHeader = await getInternalAuthHeader(req);
  if (!authHeader.Authorization) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/submissions`, {
    headers: authHeader,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
