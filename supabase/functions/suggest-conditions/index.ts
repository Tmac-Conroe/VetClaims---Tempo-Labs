import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; // Use esm.sh for Deno compatibility
import { z } from "npm:zod@3.22.4"; // Import Zod for input validation

// Define request schema using Zod for strong validation
const RequestSchema = z.object({
  service_branch: z.string().min(1, "Service branch is required"),
  job_title: z.string().min(1, "Job title is required"),
});

// Type derived from the Zod schema
type SuggestConditionsRequest = z.infer<typeof RequestSchema>;

// Define CORS headers for responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration (simple in-memory implementation)
const RATE_LIMIT = {
  windowMs: 60000, // 1 minute window
  maxRequests: 10, // Max requests per window per user
};

// In-memory store for rate limiting (will reset on function restart)
const rateLimitStore: Record<string, { count: number; resetTime: number }> = {};

console.log("Function 'suggest-conditions' initializing."); // Log function start

// Main function served by Deno Deploy/Supabase Edge Functions
serve(async (req) => {
  const requestStartTime = Date.now();
  console.log(
    `[${new Date().toISOString()}] Request received: ${req.method} ${req.url}`,
  );

  // --- 1. Handle CORS Preflight Request ---
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- 2. Authentication & Authorization ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing required Supabase environment variables.");
      throw new Error(
        "Server configuration error: Supabase credentials not found",
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") || "" },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser();

    if (userError) {
      console.error("Auth getUser Error:", userError);
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

    console.log(`User authenticated: ${user.id}`);

    // --- 3. Rate Limiting ---
    const now = Date.now();
    const userRateLimit = rateLimitStore[user.id];

    if (userRateLimit && now < userRateLimit.resetTime) {
      if (userRateLimit.count >= RATE_LIMIT.maxRequests) {
        console.warn(`Rate limit exceeded for user ${user.id}`);
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
            retryAfter: Math.ceil((userRateLimit.resetTime - now) / 1000),
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": Math.ceil(
                (userRateLimit.resetTime - now) / 1000,
              ).toString(),
            },
          },
        );
      }
      userRateLimit.count++;
    } else {
      rateLimitStore[user.id] = {
        count: 1,
        resetTime: now + RATE_LIMIT.windowMs,
      };
    }

    // --- 4. MindStudio API Call (Using Direct Fetch) ---
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

    const mindstudioApiUrl = "https://api.mindstudio.ai/developer/v2/apps/run"; // V2 API endpoint

    console.log(
      `Calling MindStudio API directly: ${mindstudioApiUrl} for App ${mindstudioAppId}`,
    );

    // Prepare the request body
    const requestBody = JSON.stringify({
      appId: mindstudioAppId,
      variables: {
        service_branch: service_branch,
        job_title: job_title,
      },
    });

    // Prepare the request headers
    const headers = {
      Authorization: `Bearer ${mindstudioApiKey}`, // Using Bearer as per V2 docs, adjust if needed
      "Content-Type": "application/json",
      // 'X-API-Key': mindstudioApiKey, // Alternative header if Bearer fails
    };

    // Make the fetch call
    const response = await fetch(mindstudioApiUrl, {
      method: "POST",
      headers: headers,
      body: requestBody,
    });

    console.log("MindStudio API Response Status:", response.status);

    // Check if the response is ok (status in the range 200-299)
    if (!response.ok) {
      const errorBody = await response.text(); // Get error body as text
      console.error("MindStudio API Error Response Body:", errorBody);
      // Throw an error that includes the status and body
      throw new Error(
        `MindStudio API request failed with status ${response.status}: ${errorBody}`,
      );
    }

    // Parse the successful JSON response
    const mindstudioResult = await response.json(); // Assuming MindStudio returns JSON on success

    console.log("MindStudio Raw Result (fetch):", mindstudioResult);

    // --- 5. Process MindStudio Result ---
    const ResultSchema = z.object({
      suggested_conditions: z.array(z.string()),
    });

    const resultValidation = ResultSchema.safeParse(mindstudioResult);
    if (!resultValidation.success) {
      console.error(
        "Invalid response structure received from MindStudio:",
        mindstudioResult,
        "\nValidation error:",
        resultValidation.error,
      );
      throw new Error(
        "Received invalid or unexpected data structure from MindStudio.",
      );
    }

    const { suggested_conditions: suggestedConditions } = resultValidation.data;
    console.log("Successfully received suggestions:", suggestedConditions);

    // --- 6. Return Success Response ---
    const requestEndTime = Date.now();
    console.log(`Request completed in ${requestEndTime - requestStartTime}ms`);

    return new Response(
      JSON.stringify({
        suggested_conditions: suggestedConditions,
        metadata: {
          processing_time_ms: requestEndTime - requestStartTime,
          // Note: Billing cost is not available with direct fetch
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    // --- 7. Error Handling ---
    const requestEndTime = Date.now();
    console.error("Error in suggest-conditions function:", error);
    console.log(`Request failed in ${requestEndTime - requestStartTime}ms`);

    let errorMessage = "Internal Server Error";
    let status = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      const statusMatch = errorMessage.match(
        /request failed with status (\d+)/,
      );
      if (statusMatch && statusMatch[1]) {
        status = parseInt(statusMatch[1], 10);
      } else if (errorMessage.includes("configuration error")) {
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
        status = 502;
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: status,
    });
  }
});

console.log("Function 'suggest-conditions' initialized and awaiting requests.");
