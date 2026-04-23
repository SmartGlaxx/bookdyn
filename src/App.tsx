import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import ResetPassword from "./pages/ResetPassword";
import ManageSubscription from "./pages/ManageSubscription";
import DevDocs from "./pages/DevDocs";
import AdminFeedback from "./pages/AdminFeedback";
import AdminErrors from "./pages/AdminErrors";
import AdminUsers from "./pages/AdminUsers";
import AdminOverrideCallback from "./pages/AdminOverrideCallback";
import NotFound from "./pages/NotFound";
import CheckEmail from "./pages/CheckEmail";
import Waitlist from "./pages/Waitlist";
import Onboarding from "./pages/Onboarding";
import BookDetail from "./pages/BookDetail";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BookOpen } from "lucide-react";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse flex items-center gap-3">
      <BookOpen className="w-8 h-8 text-primary" />
      <span className="text-lg font-medium">Loading...</span>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setOnboardingCompleted((data as any)?.onboarding_completed ?? false);
        setOnboardingChecked(true);
      });
  }, [user]);

  if (loading || (user && !onboardingChecked)) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
};

const OnboardingRoute = () => {
  const { user, loading } = useAuth();
  const [checked, setChecked] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setCompleted((data as any)?.onboarding_completed ?? false);
        setChecked(true);
      });
  }, [user]);

  if (loading || (user && !checked)) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (completed) return <Navigate to="/dashboard" replace />;

  return <Onboarding />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Navigate to="/auth" replace />;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route path="/plans" element={<Navigate to="/dashboard" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={<ProtectedRoute><Index /></ProtectedRoute>}
            />
            <Route
              path="/dashboard/:bookType"
              element={<ProtectedRoute><Index /></ProtectedRoute>}
            />
            <Route
              path="/dashboard/:bookId"
              element={<ProtectedRoute><BookDetail /></ProtectedRoute>}
            />
            <Route
              path="/manage-subscription"
              element={<ProtectedRoute><ManageSubscription /></ProtectedRoute>}
            />
            <Route path="/dev-docs" element={<DevDocs />} />
            <Route
              path="/admin/feedback"
              element={<ProtectedRoute><AdminFeedback /></ProtectedRoute>}
            />
            <Route
              path="/admin/errors"
              element={<ProtectedRoute><AdminErrors /></ProtectedRoute>}
            />
            <Route
              path="/admin/users"
              element={<ProtectedRoute><AdminUsers /></ProtectedRoute>}
            />
            <Route
              path="/admin/override-callback"
              element={<AdminOverrideCallback />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
