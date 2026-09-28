export const SUPER_ADMIN_SESSION_COOKIE = 'optixos_super_admin_session';
export const SUPER_ADMIN_SECRET =
  process.env.BETTER_AUTH_SECRET || 'optixos-super-admin-cryptographic-salt-2026';

/**
 * Validates whether an email is registered in the Platform Super Admin allowlist.
 */
export function isEmailInSuperAdminAllowlist(email: string): boolean {
  const superAdminEnv =
    process.env.SUPER_ADMIN_EMAILS || 'msanthosh9943@gmail.com,varundinesh10@gmail.com';
  const superAdminEmails = superAdminEnv
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return superAdminEmails.includes(email.trim().toLowerCase());
}

/**
 * Helper to compute an HMAC-SHA256 signature using the standard Web Crypto API.
 * 100% compatible with Edge Runtime and Node.js.
 */
async function computeHmacSha256(data: string, secret: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return new Uint8Array(signature);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(str: string): string {
  const enc = new TextEncoder();
  return bytesToBase64Url(enc.encode(str));
}

function base64UrlDecodeToString(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Computes HMAC-SHA256 hash of an OTP code for secure at-rest storage.
 */
export async function hashOtp(otp: string): Promise<string> {
  const sig = await computeHmacSha256(otp, SUPER_ADMIN_SECRET);
  return bytesToHex(sig);
}

/**
 * Returns the Super Admin session duration in seconds configured via env (default: 28,800s / 8h).
 */
export function getSuperAdminSessionExpirySeconds(): number {
  const envVal = process.env.SUPER_ADMIN_SESSION_EXPIRY_SECONDS;
  const parsed = envVal ? parseInt(envVal, 10) : 28800;
  return !isNaN(parsed) && parsed > 0 ? parsed : 28800;
}

/**
 * Generates and signs a tamper-proof session token for the Super Admin portal.
 */
export async function createSessionToken(email: string): Promise<string> {
  const expirySeconds = getSuperAdminSessionExpirySeconds();
  const payload = {
    email: email.trim().toLowerCase(),
    role: 'super_admin',
    exp: Date.now() + expirySeconds * 1000,
  };
  const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
  const sigBytes = await computeHmacSha256(encodedPayload, SUPER_ADMIN_SECRET);
  const signature = bytesToBase64Url(sigBytes);

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies a signed session token. Returns parsed payload if valid.
 */
export async function verifySessionToken(
  token: string
): Promise<{ email: string; role: string; exp: number } | null> {
  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSigBytes = await computeHmacSha256(encodedPayload, SUPER_ADMIN_SECRET);
    const expectedSignature = bytesToBase64Url(expectedSigBytes);

    if (!constantTimeEqual(signature, expectedSignature)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecodeToString(encodedPayload));
    if (Date.now() > payload.exp) {
      return null; // Expired session
    }

    // Verify email is still allowlisted
    if (!isEmailInSuperAdminAllowlist(payload.email)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
