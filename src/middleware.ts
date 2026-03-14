
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Global Middleware
 * Ensures admin routes are bypassed to allow their own layout-based auth logic.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Bypass all main app logic for Admin routes
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|icon.png).*)',
  ],
};
