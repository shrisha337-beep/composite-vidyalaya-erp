"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeOwnPasswordAction } from "@/app/actions/change-password";

const ERROR_MESSAGES: Record<string, string> = {
  FIELDS_REQUIRED: "All password fields are required.",
  PASSWORDS_DO_NOT_MATCH: "New password and confirmation do not match.",
  INVALID_CURRENT_PASSWORD: "Your current password is incorrect.",
  PASSWORD_TOO_SHORT: "New password must be at least 8 characters long.",
  PASSWORD_TOO_LONG: "New password is too long.",
  PASSWORD_WEAK_DEFAULT: "Please choose a unique password.",
  PASSWORD_SAME_AS_CURRENT:
    "New password must be different from your current password.",
  PASSWORD_MATCHES_IDENTIFIER:
    "New password cannot be your admission number or mobile number.",
  DEMO_MODE_DISABLED: "Password changes are disabled in the demo environment.",
  UNAUTHENTICATED: "Your session expired. Please sign in again.",
};

export function ChangePasswordForm() {
  const router = useRouter();
  const { update } = useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await changeOwnPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!result.ok) {
        setError(
          (result.error && ERROR_MESSAGES[result.error]) ||
            "Could not update password. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      // Refresh the NextAuth JWT cookie (`trigger === "update"` re-reads
      // `mustChangePassword: false` from the DB) before navigating to "/"
      // so the middleware and server layout do not redirect back here.
      await update({ mustChangePassword: false });
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current / Initial Password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New Password (minimum 8 characters)</Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            disabled={isSubmitting}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showNew ? "Hide password" : "Show password"}
          >
            {showNew ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showNew ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating password…
          </>
        ) : (
          "Save New Password"
        )}
      </Button>
    </form>
  );
}

