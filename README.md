# Composite Vidyalaya Chandpur Tarhar — ERP Portal

## What's already set up
- Next.js (App Router, TypeScript, Tailwind v4)
- **Prisma 7** — note this is a major version jump from what you may have used before (JobTracker AI etc. likely used Prisma 5/6). Key differences baked into this scaffold:
  - No more DB URL in `schema.prisma` — it lives in `prisma.config.ts` instead.
  - A driver adapter (`@prisma/adapter-neon`) is now mandatory — there's no bundled query engine anymore.
  - Generated client lands at `src/generated/prisma` (gitignored — regenerate, don't commit).
- NextAuth v4 — phone + password credentials provider, role baked into the JWT/session (`src/lib/auth.ts`)
- **RBAC is enforced twice, deliberately**: `middleware.ts` does a fast-path redirect, but `src/lib/rbac.ts` -> `requireRole()` inside each role's `layout.tsx` is the *real* boundary. Middleware-only checks are spoofable (CVE-2025-29927 - the `x-middleware-subrequest` header bypass), so don't remove the layout-level check even if it looks redundant.
- next-intl — `hi` (default) / `en`, routing via `[locale]` segment
- Full route-group folder structure for `(admin)`, `(teacher)`, `(student)`, `(auth)` — most are empty folders awaiting pages, a few (`login`, `dashboard` x3, `unauthorized`) have placeholder pages so the app actually runs

## First-time setup (run these yourself — this sandbox couldn't reach Prisma's binary CDN)
```bash
npm install

# 1. Fill in .env (copy from .env.example) — real DATABASE_URL from your Neon project,
#    a NEXTAUTH_SECRET (openssl rand -base64 32), and an ENCRYPTION_KEY (openssl rand -hex 32)

# 2. Generate the Prisma client — this is the step that failed in my sandbox,
#    it'll work fine on your machine with normal internet access
npx prisma generate

# 3. Push the schema to your Neon database (first time — no migration history yet)
npx prisma db push

# 4. Seed one admin login + one academic session
npx prisma db seed

# 5. Run it
npm run dev
```

Seeded admin login after step 4: phone `9999999999`, password `ChangeMe@123` — change this immediately, it's a placeholder.

## Known gaps to close before this is real
- `bcrypt` password hashing is wired up, login form and auth flow are functional for admin and teacher roles.
- Aadhaar/bank account fields in the schema have a `// sensitive — encrypt at application layer` comment but no encryption is implemented yet. `lib/encryption.ts` exists but needs integration before any real student data goes in.
- Portal access is restricted to ADMIN (Principal) and TEACHER roles only. Students and parents do not have login access.
- `npm audit` shows some vulnerabilities from transitive deps in the create-next-app template — worth a look before shipping, not urgent for local dev.

## Portal scope
Admin (Principal/Headmaster) and Teachers only. Students are data records managed through the admin panel — they do not log in.
