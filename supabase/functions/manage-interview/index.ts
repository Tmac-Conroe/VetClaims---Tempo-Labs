// supabase/functions/manage-interview/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MindStudio, MindStudioError } from "npm:mindstudio@latest"; // Use latest or specific version
import { z } from "npm:zod@latest"; // Input validation

// Define response helper
const createResponse = (
  body: unknown,
  status: number,
  headers: HeadersInit = {},
) => {
  // Ensure CORS headers are always included
  const finalHeaders = new Headers({
    "Access-Control-Allow-Origin": "*", // Or specific origin in production
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
    ...headers,
  });
  return new Response(JSON.stringify(body), { status, headers: finalHeaders });
};

// Define input validation schema
const requestBodySchema = z.object({
  conditionId: z.string().uuid("Invalid Condition ID format"),
  latestAnswer: z.string().nullable().optional(), // Can be string, null, or omitted
});

// Define expected structure for Q&A history
interface QAPair {
  sequence_number: number;
  question_text: string;
  answer_text: string | null;
}

// Define structure for MindStudio response (based on our last successful test)
interface MindStudioResponse {
  next_question: string;
  // Add interview_status later if MindStudio provides it
}

// --- Main Function Handler ---
serve(async (req) => {
  // --- Handle CORS Preflight ---
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // --- Authentication ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or Anon Key not provided in environment.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createResponse({ error: "Missing Authorization header" }, 401);
    }

    // Create Supabase client with user's auth context
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user data
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth Error:", userError);
      return createResponse({ error: "Unauthorized: Invalid token" }, 401);
    }
    console.log("User authenticated:", user.id);

    // --- Input Validation ---
    if (!req.body) {
      return createResponse({ error: "Request body required" }, 400);
    }
    // Check content type before parsing
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return createResponse({ error: "Request body must be JSON" }, 400);
    }

    let rawBody;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      console.error("JSON Parsing Error:", parseError);
      return createResponse(
        { error: "Invalid JSON format in request body" },
        400,
      );
    }

    const validationResult = requestBodySchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error("Validation Error:", validationResult.error.flatten());
      return createResponse(
        {
          error: "Invalid request body",
          issues: validationResult.error.flatten(),
        },
        400,
      );
    }
    const { conditionId, latestAnswer } = validationResult.data;

    // --- Fetch Data ---
    // 1. Condition Details
    const { data: conditionData, error: conditionError } = await supabase
      .from("conditions")
      .select("condition_name, claim_type")
      .eq("id", conditionId)
      .eq("user_id", user.id) // Ensure user owns the condition
      .single(); // Expect only one

    if (conditionError || !conditionData) {
      console.error("Condition Fetch Error:", conditionError);
      const status = conditionError?.code === "PGRST116" ? 404 : 500; // PGRST116 = no rows found
      const message =
        status === 404
          ? "Condition not found or access denied"
          : "Failed to fetch condition details";
      return createResponse({ error: message }, status);
    }
    const { condition_name, claim_type } = conditionData;

    // 2. Latest Service History
    const { data: serviceHistoryData, error: historyError } = await supabase
      .from("service_history")
      .select("branch, job")
      .eq("user_id", user.id)
      .order("end_date", { ascending: false })
      .limit(1);

    if (historyError) {
      // Log error but don't fail the whole request, provide default context
      console.error("Service History Fetch Error:", historyError);
    }
    // Provide default values if no history found or error occurred
    const serviceHistoryContext = serviceHistoryData?.[0] ?? {
      branch: "N/A",
      job: "N/A",
    };

    // 3. Interview History
    const { data: interviewHistoryData, error: interviewError } = await supabase
      .from("interview_responses")
      .select("sequence_number, question_text, answer_text")
      .eq("user_id", user.id)
      .eq("condition_id", conditionId)
      .order("sequence_number", { ascending: true });

    if (interviewError) {
      console.error("Interview History Fetch Error:", interviewError);
      return createResponse(
        { error: "Failed to fetch interview history" },
        500,
      );
    }
    const interviewHistory: QAPair[] = interviewHistoryData || [];

    // --- Update Last Answer (if applicable) ---
    let lastQuestionSequence = -1;
    if (
      latestAnswer !== undefined &&
      latestAnswer !== null &&
      interviewHistory.length > 0
    ) {
      const lastQuestionIndex = interviewHistory.findIndex(
        (item, index) =>
          index === interviewHistory.length - 1 && item.answer_text === null,
      );

      if (lastQuestionIndex !== -1) {
        lastQuestionSequence =
          interviewHistory[lastQuestionIndex].sequence_number;
        const { error: updateError } = await supabase
          .from("interview_responses")
          .update({
            answer_text: latestAnswer,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("condition_id", conditionId)
          .eq("sequence_number", lastQuestionSequence);

        if (updateError) {
          console.error("Failed to update answer:", updateError);
          return createResponse({ error: "Failed to save your answer" }, 500);
        }
        // Update the local history copy as well
        interviewHistory[lastQuestionIndex].answer_text = latestAnswer;
        console.log(`Updated answer for sequence ${lastQuestionSequence}`);
      } else {
        console.warn(
          "Received an answer but no unanswered question found in history.",
        );
        // Decide how to handle this - ignore, error? Let's ignore for now.
      }
    }

    // --- Determine Next State (Simplified Placeholder Logic) ---
    // This logic needs refinement based on the Outline
    let target_section = "";
    if (interviewHistory.length === 0) {
      // Determine initial target section based on claim type
      target_section =
        claim_type === "Secondary"
          ? "II.B.ii - Secondary Connection"
          : claim_type === "Aggravation"
            ? "II.B.iii - Aggravation Details"
            : "II.B.i - In-Service Event, Injury, or Exposure"; // Default to Primary
    } else {
      // Placeholder: Move to symptoms after roughly 2 questions in the service connection section
      const serviceConnectionQuestions = interviewHistory.filter(
        (item) =>
          item.question_text.toLowerCase().includes("service") || // Simple heuristic
          item.question_text.toLowerCase().includes("exposure") ||
          item.question_text.toLowerCase().includes("injury") ||
          item.question_text.toLowerCase().includes("event"),
      ).length;

      if (serviceConnectionQuestions < 2) {
        // Ask ~2 questions about service connection
        target_section =
          claim_type === "Secondary"
            ? "II.B.ii - Secondary Connection"
            : claim_type === "Aggravation"
              ? "II.B.iii - Aggravation Details"
              : "II.B.i - In-Service Event, Injury, or Exposure"; // Stay in relevant SC section
      } else {
        target_section = "II.C - Current Symptoms and Functional Impact"; // Move to symptoms
      }
    }
    // --- TODO: Implement robust logic to determine target_section based on history analysis & Outline ---
    // --- TODO: Implement logic to detect interview completion ---
    let interview_status: "in_progress" | "completed" | "error" = "in_progress";

    // --- Prepare MindStudio Inputs ---
    const mindstudioApiKey = Deno.env.get("MINDSTUDIO_API_KEY");
    // !! IMPORTANT: Use a distinct ENV var name for the Interview App ID !!
    const mindstudioInterviewAppId = Deno.env.get(
      "MINDSTUDIO_INTERVIEW_APP_ID",
    );

    if (!mindstudioApiKey || !mindstudioInterviewAppId) {
      console.error("Missing MindStudio Credentials", {
        key: !!mindstudioApiKey,
        app: !!mindstudioInterviewAppId,
      });
      throw new Error(
        "MindStudio API Key or Interview App ID not configured in environment variables.",
      );
    }

    // Format Q&A history for MindStudio prompt
    const previous_qa_pairs_string = JSON.stringify(
      interviewHistory.map((item) => ({
        question: item.question_text,
        answer: item.answer_text ?? "", // Send empty string for null answers
      })),
    );
    const service_history_context_string = JSON.stringify(
      serviceHistoryContext,
    );

    // --- Call MindStudio ---
    console.log(
      `Calling MindStudio App ${mindstudioInterviewAppId} with target section: ${target_section}`,
    );
    const mindstudio = new MindStudio(mindstudioApiKey);
    let mindstudioResult: MindStudioResponse;

    try {
      const { result, billingCost, success, error } = await mindstudio.run({
        appId: mindstudioInterviewAppId, // Use the specific variable for the interview app
        variables: {
          condition_name: condition_name,
          claim_type: claim_type ?? "Primary", // Default if somehow null
          service_history_context: service_history_context_string,
          previous_qa_pairs: previous_qa_pairs_string,
          target_section: target_section,
        },
      });

      console.log("MindStudio Billing Cost:", billingCost);
      console.log("MindStudio Raw Result:", result);

      // Check if result exists and is an object before accessing 'next_question'
      if (
        !success ||
        !result ||
        typeof result !== "object" ||
        !("next_question" in result) ||
        typeof result.next_question !== "string"
      ) {
        const errorMsg =
          error?.message ||
          (typeof result !== "object"
            ? "MindStudio returned non-object result"
            : "MindStudio result missing 'next_question' string");
        console.error(
          "MindStudio call failed or returned invalid structure:",
          errorMsg,
          result,
        );
        throw new MindStudioError(errorMsg, 502);
      }
      // Type assertion based on expected output after validation
      mindstudioResult = result as MindStudioResponse;
    } catch (err) {
      console.error("MindStudio Error:", err);
      const status = err instanceof MindStudioError ? (err.status ?? 502) : 502;
      const message =
        err instanceof Error
          ? err.message
          : "Failed to get next question from AI";
      return createResponse(
        { error: `AI interaction failed: ${message}` },
        status,
      );
    }

    const next_question = mindstudioResult.next_question;
    // TODO: Use interview_status from MindStudio if it provides it

    // --- Store Next Question ---
    if (next_question && interview_status === "in_progress") {
      const nextSequenceNumber =
        interviewHistory.length > 0
          ? Math.max(...interviewHistory.map((item) => item.sequence_number)) +
            1
          : 0; // Start sequence at 0 if history is empty
      const { error: insertError } = await supabase
        .from("interview_responses")
        .insert({
          user_id: user.id,
          condition_id: conditionId,
          sequence_number: nextSequenceNumber,
          question_text: next_question,
          answer_text: null, // New question starts unanswered
          // created_at, updated_at use defaults
        });

      if (insertError) {
        console.error("Failed to insert next question:", insertError);
        // Don't fail the whole request, but log the error. The user still got the question.
        // Maybe return a specific warning? For now, just log.
        console.warn(
          "Database insert for the next question failed, but proceeding to return question to user.",
        );
      } else {
        console.log(`Stored next question with sequence ${nextSequenceNumber}`);
      }
    } else if (!next_question && interview_status === "in_progress") {
      // If AI didn't return a question but thinks it's in progress, maybe it's done?
      console.log(
        "AI did not return a next question. Assuming interview section completed.",
      );
      // Potentially update status or handle completion - for now, return empty question
      interview_status = "completed"; // Placeholder for completion logic
    }

    // --- Return Response ---
    return createResponse(
      { next_question: next_question ?? null, interview_status },
      200,
    );
  } catch (error) {
    // --- Global Error Handling ---
    console.error("Unhandled Error in manage-interview:", error);
    return createResponse(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      500,
    );
  }
});
