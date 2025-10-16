import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { IS_SAAS_MODE } from "@/lib/config/features";
import { prisma } from "@/lib/db";

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

  // Redirect marketing pages when not in SaaS mode
  if (!IS_SAAS_MODE) {
    const marketingPages = ['/', '/pricing']
    if (marketingPages.includes(pathname)) {
      if (session) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }
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
  // But first check if this is the login page and no users exist
  if (!session && !isPublicRoute && pathname !== '/') {
    // Check if accessing login page and no users exist - redirect to register
    if (pathname === '/login') {
      const userCount = await prisma.user.count()
      if (userCount === 0) {
        return NextResponse.redirect(new URL('/register', request.url))
      }
    }
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
