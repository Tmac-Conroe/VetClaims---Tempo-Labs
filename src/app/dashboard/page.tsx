"use client";

import { InfoIcon, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../supabase/client";
import { useEffect, useState } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";

export default function Dashboard() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceHistoryCount, setServiceHistoryCount] = useState<number | null>(
    null,
  );
  const [activeConditionsCount, setActiveConditionsCount] = useState<
    number | null
  >(null);
  const [countsLoading, setCountsLoading] = useState(true); // Start loading initially
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log("Fetching user data...");
        const supabase = createClient();

        // First check the session
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        console.log("Session data:", sessionData);

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("Session error: " + sessionError.message);
          setLoading(false);
          return;
        }

        if (!sessionData.session) {
          console.log("No active session found, redirecting to sign-in");
          router.push("/sign-in");
          return;
        }

        // Then get the user data
        const { data, error: userError } = await supabase.auth.getUser();
        console.log("User data:", data);

        if (userError) {
          console.error("Auth error:", userError);
          setError("Authentication error: " + userError.message);
          setLoading(false);
          return;
        }

        if (!data.user) {
          console.log("No user found, redirecting to sign-in");
          router.push("/sign-in");
          return;
        }

        // Set the user data immediately to ensure the page renders
        setUser(data.user);
        setLoading(false);

        // Then try to fetch additional profile data
        try {
          console.log("Fetching user profile data...");
          const { data: profileData, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", data.user.id)
            .single();

          console.log(
            "Profile data:",
            profileData,
            "Profile error:",
            profileError,
          );

          if (profileData) {
            // Update user with profile data if available
            setUser((prev: any) => ({
              ...prev,
              profile: profileData,
            }));
          }
        } catch (profileErr) {
          console.error("Error fetching profile:", profileErr);
          // Don't fail the whole page if profile fetch fails
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      const fetchCounts = async () => {
        setCountsLoading(true);
        const supabase = createClient();
        let historyCount = 0;
        let conditionsCount = 0;

        try {
          // Fetch Service History Count
          const { count: historyDataCount, error: historyError } =
            await supabase
              .from("service_history")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id);

          if (historyError) {
            console.error(
              "Error fetching service history count:",
              historyError,
            );
            toast.error("Could not load service history count.");
          } else {
            historyCount = historyDataCount ?? 0;
          }

          // Fetch Active Conditions Count
          const { count: conditionsDataCount, error: conditionsError } =
            await supabase
              .from("conditions")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("condition_status", "confirmed"); // Using confirmed status to match the existing code

          if (conditionsError) {
            console.error(
              "Error fetching active conditions count:",
              conditionsError,
            );
            toast.error("Could not load active conditions count.");
          } else {
            conditionsCount = conditionsDataCount ?? 0;
          }

          setServiceHistoryCount(historyCount);
          setActiveConditionsCount(conditionsCount);
        } catch (err) {
          console.error("Unexpected error fetching counts:", err);
          toast.error("An error occurred while loading progress.");
          setServiceHistoryCount(0); // Default to 0 on unexpected error
          setActiveConditionsCount(0);
        } finally {
          setCountsLoading(false);
        }
      };

      fetchCounts();
    } else {
      // Reset counts if user logs out or is not available
      setCountsLoading(false);
      setServiceHistoryCount(null);
      setActiveConditionsCount(null);
    }
  }, [user]); // Re-run this effect if the user object changes

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p className="text-lg">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold mb-2">
            Error Loading Dashboard
          </h2>
          <p>{error}</p>
          <button
            onClick={() => router.push("/sign-in")}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p className="text-lg">
          No user data available. Please{" "}
          <button
            onClick={() => router.push("/sign-in")}
            className="text-primary underline"
          >
            sign in
          </button>{" "}
          again.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      {/* Header Section */}
      <DashboardNavbar />
      <header className="w-full bg-white py-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-center text-gray-800">
          VetClaims CoPilot Dashboard
        </h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto max-w-5xl">
          {/* Progress Indicators Section */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3 text-center md:text-left">
              Your Progress
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium text-gray-600">
                    Service History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {countsLoading ? (
                    <p className="text-2xl font-bold text-gray-800 animate-pulse">
                      Loading...
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-gray-800">
                      {serviceHistoryCount ?? 0} Record
                      {serviceHistoryCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium text-gray-600">
                    Active Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {countsLoading ? (
                    <p className="text-2xl font-bold text-gray-800 animate-pulse">
                      Loading...
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-gray-800">
                      {activeConditionsCount ?? 0} Condition
                      {activeConditionsCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Navigation Buttons Section */}
          <section className="flex flex-col items-center justify-center mt-4 space-y-3">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-md max-w-xs w-full md:w-64 transition-colors shadow-sm"
              onClick={() => router.push("/dashboard/service-history")}
            >
              Service History
            </button>

            <Link
              href="/dashboard/conditions"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-md max-w-xs w-full md:w-64 transition-colors shadow-sm text-center inline-block"
            >
              Conditions
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
