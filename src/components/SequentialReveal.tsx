import { useEffect, useMemo, useRef, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

interface SequentialRevealProps {
  /** Full content (may include \n\n paragraph separators). */
  content: string;
  /** Milliseconds between word reveals (default 60ms). */
  intervalMs?: number;
  /** Per-word fade-in duration in ms. */
  fadeMs?: number;
  /** Called once every word has been revealed. */
  onComplete?: () => void;
}

/**
 * Reveals an entire subsection's text — across all of its paragraphs —
 * as ONE continuous, sequential typewriter flow.
 *
 * Paragraph breaks (\n\n) are preserved as <p> blocks so layout is stable,
 * but the per-word opacity stagger spans the WHOLE block, so words appear
 * one after the other from the first paragraph through the last.
 */
export function SequentialReveal({
  content,
  intervalMs = 60,
  fadeMs = 350,
  onComplete,
}: SequentialRevealProps) {
  // Split into paragraphs, then tokenize each paragraph into word/whitespace tokens.
  // We assign each non-whitespace token a global index so the reveal order is strict
  // top-to-bottom, left-to-right across the whole subsection.
  const { paragraphs, totalWords } = useMemo(() => {
    const paras = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
    let cursor = 0;
    const out = paras.map((p) => {
      const tokens = p.split(/(\s+)/).filter((t) => t.length > 0);
      const indexed = tokens.map((tok) => {
        if (/^\s+$/.test(tok)) return { tok, idx: -1 };
        const idx = cursor++;
        return { tok, idx };
      });
      return indexed;
    });
    return { paragraphs: out, totalWords: cursor };
  }, [content]);

  const [revealedCount, setRevealedCount] = useState(0);
  const revealedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    revealedRef.current = revealedCount;
  }, [revealedCount]);

  useEffect(() => {
    if (revealedRef.current > totalWords) {
      revealedRef.current = 0;
      setRevealedCount(0);
    }
    if (revealedRef.current >= totalWords) {
      if (!completedRef.current && totalWords > 0) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    completedRef.current = false;
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = setInterval(() => {
      const next = revealedRef.current + 1;
      revealedRef.current = next;
      setRevealedCount(next);
      if (next >= totalWords) {
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
  }, [totalWords, intervalMs, onComplete]);

  const containsHtml = /<[a-z][^>]*>/i.test(content);

  // If the content contains HTML markup (e.g. <b>, <i>), we can't safely
  // tokenize without breaking tags — fall back to instant render of the
  // sanitized HTML and immediately mark complete.
  useEffect(() => {
    if (containsHtml && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [containsHtml, onComplete]);

  if (containsHtml) {
    return (
      <div className="space-y-3">
        {content.split(/\n\n+/).filter((p) => p.trim()).map((p, i) => (
          <p
            key={i}
            className="whitespace-pre-wrap leading-relaxed text-foreground/90 break-words"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(p) }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {paragraphs.map((para, pIdx) => (
        <p
          key={pIdx}
          className="whitespace-pre-wrap leading-relaxed text-foreground/90 break-words"
        >
          {para.map(({ tok, idx }, i) => {
            if (idx === -1) return <span key={i}>{tok}</span>;
            const revealed = idx < revealedCount;
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
        </p>
      ))}
    </div>
  );
}
