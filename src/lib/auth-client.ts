import { createAuthClient } from 'better-auth/client';
import {
  organizationClient,
  twoFactorClient,
  adminClient,
} from 'better-auth/client/plugins';

function getClientBaseURL(): string | undefined {
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return undefined;
}

export const authClient = createAuthClient({
  baseURL: getClientBaseURL(),
  plugins: [
    organizationClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/2fa';
        }
      },
    }),
    adminClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
