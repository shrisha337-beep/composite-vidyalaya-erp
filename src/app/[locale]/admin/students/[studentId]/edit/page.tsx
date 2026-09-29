import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdmissionForm } from "@/components/admin/admission-form";
import { getSchoolSettings } from "@/app/actions/school-settings";

async function getStudent(studentId: string) {
  return await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      section: { include: { class: true } },
      guardians: { orderBy: { relation: "asc" } },
      siblings: true,
      bankDetails: true,
      documents: true,
      user: { select: { id: true, phone: true } },
    },
  });
}

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale, studentId } = await params;

  const student = await getStudent(studentId);
  if (!student) notFound();

  // Fetch active academic session
  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { label: true },
  });

  if (!session) {
    redirect(`/${locale}/admin/classes?error=${encodeURIComponent(
      "Set up the academic session first."
    )}`);
  }

  // Decrypt sensitive fields for editing
  const decrypted = {
    studentAadhaar: decrypt(student.aadhaarNumber),
    guardians: student.guardians.map((g) => ({
      ...g,
      aadhaarNumber: decrypt(g.aadhaarNumber),
    })),
    bank: student.bankDetails
      ? {
          ...student.bankDetails,
          accountNumber: decrypt(student.bankDetails.accountNumber),
          accountHolderAadhaar: decrypt(student.bankDetails.accountHolderAadhaar),
        }
      : null,
  };

  const settings = await getSchoolSettings();

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/admin/students/${student.id}`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            छात्र/छात्रा विवरण संशोधित करें
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Edit Student Details</p>
        </div>
      </div>

      <AdmissionForm
        locale={locale}
        sessionLabel={session.label}
        schoolName={settings.schoolName}
        schoolDistrict={settings.schoolDistrict || "Gonda"}
        schoolBlock={settings.schoolBlock || "Paraspur"}
        udiseCode={settings.udiseCode || "09530607202"}
        isEdit={true}
        student={student}
        decrypted={decrypted}
      />
    </main>
  );
}
