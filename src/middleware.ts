import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This file is deprecated - using root middleware.ts instead
// Export a middleware function to satisfy Next.js requirements
export function middleware(request: NextRequest) {
  // This middleware is deprecated, so we just pass through
  return NextResponse.next();
}

// Export a config to satisfy Next.js requirements
export const config = {
  matcher: [],
};
