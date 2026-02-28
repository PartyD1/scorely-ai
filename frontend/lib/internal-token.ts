/**
 * NextAuth v4 stores session JWTs as JWE (encrypted), which PyJWT can't decode.
 * This utility decodes the NextAuth session server-side (via getToken, which handles
 * JWE automatically), then re-signs the user info as a plain HS256 JWT that FastAPI
 * can verify with PyJWT using the same NEXTAUTH_SECRET.
 */
import { SignJWT } from "jose";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export async function getInternalAuthHeader(
  req: NextRequest
): Promise<Record<string, string>> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub || !token?.email) return {};

  const internalJwt = await new SignJWT({
    sub: token.sub,
    email: token.email as string,
    name: (token.name ?? token.email) as string,
    picture: (token.picture ?? null) as string | null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret);

  return { Authorization: `Bearer ${internalJwt}` };
}
