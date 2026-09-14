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
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar locale={locale} />
      <div className="flex-1 flex flex-col min-w-0 pt-12 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
