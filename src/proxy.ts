import createMiddleware from "next-intl/middleware";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Fast-path only. This is NOT the real access-control boundary — see the
// warning in lib/rbac.ts. This just gives logged-out users an immediate
// redirect instead of waiting for the page to render and bounce them.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const localeMatch = path.match(/^\/(en|hi)(?:\/|$)/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

    if (token?.mustChangePassword) {
      const isChangePasswordPath =
        path === "/change-password" ||
        /^\/(en|hi)\/change-password(?:\/|$)/.test(path);
      const isLoginPath =
        path === "/login" || /^\/(en|hi)\/login(?:\/|$)/.test(path);

      if (!isChangePasswordPath && !isLoginPath) {
        return NextResponse.redirect(
          new URL(`/${locale}/change-password`, req.url)
        );
      }
    }

    if (token) {
      if (
        /^\/(en|hi)\/admin(?:\/|$)/.test(path) &&
        token.role !== "ADMIN"
      ) {
        return NextResponse.redirect(
          new URL(`/${locale}/unauthorized`, req.url)
        );
      }
      if (
        /^\/(en|hi)\/teacher(?:\/|$)/.test(path) &&
        token.role !== "TEACHER"
      ) {
        return NextResponse.redirect(
          new URL(`/${locale}/unauthorized`, req.url)
        );
      }
      if (
        /^\/(en|hi)\/student(?:\/|$)/.test(path) &&
        token.role !== "STUDENT"
      ) {
        return NextResponse.redirect(
          new URL(`/${locale}/unauthorized`, req.url)
        );
      }
    }

    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const publicPaths = ["/login"];
        const path = req.nextUrl.pathname;
        const isPublic = publicPaths.some((p) => path.includes(p)) || path === "/" || /^\/(en|hi)\/?$/.test(path);
        if (isPublic) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
