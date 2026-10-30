import { requireRole } from "@/lib/rbac";
import { TeacherSidebar } from "@/components/teacher/sidebar";
import { getSchoolBranding } from "@/lib/branding";

export default async function TeacherLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["TEACHER"]);

  const { locale } = await params;
  const branding = getSchoolBranding();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#F3EDE4] text-[#2D2A26]">
      <TeacherSidebar
        locale={locale}
        schoolName={
          branding.isDemo ? branding.schoolNameEnglish : "Composite School"
        }
        location={branding.location}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F3EDE4] pb-20 lg:pb-0 w-full">
        {children}
      </div>
    </div>
  );
}
