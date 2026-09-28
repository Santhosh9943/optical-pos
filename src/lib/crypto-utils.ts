import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

const DEV_FALLBACK_ENCRYPTION_SECRET = 'optixos-master-encryption-key-32b!';
let warnedAboutDevFallback = false;

/**
 * @description Derives the 32-byte AES-256-GCM master key from ENCRYPTION_KEY (or BETTER_AUTH_SECRET).
 * In production a missing secret is a fatal misconfiguration and throws; the hardcoded fallback is
 * only used in development/test (with a console warning).
 * @returns 32-byte key buffer
 */
function getMasterKey(): Buffer {
  const configured = process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;
  let secret: string;
  if (configured) {
    secret = configured;
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[crypto-utils] ENCRYPTION_KEY (or BETTER_AUTH_SECRET) must be set in production; refusing to use the insecure fallback key.'
    );
  } else {
    if (!warnedAboutDevFallback) {
      console.warn(
        '[crypto-utils] ENCRYPTION_KEY / BETTER_AUTH_SECRET not set - using insecure development fallback key. Do NOT use in production.'
      );
      warnedAboutDevFallback = true;
    }
    secret = DEV_FALLBACK_ENCRYPTION_SECRET;
  }
  // Derive 32-byte key via SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a sensitive string (e.g. SMTP password) using AES-256-GCM.
 * Output format: enc:base64url(iv + authTag + ciphertext)
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combined payload: iv (12) + authTag (16) + encrypted
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return `enc:${combined.toString('base64url')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Returns the original plaintext or empty string on failure.
 */
export function decryptSecret(cipherPayload: string): string {
  if (!cipherPayload || !cipherPayload.startsWith('enc:')) {
    // If not encrypted with our prefix, return as-is (graceful migration)
    return cipherPayload || '';
  }

  try {
    const raw = Buffer.from(cipherPayload.slice(4), 'base64url');
    if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) return '';

    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const key = getMasterKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[decryptSecret] Decryption failure:', err);
    return '';
  }
}

/**
 * Generates an unguessable cryptographic token for public receipts.
 */
export function generateReceiptToken(invoiceId: string, createdAt: string | Date): string {
  const dateStr = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
  const key = getMasterKey();
  return crypto
    .createHmac('sha256', key)
    .update(`${invoiceId}:${dateStr}`)
    .digest('base64url');
}

/**
 * Verifies the cryptographic token for a public receipt using timing-safe comparison.
 */
export function verifyReceiptToken(
  invoiceId: string,
  createdAt: string | Date,
  providedToken: string
): boolean {
  if (!providedToken) return false;
  try {
    const expected = generateReceiptToken(invoiceId, createdAt);
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(providedToken);
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}
