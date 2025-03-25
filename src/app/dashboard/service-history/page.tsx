"use client";

import DashboardNavbar from "@/components/dashboard-navbar";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import { useEffect, useState } from "react";
import AddServiceHistoryModal from "@/components/add-service-history-modal";

type ServiceHistory = {
  id: string;
  user_id: string;
  branch: string;
  start_date: string;
  end_date: string;
  job: string;
  deployments: string[] | null;
  created_at: string;
  updated_at: string;
};

export default function ServiceHistory() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceHistoryList, setServiceHistoryList] = useState<
    ServiceHistory[]
  >([]);
  const [serviceHistoryLoading, setServiceHistoryLoading] = useState(false);
  const router = useRouter();

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

  // Fetch service history data when user is loaded using getAllServiceHistory Supabase Function
  useEffect(() => {
    if (user) {
      const fetchServiceHistory = async () => {
        try {
          setServiceHistoryLoading(true);
          const supabase = createClient();

          // Directly query the service_history table instead of using RPC
          let data, error;
          try {
            const tableResult = await supabase
              .from("service_history")
              .select("*")
              .eq("user_id", user.id);

            data = tableResult.data;
            error = tableResult.error;

            if (error) {
              console.error(
                "Error fetching service history with direct query:",
                error,
              );
              setServiceHistoryLoading(false);
              return;
            }
          } catch (queryError) {
            console.error(
              "Exception when querying service history:",
              queryError,
            );
            setServiceHistoryLoading(false);
            return;
          }

          console.log("Fetched service history:", data);
          setServiceHistoryList(data || []);
          setServiceHistoryLoading(false);
        } catch (err) {
          console.error("Unexpected error fetching service history:", err);
          setServiceHistoryLoading(false);
        }
      };

      fetchServiceHistory();
    }
  }, [user]);

  const handleSubmitServiceHistory = async (serviceHistory: {
    branch: string;
    startDate: string;
    endDate: string;
    job: string;
    deployments: string;
  }) => {
    try {
      const supabase = createClient();

      // Parse deployments string into array
      const deploymentsArray = serviceHistory.deployments
        ? serviceHistory.deployments.split(",").map((d) => d.trim())
        : [];

      // Prepare the service history record
      const newRecord = {
        user_id: user.id,
        branch: serviceHistory.branch,
        start_date: serviceHistory.startDate,
        end_date: serviceHistory.endDate,
        job: serviceHistory.job,
        deployments: deploymentsArray,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Submitting service history record:", newRecord);

      // Insert new service history record
      const { data, error } = await supabase
        .from("service_history")
        .insert(newRecord)
        .select();

      if (error) {
        console.error("Error adding service history:", error);
        alert(`Failed to add service history: ${error.message}`);
        return;
      }

      console.log("Service history added successfully:", data);

      // Update the service history list with the new entry
      if (data && data.length > 0) {
        setServiceHistoryList((prev) => [...prev, data[0]]);
      }

      // Try to refresh the service history list to ensure it's up to date
      try {
        setServiceHistoryLoading(true);
        const { data: refreshedData, error: refreshError } = await supabase
          .from("service_history")
          .select("*")
          .eq("user_id", user.id);

        if (!refreshError && refreshedData) {
          setServiceHistoryList(refreshedData);
        }
        setServiceHistoryLoading(false);
      } catch (refreshErr) {
        console.error("Error refreshing service history:", refreshErr);
        setServiceHistoryLoading(false);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Error submitting service history:", err);
      alert(
        "An unexpected error occurred while adding service history. Please try again.",
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p className="text-lg">Loading service history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold mb-2">
            Error Loading Service History
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

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      {/* Dashboard Navbar */}
      <DashboardNavbar />

      {/* Header Section */}
      <header className="w-full bg-gray-100 py-3 px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-center text-gray-800">
          Service History
        </h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <p className="text-gray-700 text-center mb-4">
              Record your military service history to help build your VA
              disability claim. Click 'Add Service History' to get started.
            </p>
            <div className="flex justify-center">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full md:w-64 transition-colors"
                onClick={() => setIsModalOpen(true)}
              >
                Add Service History
              </button>
            </div>

            <div className="border border-gray-300 rounded-md p-4 mt-4 max-w-2xl mx-auto w-full">
              {serviceHistoryLoading ? (
                <p className="text-gray-500 text-center">
                  Loading service history...
                </p>
              ) : serviceHistoryList.length === 0 ? (
                <p className="text-gray-500 italic text-center">
                  No service history records found. Add your first service
                  history record.
                </p>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-center mb-2">
                    Your Service History
                  </h2>
                  {serviceHistoryList.map((history) => (
                    <div
                      key={history.id}
                      className="border border-gray-200 rounded-md p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-800">
                            {history.branch.charAt(0).toUpperCase() +
                              history.branch.slice(1)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatDate(history.start_date)} -{" "}
                            {formatDate(history.end_date)}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium">Job/MOS:</span>{" "}
                            {history.job}
                          </p>

                          {history.deployments &&
                            history.deployments.length > 0 && (
                              <div className="mt-2">
                                <p className="font-medium">Deployments:</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 ml-2">
                                  {history.deployments.map(
                                    (deployment, index) => (
                                      <li key={index}>{deployment}</li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            onClick={() =>
                              console.log("Edit service history", history.id)
                            }
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800 text-sm"
                            onClick={() =>
                              console.log("Delete service history", history.id)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Service History Modal */}
      <AddServiceHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitServiceHistory}
      />
    </div>
  );
}
