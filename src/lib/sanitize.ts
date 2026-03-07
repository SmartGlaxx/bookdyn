import DOMPurify from "dompurify";

/**
 * Sanitize user-generated or AI-generated content to prevent XSS.
 * Strips all HTML tags and returns plain text.
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return "";
  // Strip all HTML, returning only text content
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize content that may contain safe HTML (bold, italic, paragraphs).
 * Use this only when rendering with dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li", "h1", "h2", "h3"],
    ALLOWED_ATTR: [],
  });
}
