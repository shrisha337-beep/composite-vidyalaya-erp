/**
 * AES-256-GCM field-level encryption for sensitive data.
 *
 * Used for: Aadhaar numbers (student, guardian, bank holder) and
 * bank account numbers before they are written to the database.
 *
 * Format stored in DB:  enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 * The prefix lets us detect at read-time whether a value is encrypted or
 * plaintext (important during migration / data import).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY is missing or wrong length. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string.
 * Returns a prefixed string safe to store in a VARCHAR/TEXT column.
 * Returns null if input is null/empty.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;

  // Already encrypted (e.g. re-saving without editing) — don't double-encrypt
  if (plaintext.startsWith(PREFIX)) return plaintext;

  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a value stored by encrypt().
 * If the value is plaintext (not prefixed), returns it as-is — allows
 * gradual migration of existing unencrypted data.
 * Returns null if input is null/empty.
 */
export function decrypt(stored: string | null | undefined): string | null {
  if (!stored) return null;

  // Not encrypted — return as-is
  if (!stored.startsWith(PREFIX)) return stored;

  const key = getKey();
  const rest = stored.slice(PREFIX.length);
  const [ivHex, authTagHex, ciphertextHex] = rest.split(":");

  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Encrypted value has invalid format.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return (
    decipher.update(ciphertext).toString("utf8") + decipher.final("utf8")
  );
}

/**
 * Convenience: encrypts only if value is non-null.
 * Useful for optional fields like guardian Aadhaar.
 */
export function encryptOptional(
  value: string | null | undefined
): string | null {
  return value ? encrypt(value) : null;
}
