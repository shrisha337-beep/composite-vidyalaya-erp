import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getSchoolSettings } from "@/lib/data/school-settings";
import { getSchoolBranding } from "@/lib/branding";
import {
  StudentCredentialSlips,
  type ClassCredentialSummary,
} from "@/components/admin/student-credential-slips";

export const dynamic = "force-dynamic";

export default async function StudentCredentialsPage() {
  await requireRole(["ADMIN"]);

  const [session, settings] = await Promise.all([
    prisma.academicSession.findFirst({
      where: { isCurrent: true },
      select: { id: true },
    }),
    getSchoolSettings(),
  ]);

  const branding = getSchoolBranding();
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || null;

  let classSummaries: ClassCredentialSummary[] = [];

  if (session) {
    const classes = await prisma.class.findMany({
      where: { sessionId: session.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sections: {
          select: {
            students: {
              where: {
                isActive: true,
                user: { isActive: true, role: "STUDENT" },
              },
              select: {
                id: true,
                user: { select: { credentialsIssuedAt: true } },
              },
            },
          },
        },
      },
    });

    classSummaries = classes.map((cls) => {
      const activeStudents = cls.sections.flatMap((sec) => sec.students);
      const totalActive = activeStudents.length;
      const issuedCount = activeStudents.filter(
        (st) => st.user && st.user.credentialsIssuedAt !== null
      ).length;
      return {
        id: cls.id,
        name: cls.name,
        totalActive,
        issuedCount,
        missingCount: Math.max(0, totalActive - issuedCount),
      };
    });
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full">
      <div className="no-print flex items-center gap-3 mb-6">
        <Link
          href="../students"
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#2D2A26] flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#6B1D30]" />
            Student Credential Slips / छात्र लॉगिन पर्ची
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7267] mt-0.5">
            Issue and print one-time initial login slips by class (8 slips per A4 page)
          </p>
        </div>
      </div>

      {!session ? (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800">
          No active academic session found. Please set up an academic session first.
        </div>
      ) : (
        <StudentCredentialSlips
          classes={classSummaries}
          schoolName={settings.schoolName}
          schoolNameHindi={branding.schoolNameHindi}
          portalUrl={portalUrl}
        />
      )}
    </main>
  );
}
