import "next-auth";

// Module augmentation — adds `id`, `role`, and `mustChangePassword` onto the
// default Session/User/JWT shapes so they are typed everywhere instead of `any`.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
      mustChangePassword?: boolean;
      phone?: string;
      email?: string | null;
    };
  }
  interface User {
    id: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
    mustChangePassword?: boolean;
  }
}
