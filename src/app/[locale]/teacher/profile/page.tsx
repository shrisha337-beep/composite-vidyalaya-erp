import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["TEACHER"]);
  const { locale } = await params;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      classTeacherOf: {
        include: { class: true },
      },
      subjects: {
        include: {
          subject: {
            include: { class: true },
          },
        },
      },
      serviceRecords: {
        orderBy: { effectiveDate: "desc" },
      },
    },
  });

  if (!teacher) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <p className="text-sm text-gray-500">
          Teacher profile not found. Contact the administrator.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/teacher/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            My Profile / मेरी प्रोफाइल
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Read-only view</p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-sm bg-gray-100 flex items-center justify-center">
            <User className="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {teacher.fullName}
            </h2>
            <p className="text-sm text-gray-500">
              Employee Code: {teacher.employeeCode}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Designation</span>
            <p className="font-medium text-gray-800">
              {teacher.designation ?? "-"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Gender</span>
            <p className="font-medium text-gray-800">
              {teacher.gender ?? "-"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Qualification</span>
            <p className="font-medium text-gray-800">
              {teacher.qualification ?? "-"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Date of Joining</span>
            <p className="font-medium text-gray-800">
              {teacher.dateOfJoining
                ? new Date(teacher.dateOfJoining).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "-"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Date of Birth</span>
            <p className="font-medium text-gray-800">
              {teacher.dob
                ? new Date(teacher.dob).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Class Teacher Assignment */}
      {teacher.classTeacherOf.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-sm p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Class Teacher Of
          </h3>
          <div className="flex flex-wrap gap-2">
            {teacher.classTeacherOf.map((section) => (
              <span
                key={section.id}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-sm text-sm font-medium"
              >
                Class {section.class.name} - Section {section.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Subject Assignments */}
      {teacher.subjects.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-sm p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Subject Assignments
          </h3>
          <div className="flex flex-wrap gap-2">
            {teacher.subjects.map((ts) => (
              <span
                key={ts.id}
                className="px-3 py-1 bg-green-50 text-green-700 rounded-sm text-sm font-medium"
              >
                {ts.subject.name} - Class {ts.subject.class.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Service Records */}
      {teacher.serviceRecords.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Service Records
          </h3>
          <div className="space-y-3">
            {teacher.serviceRecords.map((sr) => (
              <div
                key={sr.id}
                className="flex items-start gap-3 text-sm border-l-2 border-gray-200 pl-3"
              >
                <div>
                  <span className="text-xs text-gray-400">
                    {new Date(sr.effectiveDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <p className="text-gray-800 font-medium">{sr.description}</p>
                  <span className="text-xs text-gray-500 capitalize">
                    {sr.eventType.toLowerCase().replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        To update profile information, please contact the administrator.
      </p>
    </main>
  );
}
