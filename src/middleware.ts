import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const session = await auth.api.getSession({
    headers: await headers()
  })
   // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/pricing', '/docs', '/privacy', '/terms']
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
  // Exception: /pricing, /docs, /privacy, /terms should be accessible to both logged-in and logged-out users
  const publicContentPages = ['/pricing', '/docs', '/privacy', '/terms']
  if (session) {
    if ((isPublicRoute && !publicContentPages.includes(pathname)) || pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // If user is not authenticated and tries to access protected routes, redirect to login
  if (!session && !isPublicRoute && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  runtime: "nodejs",
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
