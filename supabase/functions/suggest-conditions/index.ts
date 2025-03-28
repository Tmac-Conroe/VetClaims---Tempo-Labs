import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; // Use esm.sh for Deno compatibility
import { MindStudio, MindStudioError } from "npm:mindstudio@0.9.6"; // Import MindStudio via npm specifier

// Define expected input structure
interface SuggestConditionsRequest {
  service_branch: string;
  job_title: string;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow requests from any origin (adjust in production)
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // --- Handle CORS Preflight ---
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Authentication & Authorization ---
    // Create Supabase admin client to verify JWT
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") || process.env.SUPABASE_URL || "";
    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      process.env.SUPABASE_SERVICE_KEY ||
      "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase credentials:", {
        urlExists: !!supabaseUrl,
        keyExists: !!supabaseServiceRoleKey,
      });
      throw new Error("Supabase credentials not found");
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey, // Use Service Role Key for verification
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      console.error("Auth Error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("User authenticated:", user.id);

    // --- Input Validation ---
    if (req.headers.get("content-type") !== "application/json") {
      throw new Error("Request body must be JSON");
    }
    const body: SuggestConditionsRequest = await req.json();
    const { service_branch, job_title } = body;

    if (!service_branch || !job_title) {
      throw new Error("Missing required fields: service_branch and job_title");
    }

    // --- MindStudio API Call ---
    const mindstudioApiKey = Deno.env.get("MINDSTUDIO_API_KEY");
    if (!mindstudioApiKey) {
      throw new Error(
        "MindStudio API Key is not configured in function secrets.",
      );
    }

    const mindstudioAppId =
      Deno.env.get("MINDSTUDIO_AGENT_ID") ||
      process.env.MINDSTUDIO_AGENT_ID ||
      "YOUR_MINDSTUDIO_AGENT_ID"; // Get from env or replace with your actual MindStudio Agent ID

    if (mindstudioAppId === "YOUR_MINDSTUDIO_AGENT_ID") {
      console.warn(
        "Using placeholder MindStudio Agent ID. Please set the MINDSTUDIO_AGENT_ID environment variable.",
      );
    }

    const mindstudio = new MindStudio(mindstudioApiKey);

    console.log(
      `Calling MindStudio App ${mindstudioAppId} with branch: ${service_branch}, job: ${job_title}`,
    );

    // Use client.run since we didn't set an API Function Name
    const { result: mindstudioResult, billingCost } = await mindstudio.run({
      appId: mindstudioAppId,
      variables: {
        service_branch: service_branch,
        job_title: job_title,
      },
      // No workflow specified, assuming 'Main.flow' is the default entry point
    });

    console.log("MindStudio Billing Cost:", billingCost);
    console.log("MindStudio Raw Result:", mindstudioResult);

    // --- Process Result ---
    // The 'result' object from MindStudio should contain the output defined in the 'End' block
    if (
      !mindstudioResult ||
      typeof mindstudioResult !== "object" ||
      !("suggested_conditions" in mindstudioResult)
    ) {
      throw new Error("Invalid response structure received from MindStudio.");
    }

    // The result from MindStudio is already parsed JSON array based on logs
    const suggestedConditions: string[] = (mindstudioResult as any)
      .suggested_conditions;

    if (!Array.isArray(suggestedConditions)) {
      console.error(
        "MindStudio result.suggested_conditions is not an array:",
        suggestedConditions,
      );
      throw new Error("Received non-array suggestions from MindStudio.");
    }

    // --- Return Success Response ---
    return new Response(
      JSON.stringify({ suggested_conditions: suggestedConditions }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    // --- Error Handling ---
    console.error("Error in suggest-conditions function:", error);

    let errorMessage = "Internal Server Error";
    let status = 500;

    if (error instanceof MindStudioError) {
      errorMessage = `MindStudio Error: ${error.message}`;
      status = error.status ?? 500; // Use status from MindStudioError if available
    } else if (error instanceof Error) {
      errorMessage = error.message;
      // Determine specific statuses based on error message
      if (
        errorMessage.includes("Authorization") ||
        errorMessage.includes("Unauthorized")
      ) {
        status = 401;
      } else if (
        errorMessage.includes("Missing required fields") ||
        errorMessage.includes("must be JSON")
      ) {
        status = 400; // Bad Request
      } else if (errorMessage.includes("MindStudio API Key")) {
        status = 500; // Configuration error
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: status,
    });
  }
});
