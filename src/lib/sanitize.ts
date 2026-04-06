import DOMPurify from "dompurify";

const SAFE_RICH_TEXT_TAGS = ["b", "i", "u", "em", "strong", "br"];
const SAFE_RENDER_TAGS = ["b", "i", "u", "em", "strong", "p", "br", "ul", "ol", "li", "h1", "h2", "h3"];

/**
 * Sanitize user-generated or AI-generated content to prevent XSS.
 * Strips all HTML tags and returns plain text.
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize editor content while preserving safe inline formatting tags.
 */
export function sanitizeRichText(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: SAFE_RICH_TEXT_TAGS,
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize content that may contain safe HTML (bold, italic, underline, paragraphs).
 * Use this only when rendering with dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: SAFE_RENDER_TAGS,
    ALLOWED_ATTR: [],
  });
}
