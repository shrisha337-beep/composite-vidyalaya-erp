import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

const dashboardByRole: Record<string, string> = {
  ADMIN: "admin/dashboard",
  TEACHER: "teacher/dashboard",
  STUDENT: "student/dashboard",
  PARENT: "student/dashboard",
};

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  redirect(`/${locale}/${dashboardByRole[session.user.role]}`);
}
