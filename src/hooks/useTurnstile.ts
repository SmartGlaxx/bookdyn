import { useEffect, useRef, useCallback, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface UseTurnstileOptions {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export function useTurnstile({ siteKey, onVerify, onError, onExpire }: UseTurnstileOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      "error-callback": onError,
      "expired-callback": onExpire,
      theme: "auto",
      size: "flexible",
    });
  }, [siteKey, onVerify, onError, onExpire]);

  useEffect(() => {
    // Load Turnstile script if not already loaded
    if (window.turnstile) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (existingScript) return;

    window.onTurnstileLoad = () => {
      setIsLoaded(true);
    };

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      delete window.onTurnstileLoad;
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      renderWidget();
    }
  }, [isLoaded, renderWidget]);

  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  return { containerRef, reset, isLoaded };
}
