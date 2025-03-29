// Import necessary modules
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; // Use esm.sh for Deno compatibility
import { MindStudio, MindStudioError } from "npm:mindstudio@0.9.6"; // Import MindStudio via npm specifier
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
  // Browsers send an OPTIONS request first to check CORS permissions
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- 2. Authentication & Authorization ---
    // Get Supabase credentials from environment variables/secrets
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing required Supabase environment variables.");
      throw new Error(
        "Server configuration error: Supabase credentials not found",
      );
    }

    // Create Supabase client *within the request* to handle auth state per request
    const supabaseAdmin = createClient(
      supabaseUrl,
      // Use Anon key here for getUser based on JWT. Service Role needed for bypassing RLS.
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") || "" },
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

    console.log(`User authenticated: ${user.id}`);

    // --- 3. Rate Limiting ---
    // Simple in-memory rate limiting by user ID
    const now = Date.now();
    const userRateLimit = rateLimitStore[user.id];

    if (userRateLimit && now < userRateLimit.resetTime) {
      // User has existing rate limit record and window hasn't expired
      if (userRateLimit.count >= RATE_LIMIT.maxRequests) {
        // User has exceeded rate limit
        console.warn(`Rate limit exceeded for user ${user.id}`);
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
            retryAfter: Math.ceil((userRateLimit.resetTime - now) / 1000),
          }),
          {
            status: 429, // Too Many Requests
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
      // Increment count if within limits
      userRateLimit.count++;
    } else {
      // Create new rate limit record for user
      rateLimitStore[user.id] = {
        count: 1,
        resetTime: now + RATE_LIMIT.windowMs,
      };
    }

    // --- 4. Input Validation ---
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
    const rawBody = await req.json();
    console.log("Raw request body:", rawBody);

    // Validate with Zod schema
    const validationResult = RequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");

      console.error("Validation error:", errorMessage);
      return new Response(
        JSON.stringify({
          error: `Validation failed: ${errorMessage}`,
          details: validationResult.error.format(),
        }),
        {
          status: 400, // Bad Request
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Extract validated data
    const { service_branch, job_title } = validationResult.data;
    console.log("Validated request data:", { service_branch, job_title });

    // --- 5. MindStudio API Call ---
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
    const startTime = Date.now();
    const { result: mindstudioResult, billingCost } = await mindstudio.run({
      appId: mindstudioAppId,
      variables: {
        service_branch: service_branch, // Ensure variable names match MindStudio app
        job_title: job_title, // Ensure variable names match MindStudio app
      },
      // workflow: 'optional_workflow_name' // Specify if not default
    });
    const endTime = Date.now();

    console.log(`MindStudio API call completed in ${endTime - startTime}ms`);
    console.log("MindStudio Billing Cost:", billingCost); // Log cost for monitoring
    console.log("MindStudio Raw Result:", mindstudioResult);

    // --- 6. Process MindStudio Result ---
    // Define expected result schema
    const ResultSchema = z.object({
      suggested_conditions: z.array(z.string()),
    });

    // Validate the result structure
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

    // Extract the validated array of suggested conditions
    const { suggested_conditions: suggestedConditions } = resultValidation.data;
    console.log("Successfully received suggestions:", suggestedConditions);

    // --- 7. Return Success Response ---
    const requestEndTime = Date.now();
    console.log(`Request completed in ${requestEndTime - requestStartTime}ms`);

    return new Response(
      JSON.stringify({
        suggested_conditions: suggestedConditions,
        metadata: {
          processing_time_ms: requestEndTime - requestStartTime,
          mindstudio_time_ms: endTime - startTime,
          billing_cost: billingCost,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    // --- 8. Error Handling ---
    const requestEndTime = Date.now();
    console.error("Error in suggest-conditions function:", error);
    console.log(`Request failed in ${requestEndTime - requestStartTime}ms`);

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
        errorMessage.includes("Missing required fields") ||
        errorMessage.includes("Validation failed")
      ) {
        status = 400;
      } else if (
        errorMessage.includes("invalid or unexpected data structure")
      ) {
        status = 502; // Bad Gateway - error interacting with upstream service
      }
    }

    // Return a standardized error response
    return new Response(
      JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(), // Add a unique ID for error tracking
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: status,
      },
    );
  }
});

console.log("Function 'suggest-conditions' initialized and awaiting requests.");
