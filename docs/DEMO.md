# Demo Environment Deployment Guide

This guide documents the procedure for deploying a standalone demonstration instance of Composite Vidyalaya ERP.

The demo environment is physically and cryptographically isolated from the active school production database. It uses synthetic records only and displays a persistent demo notice across all pages.

---

## 1. Architecture & Isolation Guarantees

| Component | Production Instance | Demo Instance |
|---|---|---|
| **Vercel Project** | `composite-vidyalaya-erp` | Separate Vercel project (e.g. `composite-vidyalaya-demo`) |
| **Database** | School Neon PostgreSQL branch | Dedicated Neon branch or separate Neon project |
| **Data Type** | Actual students and staff records | 100% synthetic mock data |
| **Encryption Keys** | Private production `ENCRYPTION_KEY` | Distinct disposable `ENCRYPTION_KEY` |
| **Demo Mode Flag** | `DEMO_MODE="false"` | `DEMO_MODE="true"` |
| **Seeding Script** | Prohibited (`ALLOW_SEED=false`) | Allowed only during setup (`ALLOW_SEED=true`) |

---

## 2. Step 1: Provision an Isolated Neon Branch

1. Log in to the [Neon Console](https://console.neon.tech).
2. Either create a new project or create a branch named `demo` from your root database.
3. Copy the pooled connection string (`sslmode=require`).

---

## 3. Step 2: Configure a Separate Vercel Project

1. Import the repository in [Vercel](https://vercel.com) as a new project (e.g., `composite-vidyalaya-demo`).
2. Attach Vercel Blob storage if file upload previews are required.
3. Configure the following environment variables:

```bash
# Database (Isolated Neon Demo Branch)
DATABASE_URL="postgresql://user:password@ep-demo-xxxx.neon.tech/composite_vidyalaya?sslmode=require"

# NextAuth Authentication
NEXTAUTH_URL="https://your-demo-instance.vercel.app"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Field-Level PII Encryption Key
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"

# Gemini API (for AI spreadsheet column mapping)
GEMINI_API_KEY="your-google-ai-studio-key"

# Demo Mode Configuration
DEMO_MODE="true"
NEXT_PUBLIC_DEMO_MODE="true"

# Seed Safety Flags (Used during seeding only)
ALLOW_SEED="true"
DEMO_ADMIN_PHONE="9000000000"
DEMO_ADMIN_PASSWORD="ChooseAStrongDemoAdminPassword123"
DEMO_TEACHER_PHONE="9000000001"
DEMO_TEACHER_PASSWORD="ChooseAStrongDemoTeacherPassword123"
```

---

## 4. Step 3: Run Database Migrations and Seed

Run the following commands locally pointing `DATABASE_URL` to the demo database (never production):

1. **Apply Migrations:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Run Safe Synthetic Seed:**
   Ensure `ALLOW_SEED=true`, `DEMO_MODE=true`, and `NODE_ENV!=production` are set in your local `.env`:
   ```bash
   npm run db:seed
   ```

   The script generates:
   - 16 synthetic students distributed across Classes 1 through 8.
   - 30 days of daily attendance and statutory Mid-Day Meal (MDM) records.
   - Sample marks for Unit Test 1 and Half-Yearly exams.
   - 2 leave requests (1 approved, 1 pending).
   - 1 issued Transfer Certificate with immutable snapshot data.
   - 2 broadcast notices.

3. **Post-Seed Security:**
   After seeding, set `ALLOW_SEED="false"` in your demo environment variables so subsequent seed runs are blocked.

---

## 5. Verification Checklist

1. Navigate to the demo URL: verify that the amber banner `"Demo environment. All data is synthetic. / डेमो वातावरण। सभी डेटा कृत्रिम (सिंथेटिक) है।"` appears at the top of all pages.
2. Log in with the demo admin credentials (`DEMO_ADMIN_PHONE` / `DEMO_ADMIN_PASSWORD`).
3. Log in with the demo teacher credentials (`DEMO_TEACHER_PHONE` / `DEMO_TEACHER_PASSWORD`).
4. Attempt a destructive action (such as deleting an issued Transfer Certificate): verify that the operation is blocked and disabled.
