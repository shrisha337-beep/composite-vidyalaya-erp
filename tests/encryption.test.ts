import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt, encryptOptional } from "@/lib/encryption";

describe("AES-256-GCM Field-Level Encryption", () => {
  const VALID_KEY_1 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const VALID_KEY_2 = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
  const originalEnvKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY_1;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnvKey;
  });

  it("throws error when ENCRYPTION_KEY is missing or invalid length", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("123456789012")).toThrow("ENCRYPTION_KEY is missing or wrong length");

    process.env.ENCRYPTION_KEY = "tooshort";
    expect(() => encrypt("123456789012")).toThrow("ENCRYPTION_KEY is missing or wrong length");
  });

  it("encrypts and decrypts round-trip successfully", () => {
    const sensitiveData = "543210987654"; // Aadhaar number
    const encrypted = encrypt(sensitiveData);

    expect(encrypted).not.toBeNull();
    expect(encrypted).not.toBe(sensitiveData);
    expect(encrypted).toMatch(/^enc:v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(sensitiveData);
  });

  it("generates a unique IV and different ciphertext for identical plaintext on each call", () => {
    const plaintext = "987654321098";
    const enc1 = encrypt(plaintext)!;
    const enc2 = encrypt(plaintext)!;

    expect(enc1).not.toBe(enc2);

    const parts1 = enc1.split(":");
    const parts2 = enc2.split(":");

    // IV is parts[2]
    expect(parts1[2]).not.toBe(parts2[2]);
    // Ciphertext is parts[4]
    expect(parts1[4]).not.toBe(parts2[4]);

    expect(decrypt(enc1)).toBe(plaintext);
    expect(decrypt(enc2)).toBe(plaintext);
  });

  it("does not double-encrypt an already encrypted value", () => {
    const plaintext = "112233445566";
    const encrypted = encrypt(plaintext);
    const reEncrypted = encrypt(encrypted);

    expect(reEncrypted).toBe(encrypted);
  });

  it("returns null or empty inputs as null without throwing", () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt(undefined)).toBeNull();
    expect(encrypt("")).toBeNull();

    expect(decrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeNull();
    expect(decrypt("")).toBeNull();

    expect(encryptOptional(null)).toBeNull();
    expect(encryptOptional(undefined)).toBeNull();
  });

  it("returns unencrypted plaintext as-is (for backwards compatibility / gradual migration)", () => {
    const rawAadhaar = "123412341234";
    expect(decrypt(rawAadhaar)).toBe(rawAadhaar);
  });

  it("throws tamper detection error if ciphertext is modified", () => {
    const encrypted = encrypt("SecretBankAcc999")!;
    const parts = encrypted.split(":");
    // parts = ['enc', 'v1', ivHex, authTagHex, ciphertextHex]

    // Mutate the last hex character of the ciphertext
    const lastChar = parts[4].slice(-1);
    const replacement = lastChar === "a" ? "b" : "a";
    const tamperedCiphertext = parts[4].slice(0, -1) + replacement;

    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:${tamperedCiphertext}`;

    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws tamper detection error if auth tag is modified", () => {
    const encrypted = encrypt("SecretBankAcc999")!;
    const parts = encrypted.split(":");

    // Mutate the auth tag
    const tamperedTag = (parts[3].startsWith("a") ? "b" : "a") + parts[3].slice(1);
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedTag}:${parts[4]}`;

    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws when decrypting with a different/wrong key", () => {
    const encrypted = encrypt("ConfidentialStudentInfo")!;

    // Switch to a different valid 256-bit key
    process.env.ENCRYPTION_KEY = VALID_KEY_2;

    expect(() => decrypt(encrypted)).toThrow();
  });

  it("throws error when encrypted string has malformed structure", () => {
    expect(() => decrypt("enc:v1:onlyonepart")).toThrow("Encrypted value has invalid format.");
  });
});
