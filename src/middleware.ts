import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass for E2E tests if bypass header or cookie is present
  if (
    request.headers.get('x-e2e-bypass-auth') === 'true' ||
    request.cookies.get('x-e2e-bypass-auth')?.value === 'true'
  ) {
    return NextResponse.next();
  }

  // Check for session token cookie
  const sessionCookie =
    request.cookies.get('better-auth.session_token') ||
    request.cookies.get('__Secure-better-auth.session_token');
  const isAuthenticated = !!sessionCookie?.value;

  const isAuthRoute = pathname.startsWith('/auth');
  const isProtectedRoute =
    pathname.startsWith('/pos') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/super-admin') ||
    pathname === '/';

  // If unauthenticated and accessing protected route, redirect to login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/auth/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and accessing auth routes (e.g. /auth/login), redirect to /pos/new-bill
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/pos/new-bill', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/pos/:path*',
    '/admin/:path*',
    '/super-admin/:path*',
    '/auth/:path*',
  ],
};
