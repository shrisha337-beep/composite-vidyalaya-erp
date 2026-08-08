import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Award, BookOpen } from "lucide-react";

function getGrade(total: number): string {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  if (total >= 33) return "E";
  return "F";
}

export default async function StudentMarksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["STUDENT", "PARENT"]);
  const { locale } = await params;

  // 1. Fetch student details and class
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      section: {
        select: {
          classId: true,
          class: { select: { name: true, sessionId: true } },
        },
      },
    },
  });

  if (!student || !student.section) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          No class section assignment found.
        </div>
      </main>
    );
  }

  const activeSessionId = student.section.class.sessionId;

  // 2. Fetch all subjects of the student's class
  const subjects = await prisma.subject.findMany({
    where: { classId: student.section.classId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 3. Fetch all marks obtained by this student in the active session
  const marks = await prisma.mark.findMany({
    where: {
      studentId: student.id,
      sessionId: activeSessionId,
    },
    select: {
      subjectId: true,
      examTerm: true,
      marksObtained: true,
    },
  });

  // Pivot marks by subject and term
  const marksBySubject = subjects.map((sub) => {
    const subMarks = marks.filter((m) => m.subjectId === sub.id);

    const ut1 = subMarks.find((m) => m.examTerm === "UNIT_TEST_1")?.marksObtained ?? null;
    const ut2 = subMarks.find((m) => m.examTerm === "UNIT_TEST_2")?.marksObtained ?? null;
    const hy = subMarks.find((m) => m.examTerm === "HALF_YEARLY")?.marksObtained ?? null;
    const annual = subMarks.find((m) => m.examTerm === "ANNUAL")?.marksObtained ?? null;

    // Calculate sum of non-null components
    let total = 0;
    let hasEnteredMarks = false;

    if (ut1 !== null) { total += ut1; hasEnteredMarks = true; }
    if (ut2 !== null) { total += ut2; hasEnteredMarks = true; }
    if (hy !== null) { total += hy; hasEnteredMarks = true; }
    if (annual !== null) { total += annual; hasEnteredMarks = true; }

    return {
      id: sub.id,
      name: sub.name,
      ut1,
      ut2,
      hy,
      annual,
      total: hasEnteredMarks ? total : null,
      grade: hasEnteredMarks ? getGrade(total) : "—",
    };
  });

  // Calculate overall statistics
  const scoredSubjects = marksBySubject.filter((s) => s.total !== null);
  const aggregateScore = scoredSubjects.reduce((acc, curr) => acc + (curr.total ?? 0), 0);
  const maxPossibleScore = scoredSubjects.length * 100;
  const overallPercentage = maxPossibleScore > 0 ? Math.round((aggregateScore / maxPossibleScore) * 100) : 0;

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/student/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            मेरा प्रगति पत्रक (अंक तालिका)
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">My Academic Progress Report Card</p>
        </div>
      </div>

      {/* Aggregate Report summary card */}
      {scoredSubjects.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-center gap-4 mb-6 shadow-sm">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-md">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">Overall Academic Progress</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Aggregate Score: <span className="font-bold text-gray-800">{aggregateScore}</span> / {maxPossibleScore} marks ({overallPercentage}%)
            </p>
          </div>
        </div>
      )}

      {/* Roster Marks Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-3 mb-4">
          Report Card Sheet / परीक्षा परिणाम
        </h3>

        {subjects.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center border border-dashed border-gray-200 rounded">
            No subjects defined for your class yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-3 text-center">UT 1 (Max: 10)</th>
                  <th className="py-3 px-3 text-center">UT 2 (Max: 10)</th>
                  <th className="py-3 px-3 text-center">Half-Yearly (Max: 30)</th>
                  <th className="py-3 px-3 text-center">Annual (Max: 50)</th>
                  <th className="py-3 px-3 text-center bg-gray-50/50 font-bold text-gray-700">Total (Max: 100)</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {marksBySubject.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-800">{item.name}</td>
                    <td className="py-3 px-3 text-center font-mono text-gray-600">{item.ut1 !== null ? item.ut1 : "—"}</td>
                    <td className="py-3 px-3 text-center font-mono text-gray-600">{item.ut2 !== null ? item.ut2 : "—"}</td>
                    <td className="py-3 px-3 text-center font-mono text-gray-600">{item.hy !== null ? item.hy : "—"}</td>
                    <td className="py-3 px-3 text-center font-mono text-gray-600">{item.annual !== null ? item.annual : "—"}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold bg-gray-50/20 text-blue-700">
                      {item.total !== null ? item.total : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={[
                          "px-2.5 py-0.5 rounded text-[10px] font-bold",
                          item.grade === "F"
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : item.grade !== "—"
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : "text-gray-400",
                        ].join(" ")}
                      >
                        {item.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
