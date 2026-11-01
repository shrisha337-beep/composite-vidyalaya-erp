import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  isAccountLocked,
  evaluateFailedAttempt,
  evaluateSuccessfulLogin,
} from "@/lib/auth-lockout";
import { isStudentPortalEnabled } from "@/lib/data/school-settings";
import {
  isStaffPhoneIdentifier,
  LEGACY_SHARED_STUDENT_PASSWORD,
} from "@/lib/student-credentials";

// Session lifetime — NextAuth's default is 30 days, which is way too long
// for a portal holding minors' Aadhaar/bank data. 8h covers a school day;
// updateAge rolls the expiry forward on activity so an active user isn't
// booted mid-session.
const SESSION_MAX_AGE = 8 * 60 * 60; // seconds
const SESSION_UPDATE_AGE = 30 * 60; // seconds

/**
 * Credentials login:
 * - 10-digit mobile number -> ADMIN / TEACHER lookup via User.phone
 * - Non-10-digit identifier -> STUDENT lookup via Student.admissionNo
 *   (accepted only while studentPortalEnabled is true).
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
        const identifier = credentials?.phone?.trim();
        const password = credentials?.password;

        if (!identifier || !password) {
          throw new Error("INVALID_CREDENTIALS");
        }

        let user: {
          id: string;
          role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
          phone: string;
          email: string | null;
          passwordHash: string | null;
          mustChangePassword: boolean;
          isActive: boolean;
          failedLoginAttempts: number;
          lockedUntil: Date | null;
        } | null = null;

        if (isStaffPhoneIdentifier(identifier)) {
          // 10-digit mobile numbers are exclusively for ADMIN and TEACHER accounts.
          const staffUser = await prisma.user.findUnique({
            where: { phone: identifier },
          });

          if (
            !staffUser ||
            (staffUser.role !== "ADMIN" && staffUser.role !== "TEACHER")
          ) {
            throw new Error("INVALID_CREDENTIALS");
          }

          user = staffUser;
        } else {
          // Non-10-digit identifiers resolve a STUDENT by admission number.
          const portalOpen = await isStudentPortalEnabled();
          if (!portalOpen) {
            throw new Error("INVALID_CREDENTIALS");
          }

          // Never allow the legacy shared default password to authenticate a student.
          if (
            password.toLowerCase() ===
            LEGACY_SHARED_STUDENT_PASSWORD.toLowerCase()
          ) {
            throw new Error("INVALID_CREDENTIALS");
          }

          const student = await prisma.student.findUnique({
            where: { admissionNo: identifier },
            select: {
              id: true,
              isActive: true,
              user: true,
            },
          });

          if (
            !student ||
            !student.isActive ||
            !student.user ||
            student.user.role !== "STUDENT"
          ) {
            throw new Error("INVALID_CREDENTIALS");
          }

          user = student.user;
        }

        // Same generic error whether the phone doesn't exist or the
        // password is wrong — don't let the error reveal which one,
        // that's an account-enumeration leak.
        if (!user || !user.passwordHash || !user.isActive) {
          throw new Error("INVALID_CREDENTIALS");
        }

        // Locked — tell the client explicitly so it can show a distinct
        // "try again in N minutes" message instead of "wrong password".
        if (isAccountLocked(user.lockedUntil)) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

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
          mustChangePassword: user.mustChangePassword,
          phone: user.phone,
          email: user.email ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    // Role gets baked into the JWT so every server component / API route
    // can read it from the token without an extra DB round-trip.
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustChangePassword = Boolean(user.mustChangePassword);
      } else if (trigger === "update" && token.id) {
        const freshUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { mustChangePassword: true, isActive: true },
        });
        if (freshUser && freshUser.isActive) {
          token.mustChangePassword = freshUser.mustChangePassword;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
};
