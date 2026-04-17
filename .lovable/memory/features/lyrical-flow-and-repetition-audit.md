---
name: Lyrical Flow & Post-Chapter Repetition Audit
description: Narrative books enforce lyrical prose, zero repeated expressions, and run a silent post-chapter rewrite cycle via DeepSeek
type: feature
---
- generate-content system prompt (narrative books only) enforces: lyrical flow, varied sentence lengths, sensory detail, varied dialogue tags, and ZERO repeated expressions (no 4+-word phrase reuse, no reused metaphors/similes, no reused adverb+verb pairs, no rare-adjective reuse).
- After every narrative chapter completes (>800 chars), the client calls edge function `audit-rewrite-chapter`.
- `audit-rewrite-chapter` uses DeepSeek reasoner (Lovable AI gemini-2.5-pro fallback) with `response_format: json_object`. It compares the chapter against itself + last 2 chapters, then silently rewrites to eliminate repeats while preserving plot/tone/length.
- Returns `{ rewrittenChapter, needsManualReview, repeats[] }`. If the rewrite fails or the model returns nothing usable, the original chapter is kept (graceful degradation).
- Client splits the cleaned chapter back across the original subsections proportionally to original lengths (paragraph-boundary aware) so existing subsection structure stays intact.
- Toast warns the user only when `needsManualReview` is true AND there are 3+ irreplaceable repeats; otherwise the user only sees the clean version.
- Wired into BOTH `startGeneration` (full-book) and `generateChapter` (single chapter) paths in `src/hooks/useBookGeneration.ts`.
- Narrative book types: novel, fiction-serial, short-story, children, comic, biography, memoir, drama.
