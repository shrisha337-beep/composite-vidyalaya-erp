"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { consumePasswordResetToken } from "@/app/actions/reset-password";
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader, XCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const locale = (params?.locale as string) ?? "en";
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Redirect to login after success
  useEffect(() => {
    if (result?.success) {
      const timer = setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result, locale, router]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <XCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-sm text-gray-500 mb-5">
            This password reset link is missing or malformed.
          </p>
          <Link
            href={`/${locale}/forgot-password`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await consumePasswordResetToken(token, newPassword, confirmPassword);
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="mb-6">
            <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <KeyRound className="h-5 w-5 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Set New Password</h1>
            <p className="text-sm text-gray-500 mt-1">
              Choose a strong password. You will be redirected to login after saving.
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
              <span>
                {result.message}
                {result.success && (
                  <span className="block text-xs mt-0.5 opacity-80">
                    Redirecting to login in 3 seconds…
                  </span>
                )}
              </span>
            </div>
          )}

          {!result?.success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                Save New Password
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link
              href={`/${locale}/login`}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
