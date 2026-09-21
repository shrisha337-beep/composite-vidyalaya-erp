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
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl font-bold text-[#2D2A26]">Marks Overview</h1>
        <p className="text-sm text-[#7A7267] mt-2">
          No academic session found. Set up an academic session from the Classes page first.
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
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#2D2A26]">Marks Overview</h1>
        <p className="text-xs sm:text-sm text-[#7A7267] mt-1">
          Read-only view: teachers enter marks from their faculty panel.
        </p>
      </div>

      {/* Filters Form - Phone Friendly Stacking */}
      <form className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6 bg-white border border-[#E8E0D4] p-3.5 sm:p-4 rounded-sm shadow-xs">
        <div className="w-full sm:w-auto flex-1">
          <label className="block text-xs font-semibold text-[#5A534A] uppercase tracking-wider mb-1.5">
            Class
          </label>
          <select
            name="classId"
            defaultValue={selectedClass?.id ?? ""}
            className="w-full border border-[#D5CCC1] rounded-sm px-3 py-2 text-sm bg-[#FAF8F5] text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
          >
            {session.classes.map((c) => (
              <option key={c.id} value={c.id}>
                Class {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto flex-1">
          <label className="block text-xs font-semibold text-[#5A534A] uppercase tracking-wider mb-1.5">
            Exam Term
          </label>
          <select
            name="examTerm"
            defaultValue={sparams.examTerm ?? ""}
            className="w-full border border-[#D5CCC1] rounded-sm px-3 py-2 text-sm bg-[#FAF8F5] text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
          >
            <option value="">Select term...</option>
            {EXAM_TERMS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 rounded-sm text-sm font-semibold text-white bg-[#6B1D30] hover:bg-[#541624] transition-colors shadow-xs"
          >
            View Marks
          </button>
        </div>
      </form>

      {/* Results */}
      {sparams.examTerm && rows.length === 0 && (
        <div className="bg-white border border-[#E8E0D4] rounded-sm p-8 text-center shadow-xs">
          <BookOpen className="h-8 w-8 text-[#A89F91] mx-auto mb-3" />
          <p className="text-sm text-[#7A7267]">
            No marks recorded yet for this class and term.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white border border-[#E8E0D4] rounded-sm overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[550px]">
              <thead>
                <tr className="bg-[#F8F5F0] border-b border-[#E8E0D4]">
                  <th className="text-left px-4 py-3 font-semibold text-[#5A534A] text-xs uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[#5A534A] text-xs uppercase tracking-wider min-w-[140px]">
                    Student
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[#5A534A] text-xs uppercase tracking-wider min-w-[100px]">
                    Adm. No.
                  </th>
                  {subjects.map((s) => (
                    <th
                      key={s.id}
                      className="text-center px-3 py-3 font-semibold text-[#5A534A] text-xs uppercase tracking-wider min-w-[80px]"
                    >
                      {s.name}
                    </th>
                  ))}
                  <th className="text-center px-4 py-3 font-semibold text-[#5A534A] text-xs uppercase tracking-wider min-w-[90px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D4]">
                {rows.map((row, idx) => {
                  let total = 0;
                  let maxTotal = 0;
                  return (
                    <tr key={row.student.id} className="hover:bg-[#F3EDE4]/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-[#7A7267]">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#2D2A26]">
                        {row.student.fullName}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#7A7267] font-mono">
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
                            className="text-center px-3 py-3 text-xs text-[#5A534A]"
                          >
                            {m ? `${m.marksObtained}/${m.maxMarks}` : "-"}
                          </td>
                        );
                      })}
                      <td className="text-center px-4 py-3 text-xs font-bold text-[#6B1D30]">
                        {maxTotal > 0 ? `${total}/${maxTotal}` : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
