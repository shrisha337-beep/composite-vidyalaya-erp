import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createHomework } from "@/app/actions/homework";

export default async function TeacherNewHomeworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ class?: string; error?: string }>;
}) {
  await requireRole(["TEACHER"]);
  const { locale } = await params;
  const sparams = await searchParams;

  const classFilter = sparams.class ?? "";
  const error = sparams.error ?? "";

  // 1. Fetch current active session
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      classes: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  const classes = currentSession?.classes.map((c) => c.name) ?? [];

  // 2. Fetch subjects for selected class
  let subjects: { id: string; name: string }[] = [];
  if (classFilter && currentSession) {
    const selectedClassObj = currentSession.classes.find((c) => c.name === classFilter);
    if (selectedClassObj) {
      subjects = await prisma.subject.findMany({
        where: { classId: selectedClassObj.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/teacher/homework`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            गृहकार्य असाइनमेंट तैयार करें
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Assign New Homework Task</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        {/* Class selection helper */}
        <form method="GET" className="mb-4 pb-4 border-b border-gray-100">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Step 1: Choose Class / कक्षा चुनें
          </label>
          <div className="flex gap-2">
            <select
              name="class"
              defaultValue={classFilter}
              className="border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white flex-1"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 bg-white"
            >
              Select
            </button>
          </div>
        </form>

        {classFilter ? (
          <form action={createHomework} className="space-y-4">
            <input type="hidden" name="locale" value={locale} />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded">
                {error}
              </div>
            )}

            {/* Subject Select */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Subject / विषय <span className="text-red-500">*</span>
              </label>
              <select
                name="subjectId"
                required
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Homework Title / गृहकार्य का शीर्षक <span className="text-red-500">*</span>
              </label>
              <input
                name="title"
                required
                placeholder="e.g. Read Lesson 3 and answer exercises"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description / निर्देश
              </label>
              <textarea
                name="description"
                rows={4}
                placeholder="Provide detailed instructions..."
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              />
            </div>

            {/* Due Date */}
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Due Date / जमा करने की अंतिम तिथि <span className="text-red-500">*</span>
              </label>
              <input
                name="dueDate"
                type="date"
                required
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              />
            </div>

            {/* Attachment File */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Attachment File (optional) / फाइल अटैचमेंट
              </label>
              <input
                type="file"
                name="attachment"
                className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center gap-3 border-t border-gray-100">
              <button
                type="submit"
                className="px-6 py-2 rounded text-sm font-medium text-white transition-colors"
                style={{ background: "hsl(var(--primary))" }}
              >
                Assign Homework
              </button>
              <Link
                href={`/${locale}/teacher/homework`}
                className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded">
            Choose class in Step 1 to load subject options.
          </p>
        )}
      </div>
    </main>
  );
}
