import { NextRequest, NextResponse } from "next/server";
import { getInternalAuthHeader } from "@/lib/internal-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function DELETE(req: NextRequest) {
  const authHeader = await getInternalAuthHeader(req);
  if (!authHeader.Authorization) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/api/account`, {
    method: "DELETE",
    headers: authHeader,
  });

  return new NextResponse(null, { status: res.status });
}
