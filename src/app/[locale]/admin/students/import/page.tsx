import { requireRole } from "@/lib/rbac";
import { getSchoolBranding } from "@/lib/branding";
import { StudentImportClient } from "@/components/admin/student-import-client";

export default async function StudentImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;
  const branding = getSchoolBranding();

  return (
    <StudentImportClient
      locale={locale}
      sampleVillage={branding.sampleVillage}
    />
  );
}
