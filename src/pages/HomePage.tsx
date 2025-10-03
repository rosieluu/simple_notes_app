import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Hero } from "../components/ui/animated-hero";
import { Navigate } from "react-router-dom";

export function HomePage() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    // Loading state
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (loggedInUser !== null) {
    // User is authenticated - redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // User not authenticated - show Hero only
  return (
    <div className="block">
      <Hero />
    </div>
  );
}