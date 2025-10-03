import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { NotesApp } from "../NotesApp";
import { Navigate, Link } from "react-router-dom";
import { SignOutButton } from "../SignOutButton";

export function DashboardPage() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    // Loading state
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (loggedInUser === null) {
    // User not authenticated - redirect to home
    return <Navigate to="/" replace />;
  }

  // User is authenticated - show the notes app dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                Simple Notes
              </Link>
              <span className="text-gray-500">Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {loggedInUser.email || "Anonymous User"}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Notes</h1>
          <p className="text-gray-600">Manage and organize your notes</p>
        </div>
        <NotesApp />
      </main>
    </div>
  );
}