import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  isAccountLocked,
  evaluateFailedAttempt,
  evaluateSuccessfulLogin,
} from "@/lib/auth-lockout";

// Session lifetime — NextAuth's default is 30 days, which is way too long
// for a portal holding minors' Aadhaar/bank data. 8h covers a school day;
// updateAge rolls the expiry forward on activity so an active user isn't
// booted mid-session.
const SESSION_MAX_AGE = 8 * 60 * 60; // seconds
const SESSION_UPDATE_AGE = 30 * 60; // seconds

/**
 * Phone + password credentials login for Admin and Teacher roles only.
 * Students and parents do not have portal access.
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
    signIn: "/hi/login",
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

        const user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
        });

        // Same generic error whether the phone doesn't exist or the
        // password is wrong — don't let the error reveal which one,
        // that's an account-enumeration leak.
        if (!user || !user.passwordHash || !user.isActive) {
          throw new Error("INVALID_CREDENTIALS");
        }

        // Only admin and teacher roles can access the portal.
        if (user.role !== "ADMIN" && user.role !== "TEACHER") {
          throw new Error("INVALID_CREDENTIALS");
        }

        // Locked — tell the client explicitly so it can show a distinct
        // "try again in N minutes" message instead of "wrong password".
        if (isAccountLocked(user.lockedUntil)) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          const evalResult = evaluateFailedAttempt(user.failedLoginAttempts);

          await prisma.user.update({
            where: { id: user.id },
            data: evalResult.hitLimit
              ? {
                  failedLoginAttempts: 0,
                  lockedUntil: evalResult.lockedUntil,
                }
              : { failedLoginAttempts: evalResult.failedLoginAttempts },
          });

          throw new Error(evalResult.hitLimit ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS");
        }

        // Successful login — clear any prior failed-attempt state and
        // stamp lastLoginAt.
        await prisma.user.update({
          where: { id: user.id },
          data: evaluateSuccessfulLogin(),
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