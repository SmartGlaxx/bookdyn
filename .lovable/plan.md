

## Plan: Sanitize User-Authored Content in Edit & Manual Write

### What's missing today
Both the **ParagraphEditor** (inline edit/save) and the **Manual Write** textarea in ChapterView pass user text directly into the book content string without any sanitization. While the *display* side calls `sanitizeText()`, the *storage* side does not — meaning raw HTML/script tags could be persisted in the database and potentially rendered elsewhere (exports, future views, etc.).

### Changes

#### 1. Sanitize on save in ParagraphEditor (`src/components/ParagraphEditor.tsx`)
- In `handleSave`, run `sanitizeText(editText.trim())` before calling `onContentUpdate`.

#### 2. Sanitize on save in ChapterView manual write (`src/components/ChapterView.tsx`)
- In both save paths (button click and ⌘+Enter), run `sanitizeText(manualText.trim())` before appending to `sub.content`.

#### 3. Add max-length guard
- Cap manual input and edit input at **5,000 characters** to prevent excessively large single-paragraph payloads.
- Show a character count or warning near the textarea when approaching the limit.

#### 4. Trim & normalize whitespace
- Collapse multiple consecutive newlines into a single `\n\n` before persisting, preventing content bloat or layout abuse.

### Files modified
- `src/components/ParagraphEditor.tsx` — sanitize + length cap on edit save
- `src/components/ChapterView.tsx` — sanitize + length cap on manual write save

### Not in scope
- Server-side validation of book content (already protected by RLS + service-role triggers)
- Sanitization of AI-generated content (already handled by `safeContent()` at render time)

