"use server";

import { encodedRedirect } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";

export const signUpAction = async (formData: FormData) => {
  try {
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    const fullName = formData.get("full_name")?.toString() || "";
    const supabase = await createClient();
    const origin = headers().get("origin") || "http://localhost:3000";

    if (!email || !password) {
      return {
        success: false,
        redirectTo: "/sign-up",
        error: "Email and password are required",
      };
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          full_name: fullName,
          email: email,
        },
      },
    });

    if (error) {
      console.error(error.code + " " + error.message);
      return {
        success: false,
        redirectTo: "/sign-up",
        error: error.message,
      };
    }

    if (user) {
      try {
        const { error: updateError } = await supabase.from("users").insert({
          id: user.id,
          name: fullName,
          full_name: fullName,
          email: email,
          created_at: new Date().toISOString(),
        });

        if (updateError) {
          console.error("Error updating user profile:", updateError);
          // Don't return an error to the user as this is a secondary operation
          // The user has already been created in auth.users
        }
      } catch (err) {
        console.error("Error in user profile creation:", err);
      }
    }

    return {
      success: true,
      redirectTo: "/sign-up",
      message:
        "Thanks for signing up! Please check your email for a verification link.",
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      success: false,
      redirectTo: "/sign-up",
      error: "An unexpected error occurred. Please try again.",
    };
  }
};

export const signInAction = async (formData: FormData) => {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = await createClient();

    if (!email || !password) {
      return {
        success: false,
        redirectTo: "/sign-in",
        error: "Email and password are required",
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);
      return {
        success: false,
        redirectTo: "/sign-in",
        error: error.message,
      };
    }

    console.log("Sign in successful:", data);
    // Instead of using redirect, return a simple response that the client can use
    return { success: true, redirectTo: "/" };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      success: false,
      redirectTo: "/sign-in",
      error: "An unexpected error occurred. Please try again.",
    };
  }
};

export const forgotPasswordAction = async (formData: FormData) => {
  try {
    const email = formData.get("email")?.toString();
    const supabase = await createClient();
    const origin = headers().get("origin") || "http://localhost:3000";
    const callbackUrl = formData.get("callbackUrl")?.toString();

    if (!email) {
      return {
        success: false,
        redirectTo: "/forgot-password",
        error: "Email is required",
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?redirect_to=/dashboard/reset-password`,
    });

    if (error) {
      console.error(error.message);
      return {
        success: false,
        redirectTo: "/forgot-password",
        error: "Could not reset password",
      };
    }

    if (callbackUrl) {
      return { success: true, redirectTo: callbackUrl };
    }

    return {
      success: true,
      redirectTo: "/forgot-password",
      message: "Check your email for a link to reset your password.",
    };
  } catch (error) {
    console.error("Forgot password error:", error);
    return {
      success: false,
      redirectTo: "/forgot-password",
      error: "An unexpected error occurred. Please try again.",
    };
  }
};

export const resetPasswordAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || !confirmPassword) {
      return {
        success: false,
        redirectTo: "/dashboard/reset-password",
        error: "Password and confirm password are required",
      };
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        redirectTo: "/dashboard/reset-password",
        error: "Passwords do not match",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      return {
        success: false,
        redirectTo: "/dashboard/reset-password",
        error: "Password update failed",
      };
    }

    return {
      success: true,
      redirectTo: "/dashboard/reset-password",
      message: "Password updated",
    };
  } catch (error) {
    console.error("Reset password error:", error);
    return {
      success: false,
      redirectTo: "/dashboard/reset-password",
      error: "An unexpected error occurred. Please try again.",
    };
  }
};

export const signOutAction = async () => {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { success: true, redirectTo: "/sign-in" };
  } catch (error) {
    console.error("Sign out error:", error);
    return { success: true, redirectTo: "/sign-in" };
  }
};
