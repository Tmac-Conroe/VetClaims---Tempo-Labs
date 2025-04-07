"use client";

import Link from "next/link";
import DashboardNavbar from "@/components/dashboard-navbar";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ConfirmationModal from "@/components/confirmation-modal";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import AddConditionSheet from "@/components/add-condition-sheet";

type ActiveCondition = {
  id: string;
  condition_name: string;
  claim_type: string | null;
  diagnostic_code: string | null;
};

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
  const [activeConditions, setActiveConditions] = useState<ActiveCondition[]>(
    [],
  );
  const [fetchingConditions, setFetchingConditions] = useState(false);
  const [deletingConditionId, setDeletingConditionId] = useState<string | null>(
    null,
  );
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSubmittingCustomCondition, setIsSubmittingCustomCondition] =
    useState(false);
  const [suggestedConditions, setSuggestedConditions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // State variables for confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [conditionIdToDelete, setConditionIdToDelete] = useState<string | null>(
    null,
  );

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

  // Function to fetch active conditions from the database
  const fetchActiveConditions = async () => {
    if (!user) return;

    try {
      setFetchingConditions(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("conditions")
        .select("id, condition_name, claim_type, diagnostic_code")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching conditions:", error);
        return;
      }

      if (data) {
        // Set active conditions with the fetched data
        setActiveConditions(data as ActiveCondition[]);
        console.log("Active conditions fetched:", data);
      }
    } catch (err) {
      console.error("Unexpected error fetching conditions:", err);
    } finally {
      setFetchingConditions(false);
    }
  };

  // Handle confirm conditions button click
  const handleConfirmConditions = async () => {
    if (!user || selectedConditions.length === 0) {
      console.log("No user or no conditions selected.");
      return; // Exit if no user or nothing selected
    }

    console.log("Attempting to confirm conditions:", selectedConditions);
    const supabase = createClient();
    let errorOccurred = false; // Flag to track if any non-duplicate error happened

    // Use Promise.all to handle multiple inserts concurrently
    await Promise.all(
      selectedConditions.map(async (conditionName) => {
        try {
          // Check if condition already exists in active conditions
          if (
            activeConditions.some((c) => c.condition_name === conditionName)
          ) {
            console.log(
              `Condition "${conditionName}" already exists for user.`,
            );
            return; // Skip this condition
          }

          // Attempt to insert the condition
          const { data, error } = await supabase
            .from("conditions")
            .insert({
              user_id: user.id,
              condition_name: conditionName,
              condition_status: "confirmed", // Set status to confirmed
              claim_type: "Primary", // Default to Primary for common conditions
              diagnostic_code: null, // Default to null for common conditions
            })
            .select() // Select to get the inserted data or handle errors
            .single(); // Use single() if you expect only one row or an error

          // Type guard for SupabaseError
          if (error && typeof error === "object" && "code" in error) {
            // Check if it's a unique constraint violation (PostgreSQL error code 23505)
            if (error.code === "23505") {
              console.log(
                `Condition "${conditionName}" already exists for user.`,
              );
              // Ignore duplicate error - this is expected if already added
            } else {
              // It's a different, unexpected error
              console.error(
                `Error inserting condition "${conditionName}":`,
                error,
              );
              errorOccurred = true; // Mark that an error occurred
            }
          } else if (error) {
            // Handle potential errors that don't have a 'code' property
            console.error(
              `Error inserting condition "${conditionName}" (no code):`,
              error,
            );
            errorOccurred = true;
          } else {
            console.log(
              `Condition "${conditionName}" added successfully:`,
              data,
            );
            // Successfully inserted (or already existed and ignored)
          }
        } catch (catchError) {
          // Catch any other unexpected errors during the insert process
          console.error(
            `Unexpected error inserting condition "${conditionName}":`,
            catchError,
          );
          errorOccurred = true; // Mark that an error occurred
        }
      }),
    );

    // --- Post-Insertion Actions ---

    // 1. Clear the selection checkboxes
    setSelectedConditions([]);

    // 2. Refresh the activeConditions list from the database
    await fetchActiveConditions();

    // 3. Notify user if any unexpected errors occurred during insertion
    if (errorOccurred) {
      toast.error("Some conditions could not be added due to an error.");
    } else {
      toast.success("Selected conditions confirmed successfully!");
    }

    console.log("Confirm Conditions process finished.");
  };

  // Handle opening the confirmation modal for removing a condition
  const handleRemoveActiveCondition = (conditionId: string) => {
    setConditionIdToDelete(conditionId);
    setIsConfirmModalOpen(true);
  };

  // Handle confirming the deletion of a condition
  const confirmDeletion = async () => {
    if (!conditionIdToDelete || !user) return; // Check if conditionIdToDelete is set and user exists

    try {
      setDeletingConditionId(conditionIdToDelete); // Use the state variable
      setIsConfirmModalOpen(false); // Close modal immediately when confirm is clicked

      const supabase = createClient();
      const { error } = await supabase
        .from("conditions")
        .delete()
        .eq("id", conditionIdToDelete) // Use ID instead of name
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting condition:", error);
        toast.error(`Failed to delete condition: ${error.message}`);
        return;
      }

      // Refresh the active conditions list
      await fetchActiveConditions();

      toast.success("Condition removed successfully");
    } catch (err) {
      console.error("Error removing condition:", err);
      toast.error(
        "An unexpected error occurred while removing the condition. Please try again.",
      );
    } finally {
      setDeletingConditionId(null); // Reset deleting state
      setConditionIdToDelete(null); // Reset condition to delete state
    }
  };

  const fetchSuggestions = async () => {
    // Ensure we have a user and potentially some service history to base suggestions on
    // For now, we'll just check for the user. We can add service history check later.
    if (!user) {
      console.log("User not available for fetching suggestions.");
      return;
    }

    setSuggestionsLoading(true);
    setSuggestionsError(null); // Clear previous errors
    setSuggestedConditions([]); // Clear previous suggestions

    try {
      const supabase = createClient(); // Ensure supabase client is initialized

      // Fetch the most recent service history entry based on end_date
      const { data: historyData, error: historyError } = await supabase
        .from("service_history")
        .select("branch, job") // Select only needed fields
        .eq("user_id", user.id)
        .order("end_date", { ascending: false }) // Get the latest entry first
        .limit(1) // We only need one entry
        .maybeSingle(); // Use maybeSingle to handle 0 or 1 result gracefully

      if (historyError) {
        console.error(
          "Error fetching service history for suggestions:",
          historyError,
        );
        setSuggestionsError(
          "Could not retrieve service history for suggestions.",
        );
        setSuggestionsLoading(false); // Stop loading
        return; // Exit the function
      }

      if (!historyData || !historyData.branch || !historyData.job) {
        console.warn("No relevant service history found for suggestions.");
        // Display a user-friendly message instead of an error if no history exists
        setSuggestionsError(
          "Add your service history to get personalized suggestions.",
        );
        setSuggestionsLoading(false); // Stop loading
        return; // Exit the function
      }

      // Use the actual branch and job from the fetched data
      const actualBranch = historyData.branch;
      const actualJob = historyData.job;

      console.log(
        `Using service history for suggestions: Branch=${actualBranch}, Job=${actualJob}`,
      );
      console.log("Invoking suggest-conditions function...");

      const { data, error } = await supabase.functions.invoke(
        "suggest-conditions",
        {
          body: {
            service_branch: actualBranch, // Use actual data
            job_title: actualJob, // Use actual data
          },
        },
      );

      if (error) {
        console.error("Error invoking suggest-conditions function:", error);
        setSuggestionsError(`Failed to load suggestions: ${error.message}`);
        toast.error(`Failed to load suggestions: ${error.message}`);
      } else if (data && data.suggested_conditions) {
        console.log("Suggestions received:", data.suggested_conditions);
        setSuggestedConditions(data.suggested_conditions);
      } else {
        console.error("Invalid data structure received:", data);
        setSuggestionsError("Received invalid suggestion data format.");
        toast.error("Received invalid suggestion data format.");
      }
    } catch (err) {
      console.error("Unexpected error fetching suggestions:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setSuggestionsError(`An unexpected error occurred: ${errorMessage}`);
      toast.error(`An unexpected error occurred while fetching suggestions.`);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Trigger fetchSuggestions when user data is available
  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Trigger when user data becomes available

  // Fetch active conditions when user is available
  useEffect(() => {
    if (user) {
      fetchActiveConditions();
    }
  }, [user]);

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

  // Find condition name for deletion confirmation
  const conditionNameToDelete = activeConditions.find(
    (c) => c.id === conditionIdToDelete,
  )?.condition_name;

  const handleAddNewCondition = async (data: {
    name: string;
    claimType: string;
    diagnosticCode: string | null;
  }) => {
    if (!user) {
      toast.error("You must be logged in to add conditions.");
      return;
    }
    if (!data.name) {
      console.log("Attempting to show empty condition name toast.");
      toast.error("Condition name cannot be empty.");
      return;
    }

    setIsSubmittingCustomCondition(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from("conditions").insert({
        user_id: user.id,
        condition_name: data.name,
        condition_status: "confirmed", // Using confirmed status to match the constraint
        claim_type: data.claimType,
        diagnostic_code: data.diagnosticCode,
        // created_at and updated_at should be handled by default values or triggers if set up
      });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          toast.error(`Condition "${data.name}" already exists in your list.`);
        } else {
          console.error("Error adding custom condition:", error);
          toast.error(`Failed to add condition: ${error.message}`);
        }
      } else {
        toast.success(`Condition "${data.name}" added successfully.`);
        fetchActiveConditions(); // Refresh the active conditions list
        setIsAddSheetOpen(false); // Close the sheet on success
        // Consider clearing the input in AddConditionSheet if it stays open, but we close it here.
      }
    } catch (err) {
      console.error("Unexpected error adding custom condition:", err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmittingCustomCondition(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
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
          {/* AI Suggested Conditions Section */}
          <div className="border border-blue-200 bg-blue-50 rounded-md p-4 mb-6 w-full max-w-lg mx-auto shadow-sm">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 text-center">
              AI Suggested Conditions
            </h3>
            {suggestionsLoading ? (
              <p className="text-blue-700 italic text-center animate-pulse">
                Loading suggestions based on your service...
              </p>
            ) : suggestionsError ? (
              <p className="text-red-600 text-center">{suggestionsError}</p>
            ) : suggestedConditions.length === 0 ? (
              <p className="text-gray-500 italic text-center">
                No suggestions available currently.
              </p>
            ) : (
              <ul className="space-y-1 list-disc list-inside text-sm text-blue-900 pl-4">
                {suggestedConditions.map((condition, index) => (
                  <li key={index}>{condition}</li>
                ))}
              </ul>
            )}
            {/* Optional: Add a button to manually refresh suggestions later */}
            {/* <div className="text-center mt-3">
                  <Button variant="link" size="sm" onClick={fetchSuggestions} disabled={suggestionsLoading}>Refresh Suggestions</Button>
              </div> */}
          </div>

          {/* Common Condition List with Checkboxes */}
          <div className="border border-gray-300 rounded-md p-6 mb-4 w-full max-w-lg mx-auto bg-white shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-5">
              Common Condition List
            </h2>
            <div className="space-y-1 mb-4 border-t border-gray-200 pt-4">
              {commonConditions.map((condition) => {
                // Check if condition already exists in active conditions
                const isActive = activeConditions.some(
                  (ac) => ac.condition_name === condition,
                );
                return (
                  <div
                    key={condition}
                    className={`flex items-center py-1 rounded px-2 -mx-2 ${
                      isActive
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={condition}
                      value={condition}
                      checked={
                        selectedConditions.includes(condition) || isActive
                      }
                      onChange={handleCheckboxChange}
                      disabled={isActive}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                    <label
                      htmlFor={condition}
                      className={`text-gray-700 ${
                        isActive ? "cursor-not-allowed" : ""
                      }`}
                    >
                      {condition}
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Instructional Text */}
            <p className="text-sm text-gray-600 text-center mt-4 mb-4">
              Select all applicable conditions from the list above, then click
              'Confirm Conditions' to add them to your Active Conditions.
            </p>

            {/* Confirm Conditions Button */}
            <div className="flex justify-center border-t border-gray-200 pt-4 mt-4 space-x-2">
              <Button
                variant="outline"
                className="w-full md:w-64"
                onClick={() => setIsAddSheetOpen(true)}
              >
                Add Custom Condition
              </Button>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full md:w-64 transition-colors disabled:opacity-50 disabled:bg-blue-300"
                onClick={handleConfirmConditions}
                disabled={
                  selectedConditions.length === 0 ||
                  selectedConditions.every((sc) =>
                    activeConditions.some((ac) => ac.condition_name === sc),
                  )
                }
              >
                Confirm Conditions
              </button>
            </div>
          </div>

          {/* Active Conditions List */}
          <div className="border border-gray-300 rounded-md p-4 mt-4 w-full max-w-lg mx-auto bg-white">
            <h2 className="font-bold mb-3 text-lg">Active Conditions</h2>
            {fetchingConditions ? (
              <p className="text-gray-500 text-center">Loading conditions...</p>
            ) : activeConditions.length === 0 ? (
              <p className="text-gray-500 italic">
                Your active conditions will be listed here after you confirm
                them.
              </p>
            ) : (
              <ul className="space-y-2">
                {activeConditions.map((condition) => (
                  <li
                    key={condition.id}
                    className="flex justify-between items-center py-2 px-3 rounded border border-gray-100 hover:bg-gray-50"
                  >
                    <div className="flex flex-col">
                      <span className="text-gray-800 font-medium">
                        {condition.condition_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {condition.claim_type || "Primary"}
                        {condition.diagnostic_code &&
                          ` • Code: ${condition.diagnostic_code}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/dashboard/conditions/${condition.id}/review`}
                      >
                        <Button variant="outline" size="sm" className="text-xs">
                          Review / Interview
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveActiveCondition(condition.id)
                        }
                        disabled={deletingConditionId === condition.id}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                      >
                        {deletingConditionId === condition.id
                          ? "Removing..."
                          : "Remove"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {/* Sheet for adding custom conditions */}
      <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
        <AddConditionSheet
          onClose={() => setIsAddSheetOpen(false)}
          onSubmit={handleAddNewCondition}
          isSubmitting={isSubmittingCustomCondition}
        />
      </Sheet>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setConditionIdToDelete(null); // Also reset conditionIdToDelete on cancel
        }}
        onConfirm={confirmDeletion} // Pass the deletion logic function
        title="Confirm Deletion"
        // Dynamically set the message based on the condition to delete
        message={`Are you sure you want to remove "${conditionNameToDelete || "this condition"}" from your active conditions?`}
        confirmText="Remove"
      />
    </div>
  );
}
