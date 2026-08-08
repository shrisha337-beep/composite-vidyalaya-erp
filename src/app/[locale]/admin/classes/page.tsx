import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { setupAcademicSession } from "@/app/actions/setup-session";
import { redirect } from "next/navigation";

async function getSessionData() {
  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      classes: {
        orderBy: { name: "asc" },
        include: {
          sections: {
            include: { _count: { select: { students: true } } },
          },
        },
      },
    },
  });
  return session;
}

// ─── Setup form (shown when no session exists) ────────────────────────────────

function SetupForm({ error }: { error?: string }) {
  const currentYear = new Date().getFullYear();
  const defaultLabel = `${currentYear}-${currentYear + 1}`;

  return (
    <div className="max-w-md mx-auto mt-16 bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-1">
        Set up Academic Session
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        This needs to be done once before adding any students. Classes 1–8 will
        be created automatically.
      </p>

      {error && (
        <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </p>
      )}

      <form action={setupAcademicSession} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session label
          </label>
          <input
            name="label"
            defaultValue={defaultLabel}
            placeholder="e.g. 2025-2026"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start date
            </label>
            <input
              name="startDate"
              type="date"
              defaultValue={`${currentYear}-04-01`}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End date
            </label>
            <input
              name="endDate"
              type="date"
              defaultValue={`${currentYear + 1}-03-31`}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 rounded-md text-sm font-medium text-white transition-colors"
          style={{ background: "hsl(var(--primary))" }}
        >
          Create session &amp; classes
        </button>
      </form>
    </div>
  );
}

// ─── Classes overview (shown when session exists) ─────────────────────────────

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["ADMIN"]);

  const { error } = await searchParams;
  const sessionData = await getSessionData();

  if (!sessionData) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Academic session &amp; class setup
          </p>
        </div>
        <SetupForm error={error} />
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Session:{" "}
            <span className="font-medium text-gray-700">
              {sessionData.label}
            </span>{" "}
            &nbsp;·&nbsp;{" "}
            {new Date(sessionData.startDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            —{" "}
            {new Date(sessionData.endDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Class grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sessionData.classes.map((cls) => {
          const studentCount =
            cls.sections[0]?._count?.students ?? 0;
          return (
            <div
              key={cls.id}
              className="bg-white rounded-lg border border-gray-200 p-4 text-center"
            >
              <p className="text-2xl font-bold text-gray-800 mb-0.5">
                Class {cls.name}
              </p>
              <p className="text-sm text-gray-500">
                {studentCount}{" "}
                {studentCount === 1 ? "student" : "students"}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
