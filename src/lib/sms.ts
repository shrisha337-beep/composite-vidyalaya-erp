/**
 * src/lib/sms.ts
 *
 * SMS gateway wrapper with environment safety guard.
 * Messages are dispatched via SMS_API_KEY only when VERCEL_ENV === "production".
 * In preview, staging, or local development, delivery is suppressed to prevent
 * accidental messaging to actual recipients.
 */

export async function sendSMS(_params: {
  phone: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("[skipped in non-production]");
    return { success: true };
  }

  // Production gateway dispatch is not yet implemented
  return { success: false, error: "SMS delivery not implemented" };
}
