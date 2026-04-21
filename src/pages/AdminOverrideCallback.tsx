import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Landing page for admin override links.
 * The override link from admin-users redirects here with a session token
 * in the URL hash (#access_token=...&refresh_token=...). This page waits for
 * supabase-js to consume the hash and establish a session, then forwards
 * the user to /dashboard.
 */
export default function AdminOverrideCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Establishing session…");

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const finish = (path = "/dashboard") => {
      if (cancelled) return;
      // Strip the hash before navigating so tokens don't linger in history.
      window.history.replaceState(null, "", window.location.pathname);
      navigate(path, { replace: true });
    };

    // 1) Listen for SIGNED_IN — fires once supabase-js parses the URL hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) finish();
      },
    );

    // 2) Also poll getSession in case the event already fired before mount.
    (async () => {
      // Give supabase-js a moment to process the URL hash automatically.
      await new Promise((r) => setTimeout(r, 250));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) finish();
    })();

    // 3) Hard timeout — if nothing happens, show an error.
    timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setError(
        "Could not establish a session from this link. It may have expired or already been used. Generate a new override link.",
      );
      setStatus("Sign-in failed");
    }, 6000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        {!error ? (
          <>
            <div className="flex items-center justify-center gap-3 animate-pulse">
              <BookOpen className="w-8 h-8 text-primary" />
              <span className="text-lg font-medium">{status}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Signing you in as the target user. This should only take a moment.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-3 text-destructive">
              <AlertCircle className="w-8 h-8" />
              <span className="text-lg font-medium">{status}</span>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/admin/users")}>
              Back to User Admin
            </Button>
          </>
        )}
      </div>
    </div>
  );
}