import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStudentPortalEnabled } from "@/lib/data/school-settings";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export interface StudentContext {
  studentId: string;
  userId: string;
  admissionNo: string;
  fullName: string;
  sectionId: string | null;
  sectionName: string | null;
  classId: string | null;
  className: string | null;
  sessionId: string | null;
  sessionLabel: string | null;
}

/**
 * Per-request memoised session lookup. Every admin/teacher/student route calls
 * requireRole() in BOTH its layout and its page (and often again inside
 * helpers), so without this the JWT cookie is decoded + verified several
 * times per render. React's cache() scopes the result to one request.
 */
const getSessionCached = cache(() => getServerSession(authOptions));

/**
 * Per-request memoised student identity lookup keyed by `userId`.
 * Uses React `cache()` (strictly per-request, never `unstable_cache`) so
 * section/class promotions (`promote-students.ts`), section edits
 * (`update-student.ts`), and TC issuance (`issue-tc.ts`) take effect on the
 * very next request without stale cross-request cache state.
 */
export const getStudentContextByUserId = cache(
  async (userId: string): Promise<StudentContext | null> => {
    const student = await prisma.student.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        admissionNo: true,
        fullName: true,
        isActive: true,
        sectionId: true,
        section: {
          select: {
            id: true,
            name: true,
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                sessionId: true,
                session: {
                  select: {
                    label: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student || !student.isActive) {
      return null;
    }

    return {
      studentId: student.id,
      userId: student.userId,
      admissionNo: student.admissionNo,
      fullName: student.fullName,
      sectionId: student.sectionId,
      sectionName: student.section?.name ?? null,
      classId: student.section?.classId ?? null,
      className: student.section?.class.name ?? null,
      sessionId: student.section?.class.sessionId ?? null,
      sessionLabel: student.section?.class.session.label ?? null,
    };
  }
);

/**
 * Server-side role guard for use inside each role's layout.tsx
 * (e.g. src/app/[locale]/admin/layout.tsx).
 *
 * IMPORTANT: proxy.ts also checks the role, but middleware-only
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

  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  return session;
}

/**
 * Server-side guard for the student portal layout and student routes.
 * Enforces:
 * 1. Authenticated `STUDENT` role (`requireRole(["STUDENT"])`) and `mustChangePassword === false`.
 * 2. Cached `isStudentPortalEnabled()` switch is `true` (blocks existing sessions within <= 2 min when turned off).
 * 3. Student identity resolved strictly from `session.user.id` via per-request `getStudentContextByUserId`.
 */
export async function requireStudent(): Promise<{
  session: Awaited<ReturnType<typeof requireRole>>;
  student: StudentContext;
}> {
  const session = await requireRole(["STUDENT"]);

  const portalOpen = await isStudentPortalEnabled();
  if (!portalOpen) {
    redirect("/login");
  }

  const student = await getStudentContextByUserId(session.user.id);
  if (!student) {
    redirect("/login");
  }

  return { session, student };
}
