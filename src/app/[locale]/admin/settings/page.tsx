import { requireRole } from "@/lib/rbac";
import { getSchoolSettings } from "@/app/actions/school-settings";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { SchoolSettingsForm } from "@/components/admin/school-settings-form";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;

  const settings = await getSchoolSettings();

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/admin/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            School Settings / विद्यालय विवरण सेटिंग्स
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure school name, address, UDISE code, and government branding logos
          </p>
        </div>
      </div>

      <SchoolSettingsForm locale={locale} settings={settings} />
    </main>
  );
}
