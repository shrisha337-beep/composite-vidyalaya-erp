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
    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const publicPaths = ["/login", "/forgot-password", "/reset-password", "/verify-otp"];
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
