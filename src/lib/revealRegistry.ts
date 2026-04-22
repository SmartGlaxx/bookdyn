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
}

/** Check whether a subsection has already been fully revealed this session. */
export function isRevealed(subsectionId: string): boolean {
  return revealed.has(subsectionId);
}

/** Force-clear (used rarely, e.g. when content is rewritten). */
export function clearRevealed(subsectionId: string) {
  revealed.delete(subsectionId);
}
