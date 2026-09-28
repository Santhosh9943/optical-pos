import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, twoFactor, admin } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema';
import {
  sendPasswordResetEmail,
  sendTwoFactorOtpEmail,
  dispatchAsyncEmail,
} from '@/lib/email';

function getServerBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      dispatchAsyncEmail(() => sendPasswordResetEmail(user.email, url, token));
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  plugins: [
    organization(),
    admin({
      defaultRole: 'user',
      adminRole: ['super_admin'],
    }),
    twoFactor({
      issuer: 'OptixOS Eyecare',
      allowPasswordless: true,
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          dispatchAsyncEmail(() => sendTwoFactorOtpEmail(user.email, otp));
        },
      },
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  baseURL: getServerBaseURL(),
  trustedOrigins: [
    'http://localhost:3000',
    'https://optical-pos-roan.vercel.app',
    'https://*.vercel.app',
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
  ],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
