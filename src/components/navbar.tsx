"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { UserCircle } from "lucide-react";
import UserProfile from "./user-profile";
import { useEffect, useState } from "react";
import { createClient } from "../../supabase/client";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) {
          setUser(data.user);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching user:", err);
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <nav className="w-full border-b border-gray-200 bg-white py-2">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            VetClaims CoPilot
          </Link>
          <div className="flex gap-4 items-center"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="w-full border-b border-gray-200 bg-white py-2">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          VetClaims CoPilot
        </Link>
        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
              <UserProfile />
            </>
          ) : (
            <>
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
