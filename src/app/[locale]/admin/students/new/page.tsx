import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSchoolSettings } from "@/app/actions/school-settings";
import { AdmissionForm } from "@/components/admin/admission-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function NewStudentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["ADMIN"]);

  const { locale } = await params;

  // Must have an active academic session
  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { label: true },
  });

  if (!session) {
    redirect(`/${locale}/admin/classes?error=${encodeURIComponent(
      "Set up the academic session before adding students."
    )}`);
  }

  const settings = await getSchoolSettings();

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/admin/students`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            नया छात्र/छात्रा प्रवेश
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">New Student Admission</p>
        </div>
      </div>

      <AdmissionForm locale={locale} sessionLabel={session.label} schoolDistrict="Gonda" schoolBlock="Paraspur" udiseCode={settings.udiseCode || undefined} />
    </main>
  );
}
