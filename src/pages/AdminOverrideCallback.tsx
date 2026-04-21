import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminOverrideCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Establishing session…");

  useEffect(() => {
    let cancelled = false;

    const fail = (msg: string) => {
      if (cancelled) return;
      setStatus("Sign-in failed");
      setError(msg);
    };

    const finish = () => {
      if (cancelled) return;
      window.history.replaceState(null, "", window.location.pathname);
      navigate("/dashboard", { replace: true });
    };

    (async () => {
      // Parse tokens from the URL hash (#access_token=...&refresh_token=...&type=magiclink).
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const errorDescription = params.get("error_description");

      if (errorDescription) {
        return fail(decodeURIComponent(errorDescription));
      }
      if (!access_token || !refresh_token) {
        return fail(
          "No session tokens found in the URL. The link may have already been used, or the redirect URL is not allow-listed in Auth settings.",
        );
      }

      setStatus("Setting session…");
      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (setErr) return fail(setErr.message);

      finish();
    })();

    return () => {
      cancelled = true;
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