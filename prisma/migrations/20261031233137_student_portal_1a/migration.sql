-- AlterTable
ALTER TABLE "school_settings" ADD COLUMN     "studentPortalEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
