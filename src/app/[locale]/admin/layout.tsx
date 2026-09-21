import { requireRole } from "@/lib/rbac";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Server-side role gate — see lib/rbac.ts for why this must live here
  // in addition to the proxy.ts check (CVE-2025-29927).
  await requireRole(["ADMIN"]);

  const { locale } = await params;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#F3EDE4] text-[#2D2A26]">
      <AdminSidebar locale={locale} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F3EDE4] pb-20 lg:pb-0 w-full">
        {children}
      </div>
    </div>
  );
}
