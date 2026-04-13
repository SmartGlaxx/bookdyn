import { useState, useEffect, useRef } from "react";

interface TypewriterTextProps {
  text: string;
  /** Words per second reveal speed */
  speed?: number;
  onComplete?: () => void;
  children?: (visibleText: string) => React.ReactNode;
}

/**
 * Reveals text word-by-word at a configurable speed.
 * Tracks the last known length so only NEW text gets animated
 * (i.e. if the component re-renders with more text appended, only the delta animates).
 */
export function TypewriterText({ text, speed = 60, children }: TypewriterTextProps) {
  const words = text.split(/(\s+)/); // keep whitespace tokens
  const [visibleCount, setVisibleCount] = useState(words.length); // start fully visible for already-present text
  const prevLengthRef = useRef(text.length);
  const animatingRef = useRef(false);

  useEffect(() => {
    // If text grew (new content appended), animate the new portion
    if (text.length > prevLengthRef.current && !animatingRef.current) {
      const prevText = text.slice(0, prevLengthRef.current);
      const prevWords = prevText.split(/(\s+)/).length;
      const allWords = text.split(/(\s+)/);
      
      animatingRef.current = true;
      setVisibleCount(prevWords);
      
      const remaining = allWords.length - prevWords;
      if (remaining <= 0) {
        animatingRef.current = false;
        prevLengthRef.current = text.length;
        setVisibleCount(allWords.length);
        return;
      }

      const interval = 1000 / speed;
      let current = prevWords;
      
      const timer = setInterval(() => {
        current += 1;
        setVisibleCount(current);
        if (current >= allWords.length) {
          clearInterval(timer);
          animatingRef.current = false;
          prevLengthRef.current = text.length;
        }
      }, interval);

      return () => {
        clearInterval(timer);
        animatingRef.current = false;
      };
    }
    
    // If this is the first render with content (prevLength was 0), animate from scratch
    if (prevLengthRef.current === 0 && text.length > 0) {
      animatingRef.current = true;
      setVisibleCount(0);
      
      const interval = 1000 / speed;
      let current = 0;
      
      const timer = setInterval(() => {
        current += 1;
        setVisibleCount(current);
        if (current >= words.length) {
          clearInterval(timer);
          animatingRef.current = false;
          prevLengthRef.current = text.length;
        }
      }, interval);

      return () => {
        clearInterval(timer);
        animatingRef.current = false;
      };
    }

    prevLengthRef.current = text.length;
    setVisibleCount(words.length);
  }, [text, speed]);

  const visibleText = words.slice(0, visibleCount).join("");

  if (children) {
    return <>{children(visibleText)}</>;
  }

  return <>{visibleText}</>;
}
