"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "../../../../../../supabase/client";
import Link from "next/link";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import toast from "react-hot-toast";

// Type Definitions
interface ConditionDetails {
  id: string;
  condition_name: string;
  claim_type: string | null;
  // Add other fields if needed later
}

interface InterviewResponse {
  sequence_number: number;
  question_text: string;
  answer_text: string | null;
}

type InterviewStatus =
  | "idle"
  | "loading"
  | "in_progress"
  | "submitting"
  | "completed"
  | "error";

export default function ConditionReviewPage() {
  const params = useParams();
  const conditionId = params.conditionId as string;
  const router = useRouter();
  const supabase = createClient();

  // State Variables
  const [user, setUser] = useState<any | null>(null);
  const [conditionDetails, setConditionDetails] =
    useState<ConditionDetails | null>(null);
  const [interviewHistory, setInterviewHistory] = useState<InterviewResponse[]>(
    [],
  );
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [interviewStatus, setInterviewStatus] =
    useState<InterviewStatus>("idle");
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch User Effect
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        toast.error("Authentication error. Redirecting...");
        router.push("/sign-in"); // Or your sign-in page
      } else {
        setUser(data.user);
      }
    };
    getUser();
  }, [supabase, router]);

  // Fetch interview history
  const fetchHistory = useCallback(async () => {
    if (!user || !conditionId || typeof conditionId !== "string") return;

    try {
      console.log("Refreshing interview history...");
      const { data: historyData, error: historyError } = await supabase
        .from("interview_responses")
        .select("sequence_number, question_text, answer_text")
        .eq("condition_id", conditionId)
        .eq("user_id", user.id)
        .order("sequence_number", { ascending: true });

      if (historyError) {
        throw new Error(`Failed to refresh history: ${historyError.message}`);
      }
      setInterviewHistory(historyData || []);
      console.log("History refreshed:", historyData || []);
    } catch (error) {
      console.error("Error refreshing history:", error);
      toast.error("Could not refresh interview history.");
    }
  }, [user, conditionId, supabase]);

  // Initial Data Fetching Effect
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user || !conditionId || typeof conditionId !== "string") {
        // Don't fetch if user or conditionId isn't ready
        // We might already be redirecting from the getUser effect
        if (!user && interviewStatus !== "idle") {
          // Avoid resetting status if user just became null
          setInterviewStatus("idle");
          setPageError("User not authenticated.");
        }
        return;
      }

      setInterviewStatus("loading");
      setPageError(null);
      setCurrentQuestion(null); // Reset question on load
      setInterviewHistory([]); // Reset history on load
      setConditionDetails(null); // Reset details on load

      let fetchedDetails: ConditionDetails | null = null;

      try {
        // 1. Fetch Condition Details
        const { data: detailsData, error: detailsError } = await supabase
          .from("conditions")
          .select("id, condition_name, claim_type")
          .eq("id", conditionId)
          .eq("user_id", user.id)
          .single();

        if (detailsError || !detailsData) {
          throw new Error(
            detailsError?.code === "PGRST116"
              ? "Condition not found or access denied."
              : `Failed to fetch condition details: ${detailsError?.message}`,
          );
        }
        fetchedDetails = detailsData as ConditionDetails;
        setConditionDetails(fetchedDetails);

        // 2. Fetch Interview History
        const { data: historyData, error: historyError } = await supabase
          .from("interview_responses")
          .select("sequence_number, question_text, answer_text")
          .eq("condition_id", conditionId)
          .eq("user_id", user.id)
          .order("sequence_number", { ascending: true });

        if (historyError) {
          throw new Error(
            `Failed to fetch interview history: ${historyError.message}`,
          );
        }
        setInterviewHistory(historyData || []);

        // 3. Call Edge Function for Initial/Current Question
        console.log(
          `Invoking manage-interview for initial load. Condition ID: ${conditionId}`,
        );
        const { data: functionData, error: functionError } =
          await supabase.functions.invoke(
            "manage-interview",
            { body: { conditionId: conditionId, latestAnswer: null } }, // Pass null answer for initial call
          );

        if (functionError) {
          throw new Error(
            `Failed to start interview: ${functionError.message}`,
          );
        }

        if (!functionData || typeof functionData !== "object") {
          throw new Error("Invalid response received from interview function.");
        }

        console.log("Initial function response:", functionData);
        const { next_question, interview_status: functionStatus } =
          functionData as {
            next_question: string | null;
            interview_status: InterviewStatus;
          };

        setCurrentQuestion(next_question);

        if (!next_question && functionStatus === "in_progress") {
          console.log(
            "Function returned null question but status in_progress, setting to completed.",
          );
          setInterviewStatus("completed"); // Treat null question as completion for now
        } else if (functionStatus === "error") {
          throw new Error("Interview function reported an internal error.");
        } else {
          setInterviewStatus(functionStatus ?? "in_progress"); // Default to in_progress if status missing
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "An unknown error occurred during initial load.",
        );
        setInterviewStatus("error");
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load interview data.",
        );
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [conditionId, user, supabase, router]); // Rerun if conditionId or user changes

  // Answer Submission Logic
  const handleSubmitAnswer = useCallback(async () => {
    if (!currentAnswer.trim()) {
      toast.error("Answer cannot be empty.");
      return;
    }

    if (!user || !conditionId || typeof conditionId !== "string") {
      toast.error("Cannot submit answer. Missing user or condition context.");
      return;
    }

    setInterviewStatus("submitting");
    setPageError(null); // Clear previous errors

    try {
      console.log(
        `Invoking manage-interview to submit answer. Condition ID: ${conditionId}`,
      );
      const { data: functionData, error: functionError } =
        await supabase.functions.invoke("manage-interview", {
          body: {
            conditionId: conditionId,
            latestAnswer: currentAnswer.trim(),
          },
        });

      if (functionError) {
        // Handle specific function invocation errors (e.g., network, 5xx from function)
        const errorDetail = functionError.message || "Unknown function error";
        if (functionError instanceof Error && "details" in functionError) {
          console.error(
            "Function invocation detailed error:",
            (functionError as any).details,
          );
        }
        throw new Error(`Failed to submit answer: ${errorDetail}`);
      }

      // Check if functionData itself indicates an internal error (based on our function design)
      if (
        !functionData ||
        typeof functionData !== "object" ||
        "error" in functionData
      ) {
        const errorMsg =
          (functionData as any)?.error ||
          "Invalid response received from interview function.";
        console.error("Function returned error:", errorMsg);
        throw new Error(`Processing failed: ${errorMsg}`);
      }

      console.log("Answer submission response:", functionData);
      const { next_question, interview_status: functionStatus } =
        functionData as {
          next_question: string | null;
          interview_status: InterviewStatus;
        };

      setCurrentQuestion(next_question);
      setCurrentAnswer(""); // Clear textarea

      // Determine the next status
      let nextStatus: InterviewStatus = "in_progress";
      if (!next_question) {
        console.log("No next question received, setting status to completed.");
        nextStatus = "completed";
      } else {
        nextStatus = functionStatus ?? "in_progress"; // Use status from function or default
      }
      setInterviewStatus(nextStatus);

      // Refresh the history display *after* successful submission and state update
      await fetchHistory();

      if (nextStatus === "completed") {
        toast.success("Interview section completed!");
      } else {
        toast.success("Answer submitted successfully");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "An unknown error occurred during submission.";
      setPageError(errorMsg);
      // Revert status to allow retry, unless it's a critical unrecoverable error
      // Let's revert to 'in_progress' so the user can try again or see the current question
      setInterviewStatus("in_progress");
      toast.error(`Submission failed: ${errorMsg}`);
    }
  }, [currentAnswer, conditionId, supabase, user, fetchHistory]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Loading review page...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-red-500">
        <p>Error: {pageError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      <DashboardNavbar />
      <header className="w-full bg-gray-100 py-3 px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-center text-gray-800">
          Condition Review: {conditionDetails?.condition_name || conditionId}
        </h1>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-4">
            <Link
              href="/dashboard/conditions"
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to Conditions List
            </Link>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                Interview for:{" "}
                {conditionDetails?.condition_name ?? "Loading..."}
              </CardTitle>
              <CardDescription>
                Claim Type: {conditionDetails?.claim_type ?? "N/A"}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Interview History */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Interview History</CardTitle>
            </CardHeader>
            <CardContent>
              {interviewHistory.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No history yet. The first question will appear below.
                </p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto p-1 pr-3">
                  {interviewHistory.map((item, index) => (
                    <div
                      key={item.sequence_number}
                      className="pb-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-blue-700 mb-1">
                        Question {index + 1}:
                      </div>
                      <div className="pl-2 mb-2 text-gray-800">
                        {item.question_text}
                      </div>

                      <div className="font-medium text-green-700 mb-1">
                        Answer:
                      </div>
                      {item.answer_text ? (
                        <div className="pl-2 text-gray-800 bg-gray-50 p-2 rounded whitespace-pre-wrap">
                          {item.answer_text}
                        </div>
                      ) : (
                        <div className="pl-2 text-gray-500 italic">
                          (Awaiting your answer below...)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Question & Answer Area */}
          {interviewStatus === "in_progress" && currentQuestion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next Question</CardTitle>
                <CardDescription className="text-base text-gray-800 pt-1">
                  {currentQuestion}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid w-full gap-2">
                  <Label htmlFor="current-answer">Your Answer</Label>
                  <Textarea
                    id="current-answer"
                    placeholder="Provide details here..."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    rows={5}
                    className="mt-1"
                    disabled={interviewStatus === "submitting"}
                  />
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={
                      interviewStatus === "submitting" || !currentAnswer.trim()
                    }
                    className="mt-2 w-full sm:w-auto"
                  >
                    {interviewStatus === "submitting"
                      ? "Submitting..."
                      : "Submit Answer"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Message */}
          {interviewStatus === "completed" && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">
                  Interview Section Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-700">
                  You've answered all questions for this section based on the
                  current logic. Further sections or review options may become
                  available later.
                </p>
                <div className="mt-4">
                  <Link href="/dashboard/conditions" passHref>
                    <Button variant="outline">Back to Conditions List</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading/Submitting Indicator */}
          {interviewStatus === "submitting" && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded-md shadow-lg flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
                <p>Processing your answer...</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
