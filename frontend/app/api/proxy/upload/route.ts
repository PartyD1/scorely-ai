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

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : { detail: await res.text() };
  return NextResponse.json(data, { status: res.status });
}
