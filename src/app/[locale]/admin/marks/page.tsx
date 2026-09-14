import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { BookOpen } from "lucide-react";

type SearchParams = Promise<{
  classId?: string;
  examTerm?: string;
}>;

const EXAM_TERMS = [
  { value: "UNIT_TEST_1", label: "Unit Test 1 (10)" },
  { value: "UNIT_TEST_2", label: "Unit Test 2 (10)" },
  { value: "HALF_YEARLY", label: "Half Yearly (30)" },
  { value: "ANNUAL", label: "Annual (50)" },
] as const;

async function getMarksData(classId?: string, examTerm?: string) {
  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      classes: {
        orderBy: { name: "asc" },
        include: {
          sections: { orderBy: { name: "asc" } },
          subjects: { orderBy: { name: "asc" } },
        },
      },
    },
  });

  if (!session) return { session: null, marks: [], selectedClass: null };

  const selectedClass = classId
    ? session.classes.find((c) => c.id === classId) ?? session.classes[0]
    : session.classes[0];

  if (!selectedClass || !examTerm) {
    return { session, marks: [], selectedClass };
  }

  const marks = await prisma.mark.findMany({
    where: {
      sessionId: session.id,
      subject: { classId: selectedClass.id },
      examTerm: examTerm as any,
    },
    include: {
      student: {
        select: { id: true, fullName: true, admissionNo: true },
      },
      subject: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { student: { fullName: "asc" } },
      { subject: { name: "asc" } },
    ],
  });

  return { session, marks, selectedClass };
}

export default async function AdminMarksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["ADMIN"]);
  const sparams = await searchParams;
  const { session, marks, selectedClass } = await getMarksData(
    sparams.classId,
    sparams.examTerm
  );

  if (!session) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-xl font-semibold text-gray-900">Marks Overview</h1>
        <p className="text-sm text-gray-500 mt-2">
          No academic session found. Set up an academic session from the Classes
          page first.
        </p>
      </main>
    );
  }

  // Group marks by student for table display
  const studentMap = new Map<
    string,
    {
      student: { id: string; fullName: string; admissionNo: string };
      subjects: Map<string, { marksObtained: number; maxMarks: number }>;
    }
  >();

  for (const m of marks) {
    if (!studentMap.has(m.student.id)) {
      studentMap.set(m.student.id, {
        student: m.student,
        subjects: new Map(),
      });
    }
    studentMap.get(m.student.id)!.subjects.set(m.subject.name, {
      marksObtained: m.marksObtained,
      maxMarks: m.maxMarks,
    });
  }

  const subjects = selectedClass?.subjects ?? [];
  const rows = Array.from(studentMap.values());

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Marks Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Read-only view — teachers enter marks from their panel.
        </p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Class
          </label>
          <select
            name="classId"
            defaultValue={selectedClass?.id ?? ""}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            {session.classes.map((c) => (
              <option key={c.id} value={c.id}>
                Class {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Exam Term
          </label>
          <select
            name="examTerm"
            defaultValue={sparams.examTerm ?? ""}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            <option value="">Select term…</option>
            {EXAM_TERMS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
          style={{ background: "hsl(var(--primary))" }}
        >
          View Marks
        </button>
      </form>

      {/* Results */}
      {sparams.examTerm && rows.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No marks recorded yet for this class and term.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  #
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Student
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Adm. No.
                </th>
                {subjects.map((s) => (
                  <th
                    key={s.id}
                    className="text-center px-3 py-3 font-medium text-gray-600"
                  >
                    {s.name}
                  </th>
                ))}
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => {
                let total = 0;
                let maxTotal = 0;
                return (
                  <tr key={row.student.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      {row.student.fullName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {row.student.admissionNo}
                    </td>
                    {subjects.map((s) => {
                      const m = row.subjects.get(s.name);
                      if (m) {
                        total += m.marksObtained;
                        maxTotal += m.maxMarks;
                      }
                      return (
                        <td
                          key={s.id}
                          className="text-center px-3 py-2.5 text-gray-700"
                        >
                          {m ? `${m.marksObtained}/${m.maxMarks}` : "—"}
                        </td>
                      );
                    })}
                    <td className="text-center px-4 py-2.5 font-semibold text-gray-900">
                      {maxTotal > 0 ? `${total}/${maxTotal}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
