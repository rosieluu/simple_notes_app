"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Button } from "./components/ui/button";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button
      className="border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
      onClick={() => void signOut()}
    >
      Sign out
    </Button>
  );
}
