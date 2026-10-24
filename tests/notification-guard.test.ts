import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSend = vi.fn();

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: mockSend,
      };
    },
  };
});

describe("Notification Safety Guard (SMS & Email)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Email Guard (sendPasswordResetEmail via Resend)", () => {
    it("skips sending and logs [skipped in non-production] in preview environment", async () => {
      process.env.VERCEL_ENV = "preview";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendPasswordResetEmail } = await import("@/lib/mailer");
      const result = await sendPasswordResetEmail({
        toEmail: "teacher@school.edu.in",
        resetLink: "https://preview.school.app/reset?token=abc",
        recipientName: "Teacher Name",
      });

      expect(result).toEqual({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("[skipped in non-production]");

      consoleSpy.mockRestore();
    });

    it("skips sending and logs [skipped in non-production] in development environment", async () => {
      process.env.VERCEL_ENV = "development";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendPasswordResetEmail } = await import("@/lib/mailer");
      const result = await sendPasswordResetEmail({
        toEmail: "admin@school.edu.in",
        resetLink: "http://localhost:3000/reset?token=xyz",
        recipientName: "Admin User",
      });

      expect(result).toEqual({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("[skipped in non-production]");

      consoleSpy.mockRestore();
    });

    it("skips sending when VERCEL_ENV is undefined", async () => {
      delete process.env.VERCEL_ENV;
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendPasswordResetEmail } = await import("@/lib/mailer");
      const result = await sendPasswordResetEmail({
        toEmail: "staff@school.edu.in",
        resetLink: "http://localhost:3000/reset?token=test",
        recipientName: "Staff Member",
      });

      expect(result).toEqual({ success: true });
      expect(mockSend).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("[skipped in non-production]");

      consoleSpy.mockRestore();
    });

    it("sends email via Resend when VERCEL_ENV === 'production'", async () => {
      process.env.VERCEL_ENV = "production";
      process.env.RESEND_API_KEY = "re_test_key_123";
      mockSend.mockResolvedValueOnce({ id: "msg_123" });

      const { sendPasswordResetEmail } = await import("@/lib/mailer");
      const result = await sendPasswordResetEmail({
        toEmail: "verified@school.edu.in",
        resetLink: "https://school.edu.in/reset?token=prod",
        recipientName: "Verified User",
      });

      expect(result).toEqual({ success: true });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "verified@school.edu.in",
          subject: expect.stringContaining("Password Reset Request"),
        })
      );
    });

    it("catches and returns Resend failure when in production", async () => {
      process.env.VERCEL_ENV = "production";
      process.env.RESEND_API_KEY = "re_test_key_123";
      mockSend.mockRejectedValueOnce(new Error("Resend rate limit exceeded"));

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { sendPasswordResetEmail } = await import("@/lib/mailer");
      const result = await sendPasswordResetEmail({
        toEmail: "fail@school.edu.in",
        resetLink: "https://school.edu.in/reset?token=fail",
        recipientName: "Fail User",
      });

      expect(result).toEqual({
        success: false,
        error: "Resend rate limit exceeded",
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("SMS Guard (sendSMS via SMS_API_KEY)", () => {
    it("skips dispatch and logs [skipped in non-production] in preview environment", async () => {
      process.env.VERCEL_ENV = "preview";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendSMS } = await import("@/lib/sms");
      const result = await sendSMS({
        phone: "9876543210",
        message: "Your OTP is 123456",
      });

      expect(result).toEqual({ success: true });
      expect(consoleSpy).toHaveBeenCalledWith("[skipped in non-production]");

      consoleSpy.mockRestore();
    });

    it("skips dispatch and logs [skipped in non-production] in development environment", async () => {
      process.env.VERCEL_ENV = "development";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendSMS } = await import("@/lib/sms");
      const result = await sendSMS({
        phone: "9876543210",
        message: "Your OTP is 654321",
      });

      expect(result).toEqual({ success: true });
      expect(consoleSpy).toHaveBeenCalledWith("[skipped in non-production]");

      consoleSpy.mockRestore();
    });

    it("attempts dispatch only when VERCEL_ENV === 'production'", async () => {
      process.env.VERCEL_ENV = "production";
      process.env.SMS_API_KEY = "sms_live_key";

      const { sendSMS } = await import("@/lib/sms");
      const result = await sendSMS({
        phone: "9876543210",
        message: "Notice: School closed tomorrow",
      });

      expect(result).toEqual({ success: true });
    });

    it("returns error in production if SMS_API_KEY is missing", async () => {
      process.env.VERCEL_ENV = "production";
      delete process.env.SMS_API_KEY;

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { sendSMS } = await import("@/lib/sms");
      const result = await sendSMS({
        phone: "9876543210",
        message: "Test message",
      });

      expect(result).toEqual({
        success: false,
        error: "SMS_API_KEY is not configured",
      });

      consoleWarnSpy.mockRestore();
    });
  });
});
