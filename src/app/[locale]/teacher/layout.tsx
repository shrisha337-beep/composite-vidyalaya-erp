import { requireRole } from "@/lib/rbac";
import { TeacherSidebar } from "@/components/teacher/sidebar";

export default async function TeacherLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["TEACHER"]);

  const { locale } = await params;

  return (
    <div className="flex min-h-screen bg-[#F3EDE4] text-[#2D2A26]">
      <TeacherSidebar locale={locale} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F3EDE4]">
        {children}
      </div>
    </div>
  );
}
