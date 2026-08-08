import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { decrypt } from "@/lib/encryption";
import { StudentProfileView } from "@/components/student/student-profile-view";

async function getStudent(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      section: {
        include: {
          class: true,
        },
      },
      guardians: true,
      bankDetails: true,
    },
  });

  return student;
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["STUDENT", "PARENT"]);
  const { locale } = await params;

  const rawStudent = await getStudent(session.user.id);
  if (!rawStudent) notFound();

  // Decrypt sensitive details securely
  const studentAadhaarDecrypted = rawStudent.aadhaarNumber ? decrypt(rawStudent.aadhaarNumber) : "";
  const bankAccountDecrypted = rawStudent.bankDetails?.accountNumber ? decrypt(rawStudent.bankDetails.accountNumber) : "";

  // Decrypt guardian aadhaars if set
  const father = rawStudent.guardians.find((g) => g.relation === "FATHER");
  const mother = rawStudent.guardians.find((g) => g.relation === "MOTHER");

  const fatherAadhaarDecrypted = father?.aadhaarNumber ? decrypt(father.aadhaarNumber) : "";
  const motherAadhaarDecrypted = mother?.aadhaarNumber ? decrypt(mother.aadhaarNumber) : "";

  const student = {
    ...rawStudent,
    studentAadhaarDecrypted,
    fatherAadhaarDecrypted,
    motherAadhaarDecrypted,
    bankAccountDecrypted,
    bankAccountHolder: rawStudent.bankDetails?.accountHolder ?? null,
    bankName: rawStudent.bankDetails?.bankName ?? null,
    ifscCode: rawStudent.bankDetails?.ifscCode ?? null,
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/student/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            छात्र प्रोफ़ाइल विवरण
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">My Profile & Registration Records</p>
        </div>
      </div>

      <StudentProfileView student={student} />
    </main>
  );
}
