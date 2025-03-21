import { updateSession } from "./supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Update the session first
  const response = await updateSession(request);

  // Get the pathname from the URL
  const { pathname } = request.nextUrl;

  // Check if the user is authenticated
  const authCookie = request.cookies.get("sb-jqrmktqhknbhgjvhdyxd-auth-token");
  const isAuthenticated = !!authCookie?.value;

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard"];

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // If trying to access a protected route without authentication, redirect to sign-in
  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
