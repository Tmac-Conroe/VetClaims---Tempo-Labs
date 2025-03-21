"use client";

import { resetPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import Navbar from "@/components/navbar";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResetPassword({
  searchParams,
}: {
  searchParams: { error?: string; success?: string; message?: string };
}) {
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
    const result = await resetPasswordAction(formData);
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
              <h1 className="text-3xl font-semibold tracking-tight">
                Reset password
              </h1>
              <p className="text-sm text-muted-foreground">
                Please enter your new password below.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  New password
                </Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="New password"
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                >
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <SubmitButton
              pendingText="Resetting password..."
              className="w-full"
            >
              Reset password
            </SubmitButton>

            {message && <FormMessage message={message} />}
          </form>
        </div>
      </div>
    </>
  );
}
