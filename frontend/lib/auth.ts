/**
 * Reads the NextAuth session JWT from the browser cookie and returns
 * an Authorization header for FastAPI requests.
 *
 * NextAuth v4 stores the JWT in a cookie named `next-auth.session-token`
 * (or `__Secure-next-auth.session-token` in production over HTTPS).
 */
export function getAuthHeader(): Record<string, string> {
  if (typeof document === "undefined") return {};

  const cookieName =
    window.location.protocol === "https:"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${cookieName}=`));

  if (!match) return {};

  const token = match.split("=").slice(1).join("=");
  return { Authorization: `Bearer ${token}` };
}
