"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Shield, Zap } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        const currentUser = data?.user ?? null;
        setUser(currentUser);

        // Redirect authenticated users to dashboard
        if (currentUser) {
          router.push("/dashboard");
        }
        setLoading(false);
      } catch (error) {
        console.error("Error checking auth state:", error);
        setLoading(false);
      }
    };

    checkUser();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // Redirect authenticated users to dashboard
        if (currentUser) {
          router.push("/dashboard");
        }
        setLoading(false);
      },
    );

    // Cleanup function
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Simple Navbar */}
      <nav className="bg-white px-4 sm:px-6 py-3 shadow-sm border-b border-gray-200 flex justify-between items-center">
        <span className="font-bold text-lg text-gray-800">
          VetClaims CoPilot
        </span>
        <div></div> {/* Empty div to maintain layout */}
      </nav>

      <main className="flex-grow">
        {loading ? (
          <div className="flex justify-center items-center flex-grow">
            <p>Loading...</p>
          </div>
        ) : !user ? (
          <>
            {/* Hero Section - Only show if not authenticated */}
            <div className="py-16 sm:py-20 px-4 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Simplify Your VA Disability Claim Preparation
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                VetClaims CoPilot guides you through the process, helping you
                organize information and build a stronger claim.
              </p>
            </div>

            {/* Authentication Section - Only show if not authenticated */}
            <div className="pt-8 pb-16 px-4 flex justify-center">
              <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
                <Auth
                  supabaseClient={supabase}
                  appearance={{ theme: ThemeSupa }}
                  providers={[]}
                  view="sign_in"
                  redirectTo="/dashboard"
                  showLinks={true}
                  magicLink={false}
                />
              </div>
            </div>

            {/* Features Section - Only show if not authenticated */}
            <div className="pt-16 pb-16 px-4 text-center bg-white">
              <h2 className="text-2xl font-semibold text-gray-800 mb-8">
                How VetClaims CoPilot Helps
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-blue-600 mb-4">
                    <CheckCircle2 className="w-6 h-6 mx-auto" />
                  </div>
                  <h3 className="font-semibold">Guided Process</h3>
                  <p className="text-gray-600 text-sm">
                    Step-by-step assistance for claim preparation.
                  </p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-blue-600 mb-4">
                    <Zap className="w-6 h-6 mx-auto" />
                  </div>
                  <h3 className="font-semibold">AI-Powered Insights</h3>
                  <p className="text-gray-600 text-sm">
                    Leverage AI for condition suggestions and interview guidance
                    (Coming Soon!).
                  </p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-blue-600 mb-4">
                    <Shield className="w-6 h-6 mx-auto" />
                  </div>
                  <h3 className="font-semibold">Organized Information</h3>
                  <p className="text-gray-600 text-sm">
                    Keep your service history, conditions, and documents in one
                    place.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section - Only show if not authenticated */}
            <section className="py-20 bg-gray-50">
              <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Join other veterans who trust VetClaims CoPilot with their VA
                  disability claims.
                </p>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your Account
                  <ArrowUpRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </section>
          </>
        ) : (
          <div className="flex justify-center items-center flex-grow">
            <p>Redirecting to dashboard...</p>
          </div>
        )}
      </main>

      {/* Simple Footer */}
      <footer className="py-4 px-4 border-t border-gray-200 text-center text-sm text-gray-500 mt-auto">
        © {new Date().getFullYear()} VetClaims CoPilot. All rights reserved.
      </footer>
    </div>
  );
}
