import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for session cookie - using custom prefix from auth config
  const sessionToken = request.cookies.get('contextstream.session_token')?.value

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // API routes and MCP endpoint should not be redirected (they handle their own auth)
  const isApiRoute = pathname.startsWith('/api/') || pathname === '/mcp'

  // Static files and Next.js internals
  const isStaticFile = pathname.startsWith('/_next') ||
                       pathname.startsWith('/favicon.ico') ||
                       pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|js|css|woff|woff2|ttf)$/)

  if (isApiRoute || isStaticFile) {
    return NextResponse.next()
  }

  // If user is authenticated and tries to access auth pages or landing page, redirect to dashboard
  if (sessionToken) {
    if (isPublicRoute || pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Note: Role-based authorization for /admin routes is handled by the actual
    // page components and API routes themselves to avoid database calls in middleware.
    // Middleware just ensures the user has a session token.
  }

  // If user is not authenticated and tries to access protected routes, redirect to login
  if (!sessionToken && !isPublicRoute && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
