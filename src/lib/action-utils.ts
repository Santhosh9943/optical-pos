import { z } from 'zod';

/**
 * Permissive 36-character hexadecimal UUID regex pattern.
 * Allows standard RFC 4122 v1-v8 UUIDs as well as deterministic seeded identifiers
 * (e.g., 00000000-0000-0000-0000-000000000001, 00000000-0000-0000-0000-000000000002).
 */
export const lenientUuidRegex =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Lenient optional UUID schema that accepts valid 36-char hex UUIDs,
 * allows null/undefined, and normalizes empty strings ('') or 'all' to null.
 */
export const lenientUuidSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine(
    (val) => !val || val === 'all' || lenientUuidRegex.test(val),
    { message: 'Invalid UUID format' }
  )
  .transform((val) => {
    if (val === undefined) return undefined;
    if (!val || val === 'all') return null;
    return val;
  });

/**
 * Lenient required UUID schema for mandatory identifiers.
 */
export const requiredLenientUuidSchema = z
  .string()
  .trim()
  .min(1, 'Identifier is required')
  .refine(
    (val) => lenientUuidRegex.test(val),
    { message: 'Invalid UUID format' }
  );

/**
 * Formats a ZodError into a human-readable, friendly error string.
 * Avoids raw JSON array dumps like [{ origin: "string", ... }].
 */
export function formatZodError(error: z.ZodError, defaultMsg = 'Invalid input data'): string {
  if (!error || !error.issues || error.issues.length === 0) {
    return defaultMsg;
  }

  // Join issues cleanly or present the first actionable issue
  const formattedIssues = error.issues.map((issue) => {
    const fieldPath = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${fieldPath}${issue.message}`;
  });

  return formattedIssues[0] || defaultMsg;
}

/**
 * Universal error formatter for Server Actions catch blocks.
 * Safely extracts human-readable text from ZodError, JSON-stringified error arrays,
 * standard Error objects, and common Postgres driver codes.
 */
export function formatActionError(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (!err) return fallback;

  // Handle direct ZodError
  if (err instanceof z.ZodError) {
    return formatZodError(err, fallback);
  }

  if (err instanceof Error) {
    const msg = err.message || '';

    // Check if error message is a stringified JSON array of Zod issues
    if (msg.trim().startsWith('[') && msg.includes('"message"')) {
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          const pathPrefix = first.path && Array.isArray(first.path) && first.path.length > 0
            ? `${first.path.join('.')}: `
            : '';
          return `${pathPrefix}${first.message || fallback}`;
        }
      } catch {
        // Not valid JSON, continue to normal string checks
      }
    }

    // Common Postgres constraint checks
    if (msg.includes('duplicate key value') || msg.includes('unique constraint')) {
      return 'A record with this identifier or code already exists.';
    }
    if (msg.includes('foreign key constraint')) {
      return 'Referenced entity does not exist or has been removed.';
    }

    return msg || fallback;
  }

  if (typeof err === 'string') {
    return cleanErrorMessage(err) || fallback;
  }

  return fallback;
}

/**
 * Client-side sanitization function that ensures any error message displayed
 * in toasts or alert banners is clean, human-readable text rather than raw JSON.
 */
export function cleanErrorMessage(rawError?: string | null): string {
  if (!rawError) return '';

  const trimmed = rawError.trim();

  // If the message is a stringified JSON array of Zod issues
  if (trimmed.startsWith('[') && trimmed.includes('"message"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        const pathPrefix = first.path && Array.isArray(first.path) && first.path.length > 0
          ? `${first.path.join('.')}: `
          : '';
        return `${pathPrefix}${first.message || 'Validation error'}`;
      }
    } catch {
      // Fallback to raw text
    }
  }

  return trimmed;
}
