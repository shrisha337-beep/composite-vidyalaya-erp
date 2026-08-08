import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Account lockout config — DB-backed (not in-memory) on purpose: this runs
// on Vercel serverless functions, so an in-memory counter would reset on
// every cold start and wouldn't be shared across instances anyway.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Session lifetime — NextAuth's default is 30 days, which is way too long
// for a portal holding minors' Aadhaar/bank data. 8h covers a school day;
// updateAge rolls the expiry forward on activity so an active user isn't
// booted mid-session.
const SESSION_MAX_AGE = 8 * 60 * 60; // seconds
const SESSION_UPDATE_AGE = 30 * 60; // seconds

/**
 * Phone + password credentials login. SMS OTP (login MFA + password reset)
 * is handled by a separate /api/auth/otp route that issues a short-lived
 * OtpCode row — this provider just verifies the final password step.
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Phone & Password",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          throw new Error("INVALID_CREDENTIALS");
        }

        let user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
        });

        if (!user) {
          const student = await prisma.student.findUnique({
            where: { admissionNo: credentials.phone },
            select: { userId: true },
          });
          if (student) {
            user = await prisma.user.findUnique({
              where: { id: student.userId },
            });
          }
        }

        // Same generic error whether the phone doesn't exist or the
        // password is wrong — don't let the error reveal which one,
        // that's an account-enumeration leak.
        if (!user || !user.passwordHash || !user.isActive) {
          throw new Error("INVALID_CREDENTIALS");
        }

        // Locked — tell the client explicitly so it can show a distinct
        // "try again in N minutes" message instead of "wrong password".
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          const attempts = user.failedLoginAttempts + 1;
          const hitLimit = attempts >= MAX_FAILED_ATTEMPTS;

          await prisma.user.update({
            where: { id: user.id },
            data: hitLimit
              ? {
                  failedLoginAttempts: 0,
                  lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
                }
              : { failedLoginAttempts: attempts },
          });

          throw new Error(hitLimit ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS");
        }

        // Successful login — clear any prior failed-attempt state and
        // stamp lastLoginAt.
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          role: user.role,
          phone: user.phone,
          email: user.email ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    // Role gets baked into the JWT so every server component / API route
    // can read it from the token without an extra DB round-trip.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};