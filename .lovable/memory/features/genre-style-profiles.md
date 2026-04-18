---
name: Genre Style Profiles & Full-Novel Context
description: Per-genre style profiles for novels, full-novel cache-stable context (≤100k chars), omitted-words ban list, "Hook:" label stripping
type: feature
---
- Removed genres: Fantasy, Urban Fantasy, Dystopian (and global "no magic / no supernatural" rule baked into prompt).
- GENRE_STYLE_PROFILES (edge function) covers: Science Fiction, Romance, Mystery, Thriller, Literary Fiction, Historical Fiction, Adventure, Contemporary, Crime / Detective. Profile auto-injected when book.genre matches.
- Full-novel text is concatenated client-side (`buildFullNovelText`) and trimmed to last 100,000 chars at a sentence boundary (`trimNovelToSentenceBoundary`), then sent as `fullNovelText` to generate-content. This is the cache-stable prefix for DeepSeek.
- `omittedWords` (BookControls, comma/newline list, capped at 1000 chars / 50 entries) → injected as "BANNED VOCABULARY" line in the static system prompt.
- "Hook:" / "Scene:" / "Beat:" / "Opening:" / "Setup:" / "Note:" labels are forbidden in the prompt AND stripped client-side via `stripMetaLabels` before persistence.
- Payload limit raised to 250KB to fit full-novel context; if payload >180KB the client trims fullNovelText to last 40k chars first.
