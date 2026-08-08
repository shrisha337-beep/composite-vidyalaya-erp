import "next-auth";

// Module augmentation — adds `id` and `role` onto the default Session/User
// shapes so `session.user.role` is typed everywhere instead of `any`.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
      phone?: string;
      email?: string | null;
    };
  }
  interface User {
    id: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  }
}
