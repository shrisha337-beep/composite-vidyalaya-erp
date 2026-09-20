# Architectural & Technical Decision Record (DECISION.md)

**Project:** Composite Vidyalaya Chandpur Tarhar — School ERP Portal  
**Target Institution:** Composite Vidyalaya Chandpur Tarhar (Classes 1 to 8), Basic Shiksha Parishad, Uttar Pradesh, India  
**Scope:** Institutional Administration, Student Lifecycle, Mid-Day Meal (MDM), Transfer Certificates, Academic Records, and Multi-Role Access Control  
**Document Version:** 1.0  
**Status:** Approved & Implemented  

---

## Table of Contents

1. [Executive Summary: What Did We Make?](#1-executive-summary-what-did-we-make)
2. [Technology Stack](#2-technology-stack)
3. [Core Architectural Approach & Rationale](#3-core-architectural-approach--rationale)
4. [Real-World Challenges Faced & How We Overcame Them](#4-real-world-challenges-faced--how-we-overcame-them)
5. [Library & Module Selection Rationale](#5-library--module-selection-rationale)
6. [Architectural Decision Records (ADR Log)](#6-architectural-decision-records-adr-log)
7. [System Workflows & Visual Diagrams](#7-system-workflows--visual-diagrams)
8. [Summary & Maintenance Guide](#8-summary--maintenance-guide)

---

## 1. Executive Summary: What Did We Make?

We built a comprehensive, institutional-grade **Enterprise Resource Planning (ERP) Portal** specifically tailored for **Composite Vidyalaya Chandpur Tarhar**, a government-run composite school in Uttar Pradesh, India, educating students from **Class 1 through Class 8**.

Government composite schools in India operate under unique operational conditions:
- **Administrative Complexity:** A single Headmaster (Principal) and a small team of Assistant Teachers manage hundreds of students, record keeping, government schemes, and daily examinations.
- **Strict Compliance Reporting:** Daily records must comply with state guidelines for the **Pradhan Mantri Poshan Shakti Nirman (Mid-Day Meal / MDM)** scheme, attendance registers, and official Transfer Certificates (TC).
- **Data Heterogeneity:** Student enrollment data arrives from disparate sources (UP Prerna portal, Sharda portal, U-DISE+, or hand-typed local spreadsheets) with inconsistent formatting, mixed Hindi/English text, and differing column sequences.
- **Hardware & Bandwidth Realities:** School staff access software via rural broadband or mobile hotspots using entry-level desktop PCs or mobile devices.

### Key Modules Built:

1. **Role-Based Portal Access (Admin & Teacher):**
   - **Admin (Headmaster / Principal):** Complete administrative authority over school settings, class structures, teacher records, bulk student admissions, MDM governance, financial and grain ledgers, reports, and official certificates.
   - **Teacher (Assistant Teachers):** Daily student attendance marking, marks entry (Quarterly, Half-Yearly, Annual), homework dissemination, student directory viewing, and personal leave applications.
   - *Note:* Students and parents do not have login access. They are managed purely as institutional records, keeping security overhead and attack surfaces minimal.

2. **Smart Multi-Format Student Importer (AI + Heuristic):**
   - Eliminates manual data entry by accepting arbitrary Excel/CSV files.
   - Leverages **Google Gemini 2.0 Flash** to semantically map arbitrary column headers (including Hindi headers like *"छात्र का नाम"*, *"पिता का नाम"*, *"कक्षा"*, *"मोबाइल"*, and abbreviations like *"Adm No"*, *"DOB"*) into the normalized ERP database schema.
   - Features a deterministic regex heuristic fallback to ensure uninterrupted operation even during internet degradation or in the absence of an AI API key.
   - Provides an interactive 4-step wizard: Upload $\rightarrow$ Column Mapping $\rightarrow$ Data Validation Preview $\rightarrow$ Database Commit.

3. **Academic Session & Class Health Engine:**
   - Enforces the composite school structure (Classes 1 to 8, with designated sections and enrollment capacities).
   - Automated health detection verifies that all standard classes exist within the active academic session.
   - Provides a non-intrusive one-click repair mechanism to initialize missing classes and default sections in a single transactional operation.

4. **Government-Compliant Mid-Day Meal (MDM) Module:**
   - Implements official UP Basic Shiksha Parishad nutrition and conversion cost formulas:
     - **Primary Tier (Classes 1–5):** 100g food grains per child/day; ₹6.78 conversion cost per meal.
     - **Upper Primary / Junior Tier (Classes 6–8):** 150g food grains per child/day; ₹10.17 conversion cost per meal.
   - **Special Fruit Distribution:** Tracks Friday fruit distribution (₹4.00 allocated per student) with individual student consumption logs.
   - Daily automated attendance linking, food grain inventory balance tracking (Rice & Wheat), vendor management, and monthly government report generation.

5. **Transfer Certificate (TC) & Document Generation:**
   - Generates official, tamper-resistant, bilingual (Hindi & English) Transfer Certificates with unique serial numbers, admission numbers, reason for withdrawal, conduct assessment, and academic progress notes.
   - High-fidelity PDF rendering via `@react-pdf/renderer` directly printable on institutional letterhead.

6. **Sensitive PII Field-Level Encryption:**
   - Protects minors' and guardians' sensitive Personally Identifiable Information (Aadhaar numbers and bank account details) using **AES-256-GCM** encryption before storage in PostgreSQL.

7. **Bilingual User Experience (Hindi Default & English):**
   - Full internationalization via `next-intl` with **Hindi (`hi`)** as the primary language and **English (`en`)** as an alternate, matching the working language of UP state educators.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose in this Project |
|---|---|---|---|
| **Core Framework** | Next.js (App Router) | 16.2.11 | Full-stack server-first architecture, Server Components, and Server Actions |
| **Language & Runtime** | TypeScript & Node.js | TypeScript 5 / React 19.2.4 | Type safety across entire domain model, modern concurrent React features |
| **Database Engine** | PostgreSQL (Neon Serverless) | Serverless v1.1.0 | Cloud-native serverless Postgres with WebSocket connection pooling |
| **ORM & Query Engine** | Prisma 7 | 7.9.0 | Data modeling, migrations, client generator (`@prisma/adapter-neon`) |
| **Authentication** | NextAuth.js | 4.24.15 | Credentials Provider (Phone + Password), JWT session strategy, role claims |
| **Cryptography & Security** | Node.js `crypto` & `bcryptjs` | Built-in / 3.0.3 | AES-256-GCM for PII encryption; Bcrypt for password hashing |
| **Artificial Intelligence** | Google Generative AI (Gemini) | 0.24.1 (`@google/generative-ai`) | Semantic column detection for unstructured Excel files using Gemini 2.0 Flash |
| **Spreadsheet Processing** | SheetJS (`xlsx`) | 0.18.5 | Client/Server parsing of `.xlsx` and `.csv` student spreadsheets |
| **PDF Document Generation** | `@react-pdf/renderer` | 4.5.1 | Pixel-perfect bilingual Transfer Certificate (TC) generation |
| **Styling & Design System** | Tailwind CSS v4 | 4.x | Institutional color palette, custom utility tokens, zero-runtime CSS |
| **UI Components & Icons** | Radix UI & Lucide React | Radix v2 / Lucide 1.27.0 | Accessible UI primitives (Labels, Slots) and clear visual iconography |
| **Data Validation** | Zod | 4.4.3 | Runtime schema validation for forms, imports, and server actions |
| **Internationalization (i18n)** | `next-intl` | 4.13.4 | Bilingual routing (`/hi/...`, `/en/...`) with server-side message translation |
| **Email Communications** | Resend | 6.18.1 | Transactional email delivery for password resets |

---

## 3. Core Architectural Approach & Rationale

### A. Server-First Architecture over Client-Side SPA
* **The Decision:** Build the application using Next.js App Router, React Server Components (RSC), and Server Actions rather than a traditional Single Page Application (SPA).
* **Why:** In rural schools, client devices frequently have limited CPU performance and constrained network bandwidth. By rendering components on the server and using Server Actions for data mutations, we:
  - Eliminate the transmission of large client-side JavaScript bundles.
  - Keep sensitive business logic, database queries, and encryption keys strictly on the server.
  - Provide instant first contentful paint (FCP) over low-speed mobile connections.

### B. Dual-Layer "Defense-in-Depth" Role-Based Access Control (RBAC)
* **The Decision:** Implement authentication and role enforcement at **two separate layers**:
  1. *Layer 1 (Fast-Path UX):* `src/proxy.ts` (Next.js middleware) intercepts requests and redirects unauthenticated users to `/login`.
  2. *Layer 2 (Security Boundary):* Server-side `requireRole(["ADMIN"])` or `requireRole(["TEACHER"])` in each route group layout (e.g., `src/app/[locale]/admin/layout.tsx`) and within every Server Action.
* **Why:** Middleware-only security in Next.js has known circumvention risks (such as the historical `x-middleware-subrequest` bypass recorded in **CVE-2025-29927**). A client-spoofed request could theoretically bypass middleware routing. Treating route layouts and server actions as the authoritative gate ensures that unauthorized access is impossible regardless of request headers.

### C. Application-Level Field Encryption (AES-256-GCM)
* **The Decision:** Encrypt sensitive fields (Student Aadhaar, Guardian Aadhaar, Bank Account Numbers) before they touch the database using AES-256-GCM authenticated encryption.
* **Why:** 
  - Standard database disk encryption (TDE) only protects against physical theft of hard drives; it does not protect against SQL injection, compromised database credentials, or unauthorized database read-replicas.
  - Indian data privacy guidelines strictly prohibit the storage of unmasked Aadhaar numbers in plaintext.
  - Storing data as `enc:v1:<iv>:<authTag>:<ciphertext>` provides cryptographic authentication (preventing data tampering) and allows backward-compatible reads during data migration.

### D. Hybrid AI + Heuristic Fault-Tolerant Pipeline
* **The Decision:** Combine an advanced LLM (Gemini 2.0 Flash) with a local regex-based heuristic engine for Excel column matching.
* **Why:** 
  - Educational administrators upload spreadsheets with arbitrary column headers (e.g., *"विद्यार्थी का नाम"*, *"Name of Pupil"*, *"S/O"*, *"Mob No"*). A hard-coded parser fails on minor variations.
  - However, relying *exclusively* on an external AI API introduces vulnerability to network drops, API rate limits, or missing API keys.
  - The hybrid approach attempts the AI analysis first; if the API key is absent or the request fails, it immediately falls back to the local regex heuristic without blocking the user.

### E. Institutional "Maroon & Warm Beige" Visual Language
* **The Decision:** Discard standard generic tech themes (dark modes, neon purples, bright blues) in favor of a specialized institutional color palette:
  - Primary: Deep Maroon (`#6B1D30`)
  - Background: Warm Beige (`#F3EDE4`)
  - Cards & Workspaces: Crisp White (`#FFFFFF`) with Warm Borders (`#E8E0D4`)
  - Text: Dark Charcoal (`#2D2A26`)
* **Why:** Government administrative portals in India traditionally use earthy, sober tones that convey institutional authority and formal dignity. The high-contrast, light-only theme provides optimal readability on low-cost TN panel monitors commonly used in school offices.

---

## 4. Real-World Challenges Faced & How We Overcame Them

### Challenge 1: The "No Space for Class 2 Student" Bug
* **The Problem:** When school staff attempted to admit a new student into Class 2, the portal blocked the submission with an error stating there was no capacity or space for Class 2. Staff suspected that the system only permitted admissions into Class 1.
* **Root Cause Analysis:** 
  - The school database represents classes dynamically per academic session via `Class` and `Section` entities.
  - During the initial session creation or seed execution, records for Class 2 (or its respective Section "A") had not been created in the database for the active academic session.
  - When the student admission form queried the database for valid sections in Class 2, it returned null, causing the validation logic to misinterpret the missing database record as "zero available capacity."
* **How We Overcame It:**
  1. **Health Check Detection:** Updated `src/app/[locale]/admin/classes/page.tsx` to automatically cross-reference existing classes against the required primary and upper primary sequence (Classes 1 through 8).
  2. **Automated Server Action (`repair-session.ts`):** Created a self-healing server action that identifies missing classes and automatically generates the corresponding `Class` and default `Section` ("Section A", default capacity 40) within a single database transaction.
  3. **Visual Notification Banner (`repair-banner.tsx`):** Added a clear, actionable banner on the Classes dashboard displaying which classes are missing and providing a one-click "Repair Classes" button.

---

### Challenge 2: The Scrambled Excel Import Crisis (Positional Column Chaos)
* **The Problem:** School administration receives student data from multiple external government portals (Prerna, Sharda, U-DISE+) and local spreadsheets. When uploading these sheets, student data was severely scrambled: phone numbers appeared in the father's name field, student names overwrote admission numbers, and dates of birth were placed into gender fields.
* **Root Cause Analysis:**
  - The original import code relied on rigid positional indexing using `XLSX.utils.sheet_to_json(sheet, { header: 1 })`.
  - It hard-coded expectations that Column 0 was always Admission Number, Column 1 was Student Name, Column 2 was Father's Name, etc.
  - Whenever an external Excel sheet had columns in a different order, included extra columns, or used Hindi headings, the fixed indexes mapped values to the wrong database attributes.
* **How We Overcame It:**
  1. **Semantic AI Mapping Route (`/api/admin/students/map-columns`):** Implemented an API endpoint using **Google Gemini 2.0 Flash**. It takes the uploaded file's header list and 3 sample data rows, analyzes the semantic meaning (including Hindi text, abbreviations, and parent prefixes like "S/O"), and returns a normalized key-value mapping.
  2. **Built-in Regex Heuristics:** Designed a comprehensive fallback dictionary matching common Hindi and English educational terms (e.g., matching *"पंजीयन क्रमांक"* or *"Adm No"* to `admissionNo`, *"छात्र का नाम"* to `fullName`, *"मो.नं."* to `mobile`).
  3. **Interactive 4-Step Review UI (`import/page.tsx`):** Rebuilt the import page into a 4-step workflow:
     - *Step 1 (Upload):* Admin uploads any Excel or CSV file.
     - *Step 2 (Column Mapping):* Shows AI-suggested mappings in interactive dropdowns alongside sample cell values, allowing the admin to inspect, adjust, or confirm mappings.
     - *Step 3 (Preview & Validation):* Displays a clean, normalized tabular preview of all students, highlighting invalid dates or missing required fields.
     - *Step 4 (Execution):* Bulk-inserts students into PostgreSQL within a managed transaction.

---

### Challenge 3: Prisma 7 Architectural Breaking Changes
* **The Problem:** Upgrading to Prisma 7 introduced breaking changes that prevented the build from compiling using traditional Prisma 5/6 configurations.
* **Root Cause Analysis:**
  - Prisma 7 completely removed the bundled Rust query engine.
  - The `datasource db` block in `schema.prisma` no longer accepts a direct `url = env("DATABASE_URL")`.
  - Client generation no longer defaults into `node_modules/@prisma/client`.
* **How We Overcame It:**
  1. Configured `@prisma/adapter-neon` with `@neondatabase/serverless` inside `src/lib/prisma.ts`.
  2. Relocated database connection string handling to `prisma.config.ts`.
  3. Specified an explicit generator output directory: `output = "../src/generated/prisma"` in `schema.prisma`.
  4. Updated `package.json` scripts (`"build": "prisma generate && next build"`, `"postinstall": "prisma generate"`) to guarantee client availability in serverless build environments.

---

### Challenge 4: Next.js Middleware Security Vulnerability (CVE-2025-29927)
* **The Problem:** Relying solely on `middleware.ts` for route protection creates vulnerability to request header manipulation where internal subrequest headers can bypass middleware execution.
* **How We Overcame It:**
  - Restricted middleware (`src/proxy.ts`) to perform only high-level fast-path redirects for unauthenticated sessions.
  - Implemented mandatory, server-enforced role verification (`requireRole()`) inside the server component tree of every protected layout and server action. Even if middleware execution is skipped, the layout immediately halts unauthorized requests on the server.

---

### Challenge 5: Safeguarding Minors' Aadhaar & Banking Records
* **The Problem:** Composite schools collect sensitive student and parent Aadhaar numbers and bank details for government Direct Benefit Transfer (DBT) uniform and textbook subsidies. Storing these in plaintext represents a compliance violation and security hazard.
* **How We Overcame It:**
  - Created an enterprise cryptography module (`src/lib/encryption.ts`) utilizing **AES-256-GCM** with a 256-bit key and unique 96-bit initialization vectors (IV) per record.
  - Encrypted values include an authenticated tag ensuring data cannot be altered in transit or at rest.
  - Formatted stored ciphertext with a version tag (`enc:v1:<iv>:<tag>:<ciphertext>`), allowing the application to safely distinguish between encrypted data and existing plaintext legacy records.

---

### Challenge 6: Managing Complex Mid-Day Meal (MDM) Rules
* **The Problem:** Mid-Day Meal accounting requires strict tracking across two distinct student tiers (Primary vs. Upper Primary) with differing grain quotas, varying daily conversion rates, and weekly fruit distribution. Manual register calculation frequently resulted in inventory discrepancies.
* **How We Overcame It:**
  - Codified the statutory formulas into `src/app/[locale]/admin/mdm/page.tsx` and `src/app/actions/save-mdm.ts`:
    - Auto-categorizes Class 1–5 as Primary (100g grain / ₹6.78) and Class 6–8 as Junior (150g grain / ₹10.17).
    - Links meal logs directly to daily verified attendance, eliminating manual headcounts.
    - Implemented dedicated fruit consumption toggles for designated distribution days (₹4.00 per eating student).
    - Automated monthly ledger summaries ready for submission to the Block Education Officer (BEO).

---

## 5. Library & Module Selection Rationale

Every dependency in this codebase was selected to fulfill specific functional and non-functional requirements:

### 1. `@google/generative-ai` (Google Gemini SDK)
* **Role:** Powers the AI column mapping engine in `/api/admin/students/map-columns`.
* **Why this library:** Gemini 2.0 Flash offers near-instant response latencies (< 800ms), native JSON-mode generation (`responseMimeType: "application/json"`), and superior multilingual understanding of Hindi script and regional educational abbreviations.

### 2. `@prisma/client`, `@prisma/adapter-neon` & `@neondatabase/serverless`
* **Role:** Database ORM and serverless connection management.
* **Why this library:** Traditional Node.js Postgres drivers maintain stateful TCP pools that exhaust connections in serverless environments. Neon's serverless adapter operates over WebSockets and HTTP pipelines, scaling down to zero idle connections when school hours end.

### 3. `next-auth` (Auth.js v4)
* **Role:** Session management, credentials authentication, and JWT signing.
* **Why this library:** Provides battle-tested credential provider handling, CSRF mitigation, HTTP-only secure cookie management, and lightweight JWT sessions without requiring a database query on every page load.

### 4. `bcryptjs`
* **Role:** One-way password hashing for staff accounts.
* **Why this library:** Pure JavaScript implementation of the Blowfish-based Bcrypt algorithm. It runs reliably across all serverless and Node runtimes without native compilation dependencies (unlike `bcrypt` C++ bindings).

### 5. `next-intl`
* **Role:** Bilingual localization (Hindi and English).
* **Why this library:** Deeply integrated with the Next.js App Router, enabling server-side message rendering, zero client-bundle bloat for translations, and clean URL localization (`/hi/admin/...` vs `/en/admin/...`).

### 6. `xlsx` (SheetJS)
* **Role:** In-memory spreadsheet parsing.
* **Why this library:** The industry standard for reading legacy binary `.xls`, modern `.xlsx`, and `.csv` files directly in Node.js buffers without requiring external software (such as LibreOffice or Excel).

### 7. `@react-pdf/renderer`
* **Role:** Programmatic PDF generation for Transfer Certificates.
* **Why this library:** Enables writing standard React components that render directly to vector PDF documents on the server. Guarantees consistent typography, margins, and layout regardless of the client machine's browser or operating system.

### 8. `resend`
* **Role:** Transactional email gateway for password recovery.
* **Why this library:** Modern developer-friendly email API with high deliverability, native TypeScript SDK, and simple configuration.

### 9. `lucide-react`
* **Role:** Iconography across navigation, dashboards, and tables.
* **Why this library:** Comprehensive, visually balanced icon library that supports tree-shaking, resulting in minimal bundle overhead.

### 10. `zod`
* **Role:** Schema validation for user inputs and server actions.
* **Why this library:** Composable, TypeScript-first validation that infers static types directly from runtime schemas, ensuring zero mismatch between validation logic and type definitions.

---

## 6. Architectural Decision Records (ADR Log)

Below is the chronological log of all critical architectural decisions made during the project's development:

```
+---------+-------------------------------------------------------------+-----------+
| ADR ID  | Decision Title                                              | Status    |
+---------+-------------------------------------------------------------+-----------+
| ADR-001 | Adoption of Next.js App Router & Server Actions             | Completed |
| ADR-002 | Migration to Prisma 7 with Neon Serverless Driver Adapter   | Completed |
| ADR-003 | Dual-Layer RBAC Architecture (Proxy + Layouts)              | Completed |
| ADR-004 | Phone Number + Password Credential Authentication           | Completed |
| ADR-005 | AES-256-GCM Field-Level PII Encryption for Aadhaar & Banks  | Completed |
| ADR-006 | DB-Backed Account Lockout & In-Memory IP Rate Limiting      | Completed |
| ADR-007 | Hindi as Primary Default Locale (`hi`) via `next-intl`      | Completed |
| ADR-008 | Institutional Maroon & Warm Beige Design System             | Completed |
| ADR-009 | Exclusion of Student/Parent Direct Logins                   | Completed |
| ADR-010 | Statutory Two-Tier Mid-Day Meal Accounting Engine           | Completed |
| ADR-011 | Proactive Class Health Check & One-Click Session Repair     | Completed |
| ADR-012 | Resilient Gemini AI + Regex Heuristic Excel Import Pipeline | Completed |
+---------+-------------------------------------------------------------+-----------+
```

### Detailed Decision Records:

#### ADR-001: Adoption of Next.js App Router & Server Actions
* **Context:** Needed a scalable architecture that operates smoothly on low-bandwidth school computers.
* **Decision:** Used Next.js App Router with React Server Components as the default, handling form mutations through Server Actions.
* **Consequences:** Near-zero client-side bundle for static displays; secure server-side execution; simpler data revalidation via `revalidatePath()`.

#### ADR-002: Prisma 7 with Neon Driver Adapter
* **Context:** Database required reliable pooling on serverless cloud infrastructure.
* **Decision:** Standardized on Prisma 7 using `@prisma/adapter-neon` over WebSockets, outputting generated client code to `src/generated/prisma`.
* **Consequences:** Eliminates connection pool exhaustion; requires explicit client generation script in build pipeline.

#### ADR-003: Dual-Layer Defense-in-Depth RBAC
* **Context:** Guarding against Next.js middleware bypass vulnerabilities (CVE-2025-29927).
* **Decision:** Implemented proxy redirects in `src/proxy.ts` and mandatory server-side `requireRole()` checks in all layout components.
* **Consequences:** Redundant security layer ensures role enforcement is never compromised by header spoofing.

#### ADR-004: Phone Number + Password Authentication
* **Context:** School teachers and headmasters in rural areas frequently do not use corporate email addresses.
* **Decision:** Configured NextAuth credentials provider using primary 10-digit mobile number as the unique login identifier.
* **Consequences:** Streamlined login UX; accounts must maintain unique phone numbers.

#### ADR-005: AES-256-GCM Field-Level PII Encryption
* **Context:** Minors' Aadhaar numbers and bank accounts require strict data protection.
* **Decision:** Implemented application-level encryption using Node.js `crypto` with `enc:v1:` prefixing before database persistence.
* **Consequences:** Data is protected even if database backups or credentials leak; requires decryption step in UI forms and PDF exports.

#### ADR-006: DB-Backed Account Lockout & In-Memory IP Rate Limiting
* **Context:** Mitigate brute-force attacks on the staff login portal.
* **Decision:** Implemented failed-attempt counters in the database (5 failed attempts locks account for 15 minutes), complemented by an in-memory IP rate limiter.
* **Consequences:** Lockout persists across serverless instances and server restarts.

#### ADR-007: Hindi as Primary Default Locale (`hi`)
* **Context:** Primary stakeholders (Headmaster, teachers, administrative staff) conduct day-to-day administrative work in Hindi.
* **Decision:** Set default locale to `hi` with an optional `en` switcher using `next-intl`.
* **Consequences:** All form labels, navigation menus, and alerts display in clear Hindi terminology with English subtitles.

#### ADR-008: Institutional Maroon & Warm Beige Design System
* **Context:** Standard dark or neon themes look informal and unsuited for an official state institution.
* **Decision:** Crafted a custom theme using deep maroon (`#6B1D30`), warm beige (`#F3EDE4`), and crisp white card containers.
* **Consequences:** Professional, institutional visual identity with high contrast and readability on all display types.

#### ADR-009: Exclusion of Student/Parent Direct Logins
* **Context:** Initial requirements discussed student and parent portals.
* **Decision:** Restricted portal authentication strictly to ADMIN and TEACHER roles. Students and parents exist purely as administrative data records.
* **Consequences:** Avoided distributing and managing credentials for hundreds of young students; reduced security surface and operational overhead.

#### ADR-010: Statutory Two-Tier Mid-Day Meal Accounting Engine
* **Context:** Manual calculations for MDM registers lead to calculation errors and government compliance audits.
* **Decision:** Encoded official UP state nutritional formulas (Primary 100g / ₹6.78 vs. Junior 150g / ₹10.17) and Friday fruit tracking directly into daily logs.
* **Consequences:** Daily grain consumption and conversion expenditures calculate automatically based on marked attendance.

#### ADR-011: Proactive Class Health Check & One-Click Session Repair
* **Context:** Client experienced the "No space for Class 2 student" error due to missing class/section records in the active academic session.
* **Decision:** Created an automated health check on the Classes page that compares database records against Classes 1–8 and provides a single-click transaction to auto-generate missing classes and sections.
* **Consequences:** Permanently resolved the Class 2 admission roadblock and prevents similar issues in future academic sessions.

#### ADR-012: Resilient Gemini AI + Regex Heuristic Excel Import Pipeline
* **Context:** School received student data files with unordered columns and mixed Hindi/English headings that scrambled imports.
* **Decision:** Integrated Google Gemini 2.0 Flash for automated semantic column mapping, backed by an offline regex heuristic fallback and an interactive 4-step confirmation wizard.
* **Consequences:** Staff can upload arbitrary Excel/CSV files without pre-formatting, with zero risk of data misalignment.

---

## 7. System Workflows & Visual Diagrams

### A. Authentication & Dual-Layer Access Control Flow

```
                      User Request (e.g. /hi/admin/students)
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │     Layer 1: src/proxy.ts     │
                     │    (NextAuth + next-intl)     │
                     └───────────────┬───────────────┘
                                     │
                        Session active & valid?
                                    ╱ ╲
                             No    ╱   ╲   Yes
                            ┌─────        ─────┐
                            ▼                  ▼
                    Redirect to /login    Pass to Next.js Router
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │      Layer 2: Server Layout      │
                              │  requireRole(["ADMIN"|"TEACHER"]) │
                              └────────────────┬─────────────────┘
                                               │
                                   Has correct role claim?
                                              ╱ ╲
                                       No    ╱   ╲   Yes
                                      ┌─────        ─────┐
                                      ▼                  ▼
                             Redirect /unauthorized   Render Secure Page
```

---

### B. Smart Student Import Pipeline (AI + Heuristic Fallback)

```
        Uploaded Excel / CSV File (Any structure / Hindi / English)
                                     │
                                     ▼
                 Extract Headers & 3 Sample Rows (SheetJS)
                                     │
                                     ▼
                          Is GEMINI_API_KEY set?
                                    ╱ ╲
                             Yes   ╱   ╲   No
                            ┌─────        ─────┐
                            ▼                  ▼
               Call Gemini 2.0 Flash    Execute Local Regex
               Semantic Mapping API      Heuristic Engine
                            │                  │
                      Success?                 │
                        ╱ ╲                    │
                 Yes   ╱   ╲   No              │
                ┌─────        ─────┐           │
                ▼                  ▼           ▼
        Normalized JSON    Fall back to Heuristic
                │                  │
                └──────────┬───────┘
                           │
                           ▼
            Step 2: Interactive Mapping UI
            (Admin confirms / adjusts dropdowns)
                           │
                           ▼
            Step 3: Normalized Data Preview
            (Validates DOB, gender, mobile, class)
                           │
                           ▼
            Step 4: Database Bulk Transaction
            (Prisma transaction commits students)
```

---

### C. Class Health Check & One-Click Repair Flow

```
                     Admin visits /admin/classes
                                  │
                                  ▼
               Query active AcademicSession in PostgreSQL
                                  │
                                  ▼
             Check for existence of Classes 1 through 8
                                  │
                                 ╱ ╲
                       All 8    ╱   ╲   Missing >= 1
                      present? ╱     ╲     class?
                             ┌─       ─┐
                             ▼         ▼
                      Render Normal   Render Amber Alert Banner
                       Class List     with list of missing classes
                                           │
                                           ▼
                                Admin clicks "Repair Classes"
                                           │
                                           ▼
                              Execute repair-session.ts
                              (Prisma transaction inserts
                              missing Class + Section 'A' records)
                                           │
                                           ▼
                                 Page auto-revalidates
                              (All classes active & healthy)
```

---

## 8. Summary & Maintenance Guide

### For Future Developers & Maintainers:

1. **Environment Variables Required:**
   - `DATABASE_URL`: Connection string for Neon Serverless PostgreSQL.
   - `NEXTAUTH_SECRET`: 32-byte secret for JWT signing (`openssl rand -base64 32`).
   - `ENCRYPTION_KEY`: 64-character hex string for AES-256-GCM (`openssl rand -hex 32`).
   - `GEMINI_API_KEY`: Google AI Studio key for intelligent column mapping.
   - `RESEND_API_KEY`: API key from Resend for transactional email delivery.

2. **Running Database Operations:**
   ```bash
   # Generate Prisma Client (outputs to src/generated/prisma)
   npx prisma generate

   # Push schema modifications to database
   npx prisma db push

   # Seed default administrative credentials
   npx prisma db seed
   ```

3. **Deploying Updates:**
   - Never remove the `requireRole()` checks in route layouts.
   - Always run `npm run build` locally prior to production push to verify TypeScript types and Prisma client synchronization.
   - Ensure `GEMINI_API_KEY` is populated in production environment variables so administrative staff benefit from automated column recognition on government spreadsheets.

---
*Document officially generated and archived for Composite Vidyalaya Chandpur Tarhar ERP Portal.*
