import { LoginForm } from "../components/login-form";

export function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Home Lens Fast</h1>
          <p className="text-gray-600">Transform your property photos into stunning visuals</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}