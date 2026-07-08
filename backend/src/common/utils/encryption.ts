import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENC_PREFIX = 'enc:';

/**
 * Derives a 32-byte key from the ENCRYPTION_KEY env variable using SHA-256.
 * Returns null if ENCRYPTION_KEY is not configured.
 */
function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Format: "enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * If ENCRYPTION_KEY is not set, the value is returned unmodified (plaintext).
 */
export function encryptField(value: string): string {
  const key = getKey();
  if (!key) return value; // No key → store plaintext

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a value produced by encryptField.
 * Values not starting with "enc:" are returned as-is (backward compatibility
 * with pre-existing plaintext rows).
 */
export function decryptField(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) return value; // Plaintext — pass through

  const key = getKey();
  if (!key) return value; // No key — cannot decrypt, return as-is

  const parts = value.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) return value; // Malformed — pass through

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return value; // Decryption failed — return ciphertext rather than throwing
  }
}
