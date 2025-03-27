import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // If the cookie is set, update the request cookies object.
            // This is needed for interaction with subsequent middleware, RSC, etc.
            request.cookies.set({ name, value, ...options });
            // Also update the response cookies object.
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            // If the cookie is removed, update the request cookies object.
            request.cookies.set({ name, value: "", ...options });
            // Also update the response cookies object.
            response.cookies.set({ name, value: "", ...options });
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      // protected routes
      if (request.nextUrl.pathname.startsWith("/dashboard") && error) {
        return NextResponse.redirect(new URL("/", request.url));
      }

      // Return the response without modifying it further
      return response;
    } catch (e) {
      console.error("Error in auth.getUser():", e);
      // If there's an error with auth, still allow access to non-protected routes
      if (request.nextUrl.pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return response;
    }
  } catch (e) {
    console.error("Supabase middleware error:", e);
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
