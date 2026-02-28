import { NextRequest, NextResponse } from "next/server";
import { getInternalAuthHeader } from "@/lib/internal-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const authHeader = await getInternalAuthHeader(req);
  const formData = await req.formData();

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: authHeader,
    body: formData,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
