// better-auth API Route Handler
// Handles all authentication endpoints including:
// - /api/auth/sign-in
// - /api/auth/sign-up
// - /api/auth/sign-out
// - /api/auth/session
// - OAuth callbacks

import { auth } from '@/lib/auth/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
