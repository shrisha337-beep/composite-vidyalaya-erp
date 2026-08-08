import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Prisma 7 requires a driver adapter — no more bundled Rust query engine.
// Using the Neon adapter since that's this project's Postgres provider
// (HTTP/WebSocket-based, which plays nicely with serverless functions —
// no connection pool exhaustion the way raw TCP would in that environment).
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
