import { useEffect, useMemo, useRef, useState } from "react";

interface TypewriterTextProps {
  text: string;
  /** Milliseconds between each word reveal (default 60ms ≈ ~1000 words/min) */
  intervalMs?: number;
  /** Duration of each word's fade-in animation in ms (default 350ms) */
  fadeMs?: number;
  onComplete?: () => void;
}

/**
 * Renders text token-by-token with a per-word fade-in reveal.
 * Already-revealed words stay fully opaque so the page fills naturally
 * (ink-on-paper feel) while new tokens gently materialise.
 *
 * The full text is rendered immediately (so layout is stable), but each
 * word/whitespace token is wrapped in a span whose opacity transitions
 * from 0 to 1 staggered by `intervalMs`.
 */
export function TypewriterText({
  text,
  intervalMs = 60,
  fadeMs = 350,
  onComplete,
}: TypewriterTextProps) {
  // Tokenize preserving whitespace so layout (newlines, spaces) is exact.
  const tokens = useMemo(() => text.split(/(\s+)/).filter((t) => t.length > 0), [text]);

  // How many tokens are currently "revealed" (fully visible).
  // We persist this so adding more text doesn't re-animate already-shown tokens.
  const [revealedCount, setRevealedCount] = useState(0);
  const revealedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    revealedRef.current = revealedCount;
  }, [revealedCount]);

  useEffect(() => {
    // If text shrank (e.g. switched section), reset.
    if (revealedRef.current > tokens.length) {
      revealedRef.current = 0;
      setRevealedCount(0);
    }

    // Already caught up — nothing to animate.
    if (revealedRef.current >= tokens.length) {
      if (!completedRef.current && tokens.length > 0) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    completedRef.current = false;

    // Clear any existing timer before starting a new one.
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      const next = revealedRef.current + 1;
      revealedRef.current = next;
      setRevealedCount(next);

      if (next >= tokens.length) {
        if (timerRef.current !== null) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }
    }, intervalMs);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [tokens, intervalMs, onComplete]);

  return (
    <>
      {tokens.map((tok, i) => {
        const revealed = i < revealedCount;
        // Whitespace tokens just need to occupy space — no need for transitions.
        if (/^\s+$/.test(tok)) {
          return <span key={i}>{tok}</span>;
        }
        return (
          <span
            key={i}
            style={{
              opacity: revealed ? 1 : 0,
              transition: `opacity ${fadeMs}ms ease-out`,
              willChange: revealed ? undefined : "opacity",
            }}
          >
            {tok}
          </span>
        );
      })}
    </>
  );
}
