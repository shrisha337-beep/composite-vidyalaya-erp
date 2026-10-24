/**
 * src/lib/mailer.ts
 *
 * Thin wrapper around Resend for transactional emails.
 *
 * Required environment variable:
 *   RESEND_API_KEY   – get a free API key at https://resend.com
 *
 * IMPORTANT: Resend's free plan sends from `onboarding@resend.dev` during
 * development / testing. Once the school has its own domain (e.g. cvct.edu.in),
 * verify it on the Resend dashboard and update the FROM_EMAIL constant below.
 */

import { Resend } from "resend";

// Update this once the school domain is verified on Resend
const FROM_EMAIL = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
const SCHOOL_NAME = "Composite School Chandpur Tarhar";

export async function sendPasswordResetEmail({
  toEmail,
  resetLink,
  recipientName,
}: {
  toEmail: string;
  resetLink: string;
  recipientName: string;
}): Promise<{ success: boolean; error?: string }> {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("[skipped in non-production]", resetLink);
    return { success: true };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `Password Reset Request — ${SCHOOL_NAME} ERP`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #1e40af; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px;">${SCHOOL_NAME}</h1>
            <p style="margin: 4px 0 0; color: #bfdbfe; font-size: 13px;">ERP Portal — Password Reset</p>
          </div>

          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 16px; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>

            <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.6;">
              We received a request to reset the password for your ERP portal account.
              Click the button below to choose a new password. This link is valid for
              <strong>1 hour</strong> and can only be used once.
            </p>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetLink}"
                 style="display: inline-block; padding: 12px 32px; background: #1e40af;
                        color: #ffffff; text-decoration: none; border-radius: 6px;
                        font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                Reset My Password
              </a>
            </div>

            <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; line-height: 1.6;">
              If you did not request this, you can safely ignore this email.
              Your password will not change unless you click the link above.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

            <p style="margin: 0; font-size: 11px; color: #9ca3af;">
              This is an automated email from the ${SCHOOL_NAME} ERP Portal.
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (err) {
    console.error("[mailer] Failed to send password reset email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}
