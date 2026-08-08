import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkIpRateLimit, recordFailedAttempt } from "@/lib/ip-rate-limit";
import { NextRequest, NextResponse } from "next/server";

const handler = NextAuth(authOptions);

// GET — pass straight through (used for session polling, CSRF token, etc.)
export { handler as GET };

/**
 * POST — intercept login attempts to apply IP-based rate limiting
 * before handing off to NextAuth.
 *
 * We only apply the limit on the credentials callback endpoint
 * (/api/auth/callback/credentials) — other POST calls (sign-out, etc.)
 * go straight through.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const isCredentialsCallback =
    req.nextUrl.pathname === "/api/auth/callback/credentials";

  if (isCredentialsCallback) {
    // Resolve client IP — try standard headers first, fall back to socket
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const { blocked, retryAfterSec } = checkIpRateLimit(ip);

    if (blocked) {
      // Return 429 — NextAuth's client will surface this as a sign-in error
      return NextResponse.json(
        {
          error: "IP_RATE_LIMITED",
          message: `Too many failed login attempts from this device. Try again in ${Math.ceil((retryAfterSec ?? 900) / 60)} minute(s).`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec ?? 900),
          },
        }
      );
    }

    // Let NextAuth process the credentials
    const response = await handler(req, ctx);

    // If NextAuth rejected the credentials (4xx), record a failed attempt
    if (response.status >= 400) {
      recordFailedAttempt(ip);
    }

    return response;
  }

  // All other POST calls pass through untouched
  return handler(req, ctx);
}
