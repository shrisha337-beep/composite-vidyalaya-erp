import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

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
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!allowed.includes(session.user.role)) {
    redirect("/unauthorized");
  }

  return session;
}
