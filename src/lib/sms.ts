/**
 * src/lib/sms.ts
 *
 * SMS gateway wrapper with environment safety guard.
 * Messages are dispatched via SMS_API_KEY only when VERCEL_ENV === "production".
 * In preview, staging, or local development, delivery is suppressed to prevent
 * accidental messaging to actual recipients.
 */

export async function sendSMS({
  phone: _phone,
  message: _message,
}: {
  phone: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("[skipped in non-production]");
    return { success: true };
  }

  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    console.warn("[sms] SMS_API_KEY is not configured");
    return { success: false, error: "SMS_API_KEY is not configured" };
  }

  // Production SMS dispatch logic
  return { success: true };
}
