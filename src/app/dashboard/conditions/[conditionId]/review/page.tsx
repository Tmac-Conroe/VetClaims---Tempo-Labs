"use client";

import DashboardNavbar from "@/components/dashboard-navbar";
import { useParams } from "next/navigation"; // Import useParams
import { useEffect, useState } from "react";
import { createClient } from "../../../../../../supabase/client"; // Adjusted path
import Link from "next/link";

export default function ConditionReviewPage() {
  const params = useParams(); // Hook to get dynamic route parameters
  const conditionId = params.conditionId as string; // Extract conditionId

  // Basic user auth check (similar to other dashboard pages)
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Placeholder for condition name - we are NOT fetching it yet
  const [conditionName, setConditionName] = useState<string | null>(null);

  // We won't implement the full user fetching here again for this placeholder,
  // assuming the middleware handles unauthorized access.
  // You can add the full fetchUser logic later if needed for specific data.
  useEffect(() => {
    // Simulate loading or basic auth check if needed
    setLoading(false);

    // Placeholder: In a real scenario, fetch the condition name using conditionId
    // For now, just indicate we have the ID.
    if (conditionId) {
      console.log("Condition ID from URL:", conditionId);
      // Set a placeholder name based on ID for display
      setConditionName(`Condition (ID: ${conditionId.substring(0, 6)}...)`);
    }
  }, [conditionId]); // Rerun if ID changes

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Loading review page...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  // Main page content
  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      <DashboardNavbar />
      <header className="w-full bg-gray-100 py-3 px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-center text-gray-800">
          {/* Display placeholder name */}
          Condition Review: {conditionName || "Loading..."}
        </h1>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto max-w-4xl bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Condition Details</h2>
          <p className="text-gray-600 mb-4">
            This page will display the information gathered during the
            AI-assisted interview for the selected condition (ID: {conditionId}
            ).
          </p>
          <p className="text-gray-600 mb-4">
            Features coming in Layer 3 include:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-4 pl-4">
            <li>Detailed answers from the interview questions.</li>
            <li>Ability to review and edit responses.</li>
            <li>Links to relevant uploaded documents.</li>
            <li>Option to generate a preliminary report section.</li>
          </ul>

          <p className="text-gray-500 italic">
            (Placeholder content - Full functionality coming soon!)
          </p>

          <div className="mt-6 border-t pt-4">
            <Link
              href="/dashboard/conditions"
              className="text-blue-600 hover:underline"
            >
              ← Back to Conditions List
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
