"use client";

import DashboardNavbar from "@/components/dashboard-navbar";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import { useEffect, useState } from "react";

export default function ConditionsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Define common conditions array
  const commonConditions = [
    "Back Pain (Lumbosacral Strain)",
    "Tinnitus (Ringing in Ears)",
    "PTSD (Post-Traumatic Stress Disorder)",
    "Knee Condition (e.g., Patellofemoral Syndrome)",
    "Hearing Loss",
    "Migraines",
    "Shoulder Condition (e.g., Rotator Cuff)",
    "Ankle Condition (e.g., Sprain/Strain)",
    "Sleep Apnea",
    "Depression",
    "Anxiety Disorder",
  ];

  // State for tracking selected and active conditions
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [activeConditions, setActiveConditions] = useState<string[]>([]);

  // Handle checkbox changes
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    if (checked) {
      // Add condition to selected list if checked
      setSelectedConditions((prev) => [...prev, value]);
    } else {
      // Remove condition from selected list if unchecked
      setSelectedConditions((prev) =>
        prev.filter((condition) => condition !== value),
      );
    }
  };

  // Handle confirm conditions button click
  const handleConfirmConditions = () => {
    // Update active conditions with selected conditions
    setActiveConditions([...selectedConditions]);

    // Optionally clear selection after confirming
    // setSelectedConditions([]);

    console.log("Confirmed Conditions:", selectedConditions);
    // TODO: Add logic here to persist confirmed conditions to Supabase in future
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          setError("Session error: " + sessionError.message);
          setLoading(false);
          return;
        }

        if (!sessionData.session) {
          router.push("/sign-in");
          return;
        }

        const { data, error: userError } = await supabase.auth.getUser();

        if (userError) {
          setError("Authentication error: " + userError.message);
          setLoading(false);
          return;
        }

        if (!data.user) {
          router.push("/sign-in");
          return;
        }

        setUser(data.user);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p className="text-lg">Loading conditions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold mb-2">
            Error Loading Conditions
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
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* Dashboard Navbar */}
      <DashboardNavbar />

      {/* Header Section */}
      <header className="w-full bg-gray-100 py-3 px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-center text-gray-800">
          Conditions
        </h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 flex flex-col items-center overflow-y-auto">
        <div className="container mx-auto max-w-5xl">
          {/* Common Condition List with Checkboxes */}
          <div className="border border-gray-300 rounded-md p-4 mb-4 w-full max-w-lg mx-auto bg-white">
            <h2 className="font-bold mb-3 text-lg">Common Condition List</h2>
            <div className="space-y-2">
              {commonConditions.map((condition) => (
                <div key={condition} className="flex items-center">
                  <input
                    type="checkbox"
                    id={condition}
                    value={condition}
                    checked={selectedConditions.includes(condition)}
                    onChange={handleCheckboxChange}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={condition} className="text-gray-700">
                    {condition}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Active Conditions List */}
          <div className="border border-gray-300 rounded-md p-4 mt-4 w-full max-w-lg mx-auto bg-white">
            <h2 className="font-bold mb-3 text-lg">Active Conditions</h2>
            {activeConditions.length === 0 ? (
              <p className="text-gray-500 italic">
                Your active conditions will be listed here after you confirm
                them.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {activeConditions.map((condition) => (
                  <li key={condition} className="text-gray-700">
                    {condition}
                    {/* TODO: Add Edit/Delete buttons or status indicators here in future */}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirm Conditions Button */}
          <div className="flex justify-center mt-4">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full md:w-64 transition-colors"
              onClick={handleConfirmConditions}
              disabled={selectedConditions.length === 0}
            >
              Confirm Conditions
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
