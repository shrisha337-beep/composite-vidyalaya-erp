import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TcDownloadClient } from "@/components/admin/tc-download-client";

async function getStudentAndTc(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      guardians: true,
      transferCertificates: {
        where: { status: "ISSUED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return student;
}

export default async function DownloadTcPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale, studentId } = await params;

  const student = await getStudentAndTc(studentId);
  if (!student) notFound();

  const tc = student.transferCertificates?.[0];
  if (!tc) {
    // If no TC has been issued for this student, redirect to issue screen
    notFound();
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl">
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
            स्थानान्तरण प्रमाण पत्र डाउनलोड
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Download Transfer Certificate</p>
        </div>
      </div>

      <TcDownloadClient
        locale={locale}
        student={student}
        tc={tc}
      />
    </main>
  );
}
