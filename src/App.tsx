import { Toaster } from "sonner";
import { AppRouter } from "./components/AppRouter";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Toaster />
      <AppRouter />
    </div>
  );
}
