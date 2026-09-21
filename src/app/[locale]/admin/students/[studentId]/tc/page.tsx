import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TcForm } from "@/components/admin/tc-form";

async function getStudent(studentId: string) {
  return await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      section: { include: { class: true } },
      guardians: { orderBy: { relation: "asc" } },
      user: { select: { id: true } },
    },
  });
}

async function getNextTcNumber(): Promise<string> {
  // Get all TC numbers, find the highest numeric one, and increment
  const latestTc = await prisma.transferCertificate.findMany({
    select: { tcNumber: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let maxNum = 0;
  for (const tc of latestTc) {
    const num = parseInt(tc.tcNumber, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  return String(maxNum + 1);
}

export default async function IssueTcPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale, studentId } = await params;

  const student = await getStudent(studentId);
  if (!student) notFound();

  // If student is already inactive/transferred out, redirect back with error
  if (!student.isActive) {
    // Check if TC already exists
    const tc = await prisma.transferCertificate.findFirst({
      where: { studentId },
      select: { id: true },
    });

    if (tc) {
      // Direct them back
      // We'll let the user know they can download the existing TC
    }
  }

  const decrypted = {
    studentAadhaar: decrypt(student.aadhaarNumber),
    guardians: student.guardians.map((g) => ({
      ...g,
      aadhaarNumber: decrypt(g.aadhaarNumber),
    })),
  };

  const nextTcNumber = await getNextTcNumber();

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
            स्थानान्तरण प्रमाण पत्र (TC) जारी करें
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Issue Transfer Certificate</p>
        </div>
      </div>

      <TcForm
        locale={locale}
        student={student}
        decrypted={decrypted}
        nextTcNumber={nextTcNumber}
      />
    </main>
  );
}
