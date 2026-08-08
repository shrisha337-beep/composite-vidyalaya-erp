/**
 * Seeds one AcademicSession, one Class/Section, and one ADMIN user
 * (Principal) so there's something to log in with on first run.
 *
 * Run with: npx prisma db seed  (after adding "prisma": { "seed": "tsx prisma/seed.ts" } to package.json)
 */
import "dotenv/config";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const session = await prisma.academicSession.upsert({
    where: { label: "2026-2027" },
    update: {},
    create: {
      label: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      isCurrent: true,
    },
  });

  const passwordHash = await bcrypt.hash("ChangeMe@123", 10);

  const adminUser = await prisma.user.upsert({
    where: { phone: "9999999999" },
    update: {},
    create: {
      role: Role.ADMIN,
      phone: "9999999999",
      passwordHash,
      adminProfile: {
        create: {
          fullName: "Principal",
          designation: "Principal",
        },
      },
    },
  });

  await prisma.schoolSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      schoolName: "Composite Vidyalaya Chandpur Tarhar",
      defaultLocale: "hi",
    },
  });

  console.log("Seeded session:", session.label);
  console.log("Seeded admin login — phone: 9999999999, password: ChangeMe@123");
  console.log("Admin user id:", adminUser.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
