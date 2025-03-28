"use client";

import Link from "next/link";
import { signOutAction } from "@/app/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { UserCircle, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardNavbar() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const result = await signOutAction();
      if (result && "success" in result) {
        router.refresh();
        router.push("/");
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className="w-full border-b border-gray-200 bg-gray-100 py-3 shadow-sm">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" prefetch className="text-xl font-bold text-gray-800">
            VetClaims CoPilot
          </Link>
          <span className="hidden md:inline text-lg font-medium text-gray-600">
            Dashboard
          </span>
        </div>
        <div className="flex gap-3 items-center">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/documents"
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
          >
            Documents
          </Link>
          <Button
            onClick={handleSignOut}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-1.5 px-3 rounded-md text-sm transition-colors"
          >
            Logout
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-700 hover:bg-gray-200"
              >
                <UserCircle className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
