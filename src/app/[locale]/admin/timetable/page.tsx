import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintableTimetable } from "@/components/admin/printable-timetable";

export default async function AdminTimetablePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 print:hidden">
        <Link
          href={`/${locale}/admin`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            समय सारणी प्रबंधन
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">School Timetable &amp; Period Management</p>
        </div>
      </div>

      <PrintableTimetable />
    </main>
  );
}
