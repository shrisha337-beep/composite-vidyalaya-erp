import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

/**
 * Per-request memoised session lookup. Every admin/teacher route calls
 * requireRole() in BOTH its layout and its page (and often again inside
 * helpers), so without this the JWT cookie is decoded + verified several
 * times per render. React's cache() scopes the result to one request.
 */
const getSessionCached = cache(() => getServerSession(authOptions));

/**
 * Server-side role guard for use inside each role's layout.tsx
 * (e.g. src/app/[locale]/(admin)/layout.tsx).
 *
 * IMPORTANT: middleware.ts also checks the role, but middleware-only
 * checks are spoofable (CVE-2025-29927 — the x-middleware-subrequest
 * header bypass). This function is the real gate; middleware is just
 * a fast-path redirect for a smoother UX, never the sole check.
 */
export async function requireRole(allowed: Role[]) {
  const session = await getSessionCached();

  if (!session?.user) {
    redirect("/login");
  }

  if (!allowed.includes(session.user.role)) {
    redirect("/unauthorized");
  }

  return session;
}
