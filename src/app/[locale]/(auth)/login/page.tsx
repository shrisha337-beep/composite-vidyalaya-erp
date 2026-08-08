import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  return {
    title: `${t("heading")} — Composite Vidyalaya Chandpur Tarhar`,
  };
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen">
      {/*
       * LEFT PANEL — school identity
       * Maroon background mirrors the TC register book cover.
       * Dotted vertical line imitates the binding perforation.
       */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "hsl(var(--primary))" }}
      >
        {/* Decorative perforation strip */}
        <div
          className="absolute inset-y-0 right-0 w-8 flex flex-col justify-around items-center py-6"
          aria-hidden
        >
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="block w-3 h-3 rounded-full"
              style={{ background: "hsl(var(--primary-foreground) / 0.18)" }}
            />
          ))}
        </div>

        <div>
          {/* School emblem placeholder */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-8"
            style={{
              background: "hsl(var(--primary-foreground) / 0.15)",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            CV
          </div>

          <h1
            className="text-3xl xl:text-4xl font-bold leading-snug mb-3"
            style={{ color: "hsl(var(--primary-foreground))" }}
          >
            Composite Vidyalaya
            <br />
            Chandpur Tarhar
          </h1>
          <p
            className="text-sm opacity-70"
            style={{ color: "hsl(var(--primary-foreground))" }}
          >
            कम्पोजिट विद्यालय चांदपुर तरहर
          </p>
        </div>

        <div>
          <p
            className="text-xs opacity-50"
            style={{ color: "hsl(var(--primary-foreground))" }}
          >
            Government of Uttar Pradesh · Education Department
          </p>
        </div>
      </div>

      {/*
       * RIGHT PANEL — login form
       * Cream background, centered card.
       */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
        {/* Mobile-only school name */}
        <div className="mb-8 text-center lg:hidden">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Government School Portal
          </p>
          <h1 className="text-xl font-bold" style={{ color: "hsl(var(--primary))" }}>
            Composite Vidyalaya
          </h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-1">
              Welcome back
            </h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }} className="text-sm">
              Sign in to your school portal
            </p>
          </div>

          <LoginForm />

          <p className="mt-8 text-center text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            Having trouble?{" "}
            <a
              href="mailto:principal@cvct.edu.in"
              className="underline underline-offset-2 hover:opacity-80"
            >
              Contact school admin
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
