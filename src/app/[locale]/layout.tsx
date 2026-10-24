import type { Metadata } from "next";
import { Noto_Serif_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/provider";
import { DemoBanner } from "@/components/demo-banner";
import "../globals.css";

const notoSerifDisplay = Noto_Serif_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-school-header",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://cvchandpurtarhar.in"),
  title: "Composite School Chandpur Tarhar - ERP",
  description:
    "Government school ERP portal for Composite School Chandpur Tarhar. Manage students, attendance, marks, mid-day meals, and more.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "hi" | "en")) {
    notFound();
  }

  // Loads src/i18n/messages/{locale}.json via the getRequestConfig in i18n/request.ts
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className={`min-h-full flex flex-col ${notoSerifDisplay.variable}`}>
        <DemoBanner />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* SessionProvider must wrap all client components that call useSession / signIn */}
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
