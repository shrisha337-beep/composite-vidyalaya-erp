import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StudentDetailView } from "@/components/admin/student-detail-view";

async function getStudent(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      section: { include: { class: true } },
      guardians: { orderBy: { relation: "asc" } },
      siblings: true,
      bankDetails: true,
      documents: true,
      transferCertificates: {
        where: { status: "ISSUED" },
        take: 1,
      },
      user: { select: { phone: true, isActive: true, lockedUntil: true, id: true } },
    },
  });
  return student;
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale, studentId } = await params;

  const student = await getStudent(studentId);
  if (!student) notFound();

  // Decrypt sensitive fields for display
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

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl">
      <StudentDetailView
        student={student}
        decrypted={decrypted}
        locale={locale}
      />
    </main>
  );
}
