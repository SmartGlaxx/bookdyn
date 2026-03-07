import { sanitizeText } from "@/lib/sanitize";

/**
 * Safely render AI-generated content as text.
 * Strips any HTML to prevent XSS from AI outputs.
 */
export function safeContent(content: string | undefined | null): string {
  if (!content) return "";
  return sanitizeText(content);
}
