import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { getSchoolBranding } from "@/lib/branding";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  const branding = getSchoolBranding();
  return {
    title: `${t("heading")} - ${branding.schoolNameEnglish}`,
  };
}

export default function LoginPage() {
  const branding = getSchoolBranding();

  return (
    <main className="flex min-h-screen bg-[#F3EDE4]">
      {/*
       * LEFT PANEL - school identity
       * Deep maroon background matching the institutional theme.
       */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-[#6B1D30]"
      >
        {/* Decorative subtle perforation strip */}
        <div
          className="absolute inset-y-0 right-0 w-8 flex flex-col justify-around items-center py-6"
          aria-hidden
        >
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="block w-2.5 h-2.5 rounded-none bg-white/15"
            />
          ))}
        </div>

        <div>
          {/* School emblem badge */}
          <div className="w-16 h-16 rounded-sm flex items-center justify-center text-2xl font-serif font-bold mb-8 bg-gradient-to-b from-white/25 to-white/10 text-white border border-white/30 shadow-md ring-1 ring-black/15">
            CV
          </div>

          <h1 className="font-school-header text-3xl xl:text-4xl font-semibold leading-tight text-white mb-2 tracking-wide">
            {branding.isDemo ? (
              branding.schoolNameEnglish
            ) : (
              <>
                Composite School
                <br />
                <span className="text-2xl xl:text-3xl font-normal text-white/90">Chandpur Tarhar</span>
              </>
            )}
          </h1>
          <p className="text-sm text-white/80 font-medium">
            {branding.schoolNameHindi}
          </p>
        </div>

        <div>
          <div className="w-12 h-1 bg-white/30 rounded-none mb-3" />
          <p className="text-xs text-white/60">
            {branding.governanceLine}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {branding.portalSubtitle}
          </p>
        </div>
      </div>

      {/*
       * RIGHT PANEL - login card on warm beige background
       */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
        {/* Mobile-only school title */}
        <div className="mb-6 text-center lg:hidden">
          <div className="inline-flex w-12 h-12 rounded-sm items-center justify-center text-lg font-serif font-bold mb-3 bg-[#6B1D30] text-white border border-[#541624] shadow-sm">
            CV
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#7A7267] mb-1">
            {branding.portalCategory}
          </p>
          <h1 className="font-school-header text-2xl font-semibold text-[#6B1D30]">
            {branding.isDemo ? branding.schoolNameEnglish : "Composite School"}
          </h1>
          <p className="text-xs text-[#7A7267]">
            {branding.isDemo ? "Demo School · कम्पोजिट विद्यालय" : "Chandpur Tarhar · कम्पोजिट विद्यालय"}
          </p>
        </div>

        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-sm border border-[#E8E0D4] shadow-xs">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#2D2A26] mb-1">
              Welcome back
            </h2>
            <div className="w-8 h-1 bg-[#6B1D30] rounded-none mb-2" />
            <p className="text-sm font-medium text-[#7A7267]">
              Sign in to your school authority portal
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-xs text-[#7A7267]">
            Authorized School Staff Portal ·{" "}
            <a
              href="mailto:principal@cvct.edu.in"
              className="text-[#6B1D30] font-semibold underline underline-offset-2 hover:opacity-80"
            >
              Contact school admin
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
