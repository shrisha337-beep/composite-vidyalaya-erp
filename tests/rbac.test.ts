import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock react's cache to execute the inner function directly
vi.mock("react", () => ({
  cache: (fn: any) => fn,
}));

// Mock next/navigation redirect
const mockRedirect = vi.fn((url: string) => {
  const err = new Error(`NEXT_REDIRECT: ${url}`);
  (err as any).digest = `NEXT_REDIRECT;replace;${url};307;;`;
  throw err;
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// Mock next-auth getServerSession
let mockSession: any = null;
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { requireRole } from "@/lib/rbac";

describe("RBAC Server Guard - requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it("redirects unauthenticated request to /login when session is null", async () => {
    mockSession = null;

    await expect(requireRole(["ADMIN"])).rejects.toThrow("NEXT_REDIRECT: /login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session exists but has no user", async () => {
    mockSession = { expires: "2026-10-25T12:00:00Z" };

    await expect(requireRole(["ADMIN"])).rejects.toThrow("NEXT_REDIRECT: /login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("allows access and returns session when user has the required ADMIN role", async () => {
    mockSession = {
      user: {
        id: "usr-admin",
        role: "ADMIN",
        phone: "9876543210",
      },
    };

    const session = await requireRole(["ADMIN"]);
    expect(session).toEqual(mockSession);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("allows access when user has TEACHER role and TEACHER is in allowed list", async () => {
    mockSession = {
      user: {
        id: "usr-teacher",
        role: "TEACHER",
        phone: "9876543211",
      },
    };

    const session = await requireRole(["ADMIN", "TEACHER"]);
    expect(session).toEqual(mockSession);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("rejects with redirect to /unauthorized when user has TEACHER role but only ADMIN is allowed", async () => {
    mockSession = {
      user: {
        id: "usr-teacher",
        role: "TEACHER",
        phone: "9876543211",
      },
    };

    await expect(requireRole(["ADMIN"])).rejects.toThrow("NEXT_REDIRECT: /unauthorized");
    expect(mockRedirect).toHaveBeenCalledWith("/unauthorized");
  });

  it("rejects with redirect to /unauthorized when user role is STUDENT or PARENT", async () => {
    mockSession = {
      user: {
        id: "usr-student",
        role: "STUDENT",
      },
    };

    await expect(requireRole(["ADMIN", "TEACHER"])).rejects.toThrow(
      "NEXT_REDIRECT: /unauthorized"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/unauthorized");
  });
});
