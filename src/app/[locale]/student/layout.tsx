import { requireRole } from "@/lib/rbac";
import { StudentSidebar } from "@/components/student/sidebar";

export default async function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["STUDENT", "PARENT"]);
  const { locale } = await params;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StudentSidebar locale={locale} />
      <div className="flex-1 flex flex-col min-w-0 pt-12 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
