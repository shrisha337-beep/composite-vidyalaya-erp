import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { createTeacher } from "@/app/actions/create-teacher";

export default async function AddTeacherPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;
  const sparams = await searchParams;
  const error = sparams.error;

  // Fetch current session class levels
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      classes: {
        select: { name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  const classes = currentSession?.classes.map((c) => c.name) ?? ["1", "2", "3", "4", "5", "6", "7", "8"];

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/admin/teachers`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            नए शिक्षक का पंजीकरण करें
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Register New Teacher</p>
        </div>
      </div>

      <form action={createTeacher} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── SECTION 1: PERSONAL & WORK DETAILS ────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                Personal & Profile Details / व्यक्तिगत विवरण
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Full Name / पूरा नाम <span className="text-red-500">*</span>
              </label>
              <input
                name="fullName"
                required
                placeholder="e.g. Rajesh Kumar"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Employee Code / कर्मचारी कोड <span className="text-red-500">*</span>
              </label>
              <input
                name="employeeCode"
                required
                placeholder="e.g. EH12345"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mobile Number (Username) / मोबाइल नंबर <span className="text-red-500">*</span>
              </label>
              <input
                name="phone"
                required
                type="tel"
                placeholder="10 digits"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Designation / पदनाम
              </label>
              <select
                name="designation"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              >
                <option value="">Select Designation</option>
                <option value="Assistant Teacher">Assistant Teacher / सहायक अध्यापक</option>
                <option value="Shikshamitra">Shikshamitra / शिक्षामित्र</option>
                <option value="TGT">TGT / प्रशिक्षित स्नातक</option>
                <option value="PGT">PGT / प्रवक्ता</option>
                <option value="Headmaster">Headmaster / प्रधानाध्यापक</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Qualifications / शैक्षिक योग्यता
              </label>
              <input
                name="qualification"
                placeholder="e.g. B.Ed, M.A."
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date of Joining / नियुक्ति तिथि
              </label>
              <input
                name="dateOfJoining"
                type="date"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Class Teacher Assignment / कक्षा अध्यापक कार्यभार
              </label>
              <select
                name="classAssignment"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
              >
                <option value="">None / कोई नहीं</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Passport Size Photo / पासपोर्ट फोटो
              </label>
              <input
                type="file"
                name="teacherPhoto"
                accept="image/*"
                className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 2: ACCESS LOGINS ──────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-3 mb-2">
            Portal Portal Credentials / लॉगिन विवरण
          </h2>

          <div className="max-w-sm">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Temporary Password / अस्थायी पासवर्ड <span className="text-red-500">*</span>
            </label>
            <input
              name="tempPassword"
              type="password"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
            />
          </div>
        </div>

        {/* ── SUBMIT BUTTONS ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pb-8">
          <button
            type="submit"
            className="px-6 py-2.5 rounded text-sm font-medium text-white transition-colors"
            style={{ background: "hsl(var(--primary))" }}
          >
            Register Teacher
          </button>
          <Link
            href={`/${locale}/admin/teachers`}
            className="px-4 py-2.5 border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
