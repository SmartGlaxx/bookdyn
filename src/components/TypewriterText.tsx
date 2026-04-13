import { useState, useEffect, useRef, useCallback } from "react";

interface TypewriterTextProps {
  text: string;
  /** Milliseconds between each word (default 60ms ≈ ~1000 words/min) */
  intervalMs?: number;
  onComplete?: () => void;
  children?: (visibleText: string) => React.ReactNode;
}

/**
 * Streams text word-by-word using setInterval.
 * Splits text into words, appends one word + space per tick.
 * Clears interval when all words are rendered.
 * Tracks previous text length so only NEW appended content animates.
 */
export function TypewriterText({ text, intervalMs = 60, children }: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState("");
  const prevTextRef = useRef("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const baseTextRef = useRef("");

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (text === prevTextRef.current) return;

    const prevLen = prevTextRef.current.length;
    prevTextRef.current = text;

    // Text grew — animate the delta
    if (text.length > prevLen) {
      const alreadyShown = text.slice(0, prevLen);
      const newPart = text.slice(prevLen);
      const newWords = newPart.split(/\s+/).filter(Boolean);

      if (newWords.length === 0) {
        setDisplayText(text);
        return;
      }

      clearTimer();
      baseTextRef.current = alreadyShown;
      wordsRef.current = newWords;
      currentIndexRef.current = 0;
      setDisplayText(alreadyShown);

      intervalRef.current = setInterval(() => {
        currentIndexRef.current += 1;
        const slice = wordsRef.current.slice(0, currentIndexRef.current);
        setDisplayText(baseTextRef.current + slice.join(" ") + " ");

        if (currentIndexRef.current >= wordsRef.current.length) {
          clearTimer();
          setDisplayText(text); // ensure exact final text
        }
      }, intervalMs);
    } else if (prevLen === 0 && text.length > 0) {
      // First render — animate from scratch
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        setDisplayText(text);
        return;
      }

      clearTimer();
      baseTextRef.current = "";
      wordsRef.current = words;
      currentIndexRef.current = 0;
      setDisplayText("");

      intervalRef.current = setInterval(() => {
        currentIndexRef.current += 1;
        const slice = wordsRef.current.slice(0, currentIndexRef.current);
        setDisplayText(slice.join(" ") + " ");

        if (currentIndexRef.current >= wordsRef.current.length) {
          clearTimer();
          setDisplayText(text);
        }
      }, intervalMs);
    } else {
      // Text shrunk or replaced — show immediately
      clearTimer();
      setDisplayText(text);
    }

    return clearTimer;
  }, [text, intervalMs, clearTimer]);

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  if (children) {
    return <>{children(displayText)}</>;
  }

  return <>{displayText}</>;
}
