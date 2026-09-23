import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isDashboard = nextUrl.pathname.startsWith('/dashboard');
  const isLoginPage = nextUrl.pathname === '/login';

  // Redirect unauthenticated users away from protected dashboard routes
  if (isDashboard && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect already-authenticated users away from the login page
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
