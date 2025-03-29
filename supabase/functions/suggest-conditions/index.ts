// Import necessary modules
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; // Use esm.sh for Deno compatibility
import { MindStudio, MindStudioError } from "npm:mindstudio@0.9.6"; // Import MindStudio via npm specifier

// Define expected input structure from the frontend request body
interface SuggestConditionsRequest {
  service_branch: string;
  job_title: string;
}

// Define CORS headers for responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow requests from any origin (adjust in production if needed)
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type", // Headers allowed in requests
};

console.log("Function 'suggest-conditions' initializing."); // Log function start

// Main function served by Deno Deploy/Supabase Edge Functions
serve(async (req) => {
  // --- 1. Handle CORS Preflight Request ---
  // Browsers send an OPTIONS request first to check CORS permissions
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Processing request:", req.method, req.url);

    // --- 2. Authentication & Authorization ---
    // Get Supabase credentials from environment variables/secrets
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; // Use Service Role Key for admin tasks if needed later

    if (!supabaseUrl) {
      console.error("Missing Supabase URL environment variable.");
      throw new Error("Server configuration error: Supabase URL not found");
    }
    // Note: We might not strictly NEED the service role key just for getUser with JWT,
    // but it's good practice to have it available if needed for other operations.
    // Let's proceed without throwing an error if ONLY service key is missing for now.

    // Create Supabase client *within the request* to handle auth state per request
    const supabaseAdmin = createClient(
      supabaseUrl,
      // Use Anon key here for getUser based on JWT. Service Role needed for bypassing RLS.
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }, // Pass client's Auth header
    );

    // Get the user object from the JWT provided in the Authorization header
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser();

    if (userError) {
      console.error("Auth getUser Error:", userError);
      // Distinguish between invalid token and other errors if possible
      const status = userError.message.includes("invalid JWT") ? 401 : 500;
      return new Response(
        JSON.stringify({
          error: `Authentication failed: ${userError.message}`,
        }),
        {
          status: status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!user) {
      console.error("Auth Error: No user found for provided token.");
      return new Response(
        JSON.stringify({ error: "Unauthorized: No user found" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("User authenticated:", user.id);

    // --- 3. Input Validation ---
    // Ensure the request body is JSON
    if (req.headers.get("content-type") !== "application/json") {
      console.error("Invalid content-type:", req.headers.get("content-type"));
      return new Response(
        JSON.stringify({ error: "Request body must be JSON" }),
        {
          status: 400, // Bad Request
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse the JSON request body
    const body: SuggestConditionsRequest = await req.json();
    const { service_branch, job_title } = body;

    // Check for required fields
    if (!service_branch || !job_title) {
      console.error("Missing fields in request body:", body);
      return new Response(
        JSON.stringify({
          error: "Missing required fields: service_branch and job_title",
        }),
        {
          status: 400, // Bad Request
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    console.log("Request body parsed:", { service_branch, job_title });

    // --- 4. MindStudio API Call ---
    // Get MindStudio credentials from environment variables/secrets
    const mindstudioApiKey = Deno.env.get("MINDSTUDIO_API_KEY");
    const mindstudioAppId = Deno.env.get("MINDSTUDIO_AGENT_ID");

    if (!mindstudioApiKey) {
      console.error("Missing MindStudio API Key secret.");
      throw new Error(
        "Server configuration error: MindStudio API Key not configured",
      );
    }
    if (!mindstudioAppId) {
      console.error("Missing MindStudio Agent ID secret.");
      throw new Error(
        "Server configuration error: MindStudio Agent ID not configured",
      );
    }

    // Initialize the MindStudio client
    const mindstudio = new MindStudio(mindstudioApiKey);

    console.log(
      `Calling MindStudio App ${mindstudioAppId} with branch: ${service_branch}, job: ${job_title}`,
    );

    // Execute the MindStudio workflow
    // Note: Using client.run as we don't have specific worker/workflow names generated yet
    // Adapt this if you run `npx mindstudio sync` later and want type-safe calls
    const { result: mindstudioResult, billingCost } = await mindstudio.run({
      appId: mindstudioAppId,
      variables: {
        service_branch: service_branch, // Ensure variable names match MindStudio app
        job_title: job_title, // Ensure variable names match MindStudio app
      },
      // workflow: 'optional_workflow_name' // Specify if not default
    });

    console.log("MindStudio Billing Cost:", billingCost); // Log cost for monitoring
    console.log("MindStudio Raw Result:", mindstudioResult);

    // --- 5. Process MindStudio Result ---
    // Validate the structure of the result from MindStudio
    // Assuming the output variable in MindStudio is named 'suggested_conditions' and contains the JSON array
    if (
      !mindstudioResult ||
      typeof mindstudioResult !== "object" ||
      !("suggested_conditions" in mindstudioResult) ||
      !Array.isArray((mindstudioResult as any).suggested_conditions)
    ) {
      console.error(
        "Invalid response structure received from MindStudio:",
        mindstudioResult,
      );
      throw new Error(
        "Received invalid or unexpected data structure from MindStudio.",
      );
    }

    // Extract the validated array of suggested conditions
    const suggestedConditions: string[] = (mindstudioResult as any)
      .suggested_conditions;
    console.log("Successfully received suggestions:", suggestedConditions);

    // --- 6. Return Success Response ---
    return new Response(
      JSON.stringify({ suggested_conditions: suggestedConditions }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    // --- 7. Error Handling ---
    console.error("Error in suggest-conditions function:", error);

    let errorMessage = "Internal Server Error";
    let status = 500;

    // Handle specific MindStudio errors
    if (error instanceof MindStudioError) {
      errorMessage = `MindStudio Error: ${error.message}`;
      status = error.status ?? 500; // Use status from MindStudioError if available
    } else if (error instanceof Error) {
      errorMessage = error.message;
      // Refine status codes based on error type if needed
      if (errorMessage.includes("configuration error")) {
        status = 500;
      } else if (
        errorMessage.includes("Authentication failed") ||
        errorMessage.includes("Unauthorized")
      ) {
        status = 401;
      } else if (
        errorMessage.includes("Request body must be JSON") ||
        errorMessage.includes("Missing required fields")
      ) {
        status = 400;
      } else if (
        errorMessage.includes("invalid or unexpected data structure")
      ) {
        status = 502; // Bad Gateway - error interacting with upstream service
      }
    }

    // Return a standardized error response
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: status,
    });
  }
});

console.log("Function 'suggest-conditions' initialized and awaiting requests.");
