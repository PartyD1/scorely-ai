import { NextRequest, NextResponse } from "next/server";
import { getInternalAuthHeader } from "@/lib/internal-token";

export async function GET(req: NextRequest) {
  const authHeader = await getInternalAuthHeader(req);
  return NextResponse.json({ authorization: authHeader.Authorization ?? null });
}
