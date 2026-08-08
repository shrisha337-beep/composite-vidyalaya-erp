import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/provider";
import "../globals.css";

export const metadata: Metadata = {
  title: "Composite Vidyalaya Chandpur Tarhar — ERP",
  description:
    "Government school ERP portal for Composite Vidyalaya Chandpur Tarhar. Manage students, attendance, marks, mid-day meals, and more.",
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
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* SessionProvider must wrap all client components that call useSession / signIn */}
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
