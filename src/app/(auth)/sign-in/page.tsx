"use client";

import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import Navbar from "@/components/navbar";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface LoginProps {
  searchParams: { error?: string; success?: string; message?: string };
}

export default function SignInPage({ searchParams }: LoginProps) {
  const router = useRouter();
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (searchParams.error) {
      setMessage({ error: searchParams.error });
    } else if (searchParams.success) {
      setMessage({ success: searchParams.success });
    } else if (searchParams.message) {
      setMessage({ message: searchParams.message });
    }
  }, [searchParams]);

  const handleSubmit = async (formData: FormData) => {
    const result = await signInAction(formData);
    if (result && "success" in result && result.success && result.redirectTo) {
      router.push(result.redirectTo);
    }
  };

  if (message && "message" in message) {
    return (
      <div className="flex h-screen w-full flex-1 items-center justify-center p-4 sm:max-w-md">
        <FormMessage message={message} />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <form action={handleSubmit} className="flex flex-col space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  className="text-primary font-medium hover:underline transition-all"
                  href="/sign-up"
                >
                  Sign up
                </Link>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-all"
                    href="/forgot-password"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Your password"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <SubmitButton className="w-full" pendingText="Signing in...">
              Sign in
            </SubmitButton>

            {message && <FormMessage message={message} />}
          </form>
        </div>
      </div>
    </>
  );
}
