import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/super-admin-session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─────────────────────────────────────────────────────────────
  // 0. E2E TEST BYPASS GATE (STRICT PRODUCTION INVARIANT)
  // Strictly blocked in production; only allowed in local test/dev.
  // ─────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production' && !pathname.startsWith('/super-admin')) {
    if (
      request.headers.get('x-e2e-bypass-auth') === 'true' ||
      request.cookies.get('x-e2e-bypass-auth')?.value === 'true'
    ) {
      const response = NextResponse.next();
      response.cookies.set('x-e2e-bypass-auth', 'true', { path: '/' });
      return applySecurityHeaders(response);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. ISOLATED SUPER ADMIN PLATFORM DOMAIN
  // Cryptographically verifies HMAC-SHA256 signature of token
  // ─────────────────────────────────────────────────────────────
  if (pathname.startsWith('/super-admin')) {
    const superAdminCookie = request.cookies.get('optixos_super_admin_session');
    const validSession = superAdminCookie?.value ? await verifySessionToken(superAdminCookie.value) : null;
    const isSuperAdminAuthed = !!validSession;

    // If already authenticated and accessing login, redirect to root dashboard
    if (pathname === '/super-admin/login') {
      if (isSuperAdminAuthed) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL('/super-admin/dashboard', request.url))
        );
      }
      return applySecurityHeaders(NextResponse.next());
    }

    // Unauthenticated super-admin access or forged token -> redirect to login
    if (!isSuperAdminAuthed) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL('/super-admin/login', request.url))
      );
    }

    return applySecurityHeaders(NextResponse.next());
  }

  // ─────────────────────────────────────────────────────────────
  // 2. REGULAR PRACTICE STORE DOMAIN (Better-Auth)
  // ─────────────────────────────────────────────────────────────
  const sessionCookie =
    request.cookies.get('better-auth.session_token') ||
    request.cookies.get('__Secure-better-auth.session_token');
  const isAuthenticated = !!sessionCookie?.value;

  const isAuthRoute = pathname.startsWith('/auth');
  const isProtectedRoute =
    pathname.startsWith('/pos') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/owner') ||
    pathname.startsWith('/portal');

  // If unauthenticated and accessing protected route, redirect to login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/auth/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // If authenticated and accessing auth routes (e.g. /auth/login), redirect to /admin/dashboard
  if (isAuthenticated && isAuthRoute) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/admin/dashboard', request.url))
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

/**
 * Injects security headers on every response (Clickjacking, MIME-sniffing, Referrer Policy)
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export const config = {
  matcher: [
    '/',
    '/pos/:path*',
    '/admin/:path*',
    '/owner/:path*',
    '/super-admin/:path*',
    '/portal/:path*',
    '/auth/:path*',
  ],
};
