/**
 * Session-scoped registry tracking which subsections have already been
 * fully revealed via the typewriter animation. Once a subsection is in
 * the registry, future renders show its content instantly (no re-animation).
 *
 * This lives in module scope, so it survives component remounts within the
 * same page session but resets on full page reload — exactly the desired
 * behaviour for "newly generated" content.
 */
const revealed = new Set<string>();

/** Mark a subsection as fully revealed (call from onComplete). */
export function markRevealed(subsectionId: string) {
  revealed.add(subsectionId);
  notify();
}

/** Check whether a subsection has already been fully revealed this session. */
export function isRevealed(subsectionId: string): boolean {
  return revealed.has(subsectionId);
}

/** Force-clear (used rarely, e.g. when content is rewritten). */
export function clearRevealed(subsectionId: string) {
  revealed.delete(subsectionId);
  notify();
}

// ---------------------------------------------------------------------------
// Subscription mechanism so components can re-render when reveal state
// changes (e.g. a previous subsection finished animating, allowing the next
// one in the queue to start).
// ---------------------------------------------------------------------------
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}

export function subscribeRevealed(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
