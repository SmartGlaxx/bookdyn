import { supabase } from "@/integrations/supabase/client";

let lastReport = 0;
const MIN_INTERVAL_MS = 1000;

export async function reportError(
  message: string,
  options: {
    stack?: string;
    route?: string;
    context?: Record<string, unknown>;
  } = {},
) {
  // Throttle to avoid storms
  const now = Date.now();
  if (now - lastReport < MIN_INTERVAL_MS) return;
  lastReport = now;

  try {
    await supabase.functions.invoke("log-error", {
      body: {
        message,
        stack: options.stack,
        route: options.route ?? window.location.pathname,
        url: window.location.href,
        context: options.context ?? {},
      },
    });
  } catch {
    // Swallow — never let logging break the app
  }
}

export function installGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    reportError(event.message || "window.onerror", {
      stack: event.error?.stack,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = typeof reason === "string"
      ? reason
      : reason?.message ?? "Unhandled promise rejection";
    reportError(message, { stack: reason?.stack });
  });
}
