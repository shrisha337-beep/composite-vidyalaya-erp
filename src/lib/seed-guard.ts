/**
 * Environment validation guards for database seeding.
 * Strictly prevents accidental execution against production databases.
 */

export interface SeedEnv {
  ALLOW_SEED?: string;
  DEMO_MODE?: string;
  NODE_ENV?: string;
  DEMO_ADMIN_PHONE?: string;
  DEMO_ADMIN_PASSWORD?: string;
  DEMO_TEACHER_PHONE?: string;
  DEMO_TEACHER_PASSWORD?: string;
}

export interface SeedGuardResult {
  allowed: boolean;
  error?: string;
}

export function validateSeedEnvironment(env: SeedEnv = process.env): SeedGuardResult {
  // 1. Refuse outright when NODE_ENV=production
  if (env.NODE_ENV === "production") {
    return {
      allowed: false,
      error: "CRITICAL: Database seeding is prohibited in production (NODE_ENV=production).",
    };
  }

  // 2. Refuse unless ALLOW_SEED=true is set
  if (env.ALLOW_SEED !== "true") {
    return {
      allowed: false,
      error: "Seeding aborted: ALLOW_SEED=true must be set to run prisma/seed.ts.",
    };
  }

  // 3. Refuse unless DEMO_MODE is "true"
  if (env.DEMO_MODE !== "true") {
    return {
      allowed: false,
      error: "Seeding aborted: DEMO_MODE=true must be set to run prisma/seed.ts.",
    };
  }

  // 4. Validate required credentials
  if (!env.DEMO_ADMIN_PHONE || !env.DEMO_ADMIN_PASSWORD) {
    return {
      allowed: false,
      error: "Missing required demo admin credentials: DEMO_ADMIN_PHONE and DEMO_ADMIN_PASSWORD must be defined.",
    };
  }

  if (!env.DEMO_TEACHER_PHONE || !env.DEMO_TEACHER_PASSWORD) {
    return {
      allowed: false,
      error: "Missing required demo teacher credentials: DEMO_TEACHER_PHONE and DEMO_TEACHER_PASSWORD must be defined.",
    };
  }

  return { allowed: true };
}
