import { describe, it, expect } from "vitest";
import { validateSeedEnvironment, type SeedEnv } from "@/lib/seed-guard";

describe("Seed Guard - Database Protection", () => {
  const validBaseEnv: SeedEnv = {
    NODE_ENV: "development",
    ALLOW_SEED: "true",
    DEMO_MODE: "true",
    DEMO_ADMIN_PHONE: "9000000000",
    DEMO_ADMIN_PASSWORD: "AdminSecretPassword123",
    DEMO_TEACHER_PHONE: "9000000001",
    DEMO_TEACHER_PASSWORD: "TeacherSecretPassword123",
  };

  it("blocks execution outright when NODE_ENV=production, regardless of other flags", () => {
    const env: SeedEnv = {
      ...validBaseEnv,
      NODE_ENV: "production",
    };
    const res = validateSeedEnvironment(env);
    expect(res.allowed).toBe(false);
    expect(res.error).toContain("prohibited in production");
  });

  it("blocks execution when ALLOW_SEED is not 'true'", () => {
    const env: SeedEnv = {
      ...validBaseEnv,
      ALLOW_SEED: "false",
    };
    const res = validateSeedEnvironment(env);
    expect(res.allowed).toBe(false);
    expect(res.error).toContain("ALLOW_SEED=true must be set");
  });

  it("blocks execution when ALLOW_SEED is undefined", () => {
    const env: SeedEnv = {
      ...validBaseEnv,
      ALLOW_SEED: undefined,
    };
    const res = validateSeedEnvironment(env);
    expect(res.allowed).toBe(false);
    expect(res.error).toContain("ALLOW_SEED=true must be set");
  });

  it("blocks execution when DEMO_MODE is not 'true'", () => {
    const env: SeedEnv = {
      ...validBaseEnv,
      DEMO_MODE: "false",
    };
    const res = validateSeedEnvironment(env);
    expect(res.allowed).toBe(false);
    expect(res.error).toContain("DEMO_MODE=true must be set");
  });

  it("blocks execution when DEMO_ADMIN credentials are missing", () => {
    const env: SeedEnv = {
      ...validBaseEnv,
      DEMO_ADMIN_PHONE: undefined,
    };
    const res = validateSeedEnvironment(env);
    expect(res.allowed).toBe(false);
    expect(res.error).toContain("DEMO_ADMIN_PHONE and DEMO_ADMIN_PASSWORD must be defined");
  });

  it("blocks execution when DEMO_TEACHER credentials are missing", () => {
    const env: SeedEnv = {
      ...validBaseEnv,
      DEMO_TEACHER_PASSWORD: undefined,
    };
    const res = validateSeedEnvironment(env);
    expect(res.allowed).toBe(false);
    expect(res.error).toContain("DEMO_TEACHER_PHONE and DEMO_TEACHER_PASSWORD must be defined");
  });

  it("allows execution only when NODE_ENV is non-production and both ALLOW_SEED and DEMO_MODE flags and credentials are valid", () => {
    const res = validateSeedEnvironment(validBaseEnv);
    expect(res.allowed).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
