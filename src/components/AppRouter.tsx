import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignInPage } from "../pages/SignInPage";
import { HomePage } from "../pages/HomePage";

function PublicSignInRoute({ children }: { children: React.ReactNode }) {
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
    // User is authenticated, redirect to home
    return <Navigate to="/" replace />;
  }

  // User is not authenticated
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={<HomePage />} 
        />
        <Route 
          path="/signin" 
          element={
            <PublicSignInRoute>
              <SignInPage />
            </PublicSignInRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}