"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Button } from "./components/ui/button";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin");
  };

  return (
    <Button
      className="border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
      onClick={handleSignOut}
    >
      Sign out
    </Button>
  );
}
