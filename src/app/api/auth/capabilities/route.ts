/**
 * Auth Capabilities API Endpoint
 * Returns which OAuth providers are available
 */

import { NextResponse } from 'next/server';
import { getAuthCapabilities } from '@/lib/auth/capabilities';

export async function GET() {
  return NextResponse.json(getAuthCapabilities());
}
