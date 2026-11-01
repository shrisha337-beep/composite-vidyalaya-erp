import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSchoolBranding } from "@/lib/branding";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export function generateMetadata(): Metadata {
  const branding = getSchoolBranding();
  return {
    title: `Change Password - ${branding.schoolNameEnglish}`,
  };
}

export default async function ChangePasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3EDE4] p-6">
      <div className="w-full max-w-md rounded-sm border border-[#E8E0D4] bg-white p-8 shadow-xs">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#2D2A26]">
            Change Your Password
          </h1>
          <p className="mt-1 text-sm text-[#7A7267]">
            For your security, please set a new personal password before
            continuing to the portal.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  );
}

