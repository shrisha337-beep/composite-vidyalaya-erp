"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { requestPasswordReset } from "@/app/actions/reset-password";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader } from "lucide-react";

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const baseUrl = window.location.origin;
    const res = await requestPasswordReset(email, locale, baseUrl);
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="mb-6">
            <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Forgot Password?</h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter your registered email address and we will send you a reset link.
            </p>
          </div>

          {result && (
            <div
              className={`flex items-start gap-2.5 px-4 py-3 rounded-md text-sm mb-5 ${
                result.success
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          {!result?.success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.edu.in"
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link
              href={`/${locale}/login`}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
